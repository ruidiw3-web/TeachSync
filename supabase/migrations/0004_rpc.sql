-- ============================================================
-- 0004 · 业务原子操作（RPC）
-- 目的：把「核销 + 扣课时」「复核结算」「调课」放进单个事务，
--       避免前端多步更新造成课时扣一半、账不平。
-- 权限：security definer，函数内自行校验 current_teacher_id / org / role
-- ============================================================

-- ------------------------------------------------------------
-- 1. 核销单笔：PENDING → VERIFIED，并从课时包扣减
-- ------------------------------------------------------------
create or replace function public.fn_verify_consumption(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor  uuid := public.current_teacher_id();
  v_org    uuid := public.current_org_id();
  v_c      record;
  v_have   numeric := 0;
  v_left   numeric;
  v_take   numeric;
  v_pkg    record;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'code', 'NO_AUTH', 'message', '登录已失效，请重新登录');
  end if;

  select * into v_c from public.consumptions where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', '核销记录不存在');
  end if;
  if v_c.org_id <> v_org then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', '无权操作其他机构的数据');
  end if;
  if v_c.status <> 'PENDING' then
    return jsonb_build_object('ok', false, 'code', 'BAD_STATE', 'message', '该记录已被处理，请刷新页面');
  end if;

  select coalesce(sum(total_hours - used_hours), 0) into v_have
  from public.hour_packages
  where student_id = v_c.student_id and status = 'ACTIVE';

  if v_have < v_c.hours then
    return jsonb_build_object(
      'ok', false, 'code', 'NO_HOURS',
      'message', format('课时不足：本次需 %s，账户可用 %s', v_c.hours, v_have)
    );
  end if;

  v_left := v_c.hours;
  for v_pkg in
    select id, total_hours, used_hours
    from public.hour_packages
    where student_id = v_c.student_id and status = 'ACTIVE'
    order by expire_at nulls last, created_at
    for update
  loop
    exit when v_left <= 0;
    v_take := least(v_left, v_pkg.total_hours - v_pkg.used_hours);
    if v_take > 0 then
      update public.hour_packages
         set used_hours = used_hours + v_take,
             status = case when used_hours + v_take >= total_hours then 'EXHAUSTED' else 'ACTIVE' end
       where id = v_pkg.id;
      v_left := v_left - v_take;
    end if;
  end loop;

  update public.consumptions
     set status = 'VERIFIED',
         reviewed_by = v_actor
   where id = p_id;

  return jsonb_build_object('ok', true, 'code', 'OK', 'message', '已核销', 'hours', v_c.hours);
end;
$$;

-- ------------------------------------------------------------
-- 2. 复核结算：REVIEW_NEEDED / IN_REVIEW → RESOLVED
--    教务可修正最终计入课时（p_hours 为空则以学习机上报为准）
-- ------------------------------------------------------------
create or replace function public.fn_resolve_consumption(
  p_id            uuid,
  p_note          text    default null,
  p_hours         numeric default null,
  p_machine_hours numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor   uuid := public.current_teacher_id();
  v_org     uuid := public.current_org_id();
  v_c       record;
  v_final   numeric;
  v_have    numeric := 0;
  v_left    numeric;
  v_take    numeric;
  v_pkg     record;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'code', 'NO_AUTH', 'message', '登录已失效，请重新登录');
  end if;
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', '只有教务或负责人可以复核对账异常');
  end if;

  select * into v_c from public.consumptions where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', '核销记录不存在');
  end if;
  if v_c.org_id <> v_org then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', '无权操作其他机构的数据');
  end if;
  if v_c.status not in ('REVIEW_NEEDED', 'IN_REVIEW') then
    return jsonb_build_object('ok', false, 'code', 'BAD_STATE', 'message', '该记录不在待复核状态，请刷新页面');
  end if;

  v_final := coalesce(p_hours, p_machine_hours, v_c.machine_hours, v_c.hours);
  if v_final is null or v_final <= 0 then
    return jsonb_build_object('ok', false, 'code', 'BAD_INPUT', 'message', '结算课时必须大于 0');
  end if;

  select coalesce(sum(total_hours - used_hours), 0) into v_have
  from public.hour_packages
  where student_id = v_c.student_id and status = 'ACTIVE';

  if v_have < v_final then
    return jsonb_build_object(
      'ok', false, 'code', 'NO_HOURS',
      'message', format('课时不足：本次需 %s，账户可用 %s', v_final, v_have)
    );
  end if;

  v_left := v_final;
  for v_pkg in
    select id, total_hours, used_hours
    from public.hour_packages
    where student_id = v_c.student_id and status = 'ACTIVE'
    order by expire_at nulls last, created_at
    for update
  loop
    exit when v_left <= 0;
    v_take := least(v_left, v_pkg.total_hours - v_pkg.used_hours);
    if v_take > 0 then
      update public.hour_packages
         set used_hours = used_hours + v_take,
             status = case when used_hours + v_take >= total_hours then 'EXHAUSTED' else 'ACTIVE' end
       where id = v_pkg.id;
      v_left := v_left - v_take;
    end if;
  end loop;

  update public.consumptions
     set status        = 'RESOLVED',
         hours         = v_final,
         machine_hours = coalesce(p_machine_hours, machine_hours),
         review_note   = p_note,
         resolved_by   = v_actor,
         resolved_at   = now()
   where id = p_id;

  return jsonb_build_object('ok', true, 'code', 'OK', 'message', '复核完成，已按 ' || v_final || ' 课时结算', 'hours', v_final);
end;
$$;

-- ------------------------------------------------------------
-- 3. 调课 / 拖拽改期：仅 SCHEDULED 可动，落库前做冲突校验
-- ------------------------------------------------------------
create or replace function public.fn_move_lesson(
  p_id    uuid,
  p_start timestamptz,
  p_end   timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor    uuid := public.current_teacher_id();
  v_org      uuid := public.current_org_id();
  v_l        record;
  v_teacher  text;
  v_room     text;
  v_students text;
  v_conflicts jsonb := '[]'::jsonb;
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'code', 'NO_AUTH', 'message', '登录已失效，请重新登录');
  end if;

  select * into v_l from public.lessons where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', '课次不存在');
  end if;
  if v_l.org_id <> v_org then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', '无权操作其他机构的数据');
  end if;
  if v_l.status <> 'SCHEDULED' then
    return jsonb_build_object('ok', false, 'code', 'BAD_STATE', 'message', '只有「待上课」的课次可以调课，已开始或已核销的课次请走调课单');
  end if;
  if p_end <= p_start then
    return jsonb_build_object('ok', false, 'code', 'BAD_INPUT', 'message', '结束时间必须晚于开始时间');
  end if;

  -- 教师冲突
  if v_l.teacher_id is not null then
    select string_agg(t.name || '（' || to_char(l.start_at, 'MM-DD HH24:MI') || ' ' || l.title || '）', '；')
      into v_teacher
    from public.lessons l
    join public.teachers t on t.id = l.teacher_id
    where l.id <> p_id
      and l.org_id = v_l.org_id
      and l.status <> 'CANCELLED'
      and l.teacher_id = v_l.teacher_id
      and tstzrange(l.start_at, l.end_at) && tstzrange(p_start, p_end);
    if v_teacher is not null then
      v_conflicts := v_conflicts || to_jsonb(format('教师冲突：%s', v_teacher));
    end if;
  end if;

  -- 教室冲突
  if v_l.room_id is not null then
    select string_agg(r.name || '（' || to_char(l.start_at, 'MM-DD HH24:MI') || ' ' || l.title || '）', '；')
      into v_room
    from public.lessons l
    join public.rooms r on r.id = l.room_id
    where l.id <> p_id
      and l.org_id = v_l.org_id
      and l.status <> 'CANCELLED'
      and l.room_id = v_l.room_id
      and tstzrange(l.start_at, l.end_at) && tstzrange(p_start, p_end);
    if v_room is not null then
      v_conflicts := v_conflicts || to_jsonb(format('教室冲突：%s', v_room));
    end if;
  end if;

  -- 学生时间重叠
  select string_agg(distinct s.name, '、')
    into v_students
  from public.lesson_students ls
  join public.students s on s.id = ls.student_id
  join public.lesson_students ls2 on ls2.student_id = ls.student_id and ls2.lesson_id <> p_id
  join public.lessons l2 on l2.id = ls2.lesson_id
  where ls.lesson_id = p_id
    and l2.org_id = v_l.org_id
    and l2.status <> 'CANCELLED'
    and tstzrange(l2.start_at, l2.end_at) && tstzrange(p_start, p_end);
  if v_students is not null then
    v_conflicts := v_conflicts || to_jsonb(format('学生冲突：%s 在该时段有其他课', v_students));
  end if;

  if jsonb_array_length(v_conflicts) > 0 then
    return jsonb_build_object('ok', false, 'code', 'CONFLICT', 'message', '该时段存在冲突', 'conflicts', v_conflicts);
  end if;

  update public.lessons
     set start_at = p_start,
         end_at   = p_end
   where id = p_id;

  return jsonb_build_object('ok', true, 'code', 'OK', 'message', '已改期');
end;
$$;

-- ------------------------------------------------------------
-- 4. 授权
-- ------------------------------------------------------------
grant execute on function public.fn_verify_consumption(uuid) to authenticated, service_role;
grant execute on function public.fn_resolve_consumption(uuid, text, numeric, numeric) to authenticated, service_role;
grant execute on function public.fn_move_lesson(uuid, timestamptz, timestamptz) to authenticated, service_role;
