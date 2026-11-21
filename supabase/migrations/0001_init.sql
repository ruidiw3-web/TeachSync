-- ============================================================
-- TeachSync 教师端 · 初始化 Schema（v0.1 对齐）
-- 依据：03-历史版本-v0.1-教师端/05-原型说明-信息架构与状态机.md
-- 执行：Supabase Dashboard → SQL Editor → 粘贴 → Run（幂等）
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 机构
-- ------------------------------------------------------------
create table if not exists public.orgs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 教师 / 员工
-- role: OWNER（负责人） / ADMIN（教务） / TEACHER（教师）
-- ------------------------------------------------------------
create table if not exists public.teachers (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name         text not null,
  phone        text,
  email        text,
  role         text not null default 'TEACHER' check (role in ('OWNER','ADMIN','TEACHER')),
  subjects     text[] not null default '{}',
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create index if not exists idx_teachers_org on public.teachers(org_id, active);
create index if not exists idx_teachers_auth on public.teachers(auth_user_id);

-- ------------------------------------------------------------
-- 学生
-- ------------------------------------------------------------
create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  name           text not null,
  grade          text,
  class_name     text,
  guardian_name  text,
  guardian_phone text,
  enroll_date    date,
  status         text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','LEFT')),
  note           text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_students_org on public.students(org_id, status);

-- ------------------------------------------------------------
-- 课程（科目 + 班型）
-- ------------------------------------------------------------
create table if not exists public.courses (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs(id) on delete cascade,
  name       text not null,
  subject    text,
  kind       text not null default 'GROUP' check (kind in ('ONE_ON_ONE','GROUP')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 教室
-- ------------------------------------------------------------
create table if not exists public.rooms (
  id       uuid primary key default gen_random_uuid(),
  org_id   uuid not null references public.orgs(id) on delete cascade,
  name     text not null,
  capacity int not null default 10
);

-- ------------------------------------------------------------
-- 课时包（按学生独立持有）
-- ------------------------------------------------------------
create table if not exists public.hour_packages (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  course_id   uuid references public.courses(id) on delete set null,
  total_hours numeric(7,2) not null check (total_hours >= 0),
  used_hours  numeric(7,2) not null default 0 check (used_hours >= 0),
  expire_at   date,
  status      text not null default 'ACTIVE' check (status in ('ACTIVE','EXHAUSTED','EXPIRED')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_packages_student on public.hour_packages(student_id, status);

-- ------------------------------------------------------------
-- 课次（状态机见 05 §3.1）
-- ------------------------------------------------------------
create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.orgs(id) on delete cascade,
  course_id        uuid references public.courses(id) on delete set null,
  teacher_id       uuid references public.teachers(id) on delete set null,
  room_id          uuid references public.rooms(id) on delete set null,
  title            text not null,
  subject          text,
  start_at         timestamptz not null,
  end_at           timestamptz not null,
  hours            numeric(5,2) not null default 1 check (hours > 0),
  status           text not null default 'SCHEDULED'
                   check (status in ('SCHEDULED','ONGOING','FINISHED','CONSUMED','CANCELLED','RESCHEDULED')),
  source_lesson_id uuid references public.lessons(id) on delete set null,
  created_by       uuid references public.teachers(id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint lesson_time_valid check (end_at > start_at)
);

create index if not exists idx_lessons_org_start on public.lessons(org_id, start_at desc);
create index if not exists idx_lessons_teacher on public.lessons(teacher_id, start_at desc);
create index if not exists idx_lessons_status on public.lessons(org_id, status);

-- ------------------------------------------------------------
-- 课次学生（班课多对多）
-- ------------------------------------------------------------
create table if not exists public.lesson_students (
  lesson_id  uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  org_id     uuid not null references public.orgs(id) on delete cascade,
  primary key (lesson_id, student_id)
);

-- ------------------------------------------------------------
-- 核销（状态机见 05 §3.2）
-- machine_hours 为学习机侧基准，用于对账
-- ------------------------------------------------------------
create table if not exists public.consumptions (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.orgs(id) on delete cascade,
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  hours         numeric(5,2) not null check (hours > 0),
  machine_hours numeric(5,2),
  diff          numeric(5,2) generated always as (coalesce(machine_hours, hours) - hours) stored,
  status        text not null default 'PENDING'
                check (status in ('PENDING','VERIFIED','REVIEW_NEEDED','IN_REVIEW','RESOLVED')),
  review_note   text,
  reviewed_by   uuid references public.teachers(id) on delete set null,
  resolved_by   uuid references public.teachers(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  unique (lesson_id, student_id)
);

create index if not exists idx_consumptions_org on public.consumptions(org_id, status);

-- ------------------------------------------------------------
-- 考勤
-- ------------------------------------------------------------
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs(id) on delete cascade,
  lesson_id   uuid not null references public.lessons(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  status      text not null default 'PRESENT'
              check (status in ('PRESENT','LATE','LEAVE','ABSENT')),
  check_in_at  timestamptz,
  check_out_at timestamptz,
  note        text,
  unique (lesson_id, student_id)
);

-- ------------------------------------------------------------
-- 错题集（来自学习机）
-- ------------------------------------------------------------
create table if not exists public.mistake_sets (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  subject      text,
  title        text not null,
  item_count   int not null default 0,
  source       text not null default 'MACHINE' check (source in ('MACHINE','IMPORT','MANUAL')),
  generated_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists idx_mistakes_student on public.mistake_sets(student_id, generated_at desc);

-- ------------------------------------------------------------
-- 打印任务（状态机见 05 §3.3）
-- ------------------------------------------------------------
create table if not exists public.print_tasks (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  student_id     uuid not null references public.students(id) on delete cascade,
  mistake_set_id uuid references public.mistake_sets(id) on delete cascade,
  status         text not null default 'PENDING'
                 check (status in ('PENDING','PRINTED_UNTAUGHT','ESCALATED','TAUGHT')),
  due_at         timestamptz,
  printed_at     timestamptz,
  escalated_at   timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists idx_print_status on public.print_tasks(org_id, status);

-- ------------------------------------------------------------
-- 讲解记录
-- ------------------------------------------------------------
create table if not exists public.explanations (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  print_task_id  uuid references public.print_tasks(id) on delete set null,
  student_id     uuid not null references public.students(id) on delete cascade,
  mastery        int check (mastery between 1 and 5),
  difficulty     text,
  note           text,
  taught_by      uuid references public.teachers(id) on delete set null,
  taught_at      timestamptz not null default now(),
  review_due_at  date
);

-- ------------------------------------------------------------
-- 复习提醒
-- ------------------------------------------------------------
create table if not exists public.review_reminders (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  student_id     uuid not null references public.students(id) on delete cascade,
  explanation_id uuid references public.explanations(id) on delete cascade,
  due_date       date not null,
  status         text not null default 'PENDING' check (status in ('PENDING','DONE','SKIPPED')),
  created_at     timestamptz not null default now()
);

create index if not exists idx_reminders_due on public.review_reminders(org_id, due_date);

-- ------------------------------------------------------------
-- 积分规则 / 流水 / 兑换
-- ------------------------------------------------------------
create table if not exists public.point_rules (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  name           text not null,
  dimension      text not null,
  points         int not null,
  condition      jsonb not null default '{}'::jsonb,
  daily_cap      int,
  active         boolean not null default true,
  effective_from date not null default current_date,
  created_at     timestamptz not null default now()
);

create table if not exists public.point_logs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  rule_id     uuid references public.point_rules(id) on delete set null,
  points      int not null,
  reason      text,
  occurred_at timestamptz not null default now(),
  created_by  uuid references public.teachers(id) on delete set null
);

create index if not exists idx_points_student on public.point_logs(student_id, occurred_at desc);

create table if not exists public.redeem_requests (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.orgs(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  item_name     text not null,
  points_cost   int not null check (points_cost > 0),
  status        text not null default 'PENDING' check (status in ('PENDING','APPROVED','REJECTED')),
  applied_at    timestamptz not null default now(),
  reviewed_by   uuid references public.teachers(id) on delete set null,
  reviewed_at   timestamptz,
  reject_reason text
);

-- ------------------------------------------------------------
-- 日报
-- ------------------------------------------------------------
create table if not exists public.daily_reports (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  report_date date not null,
  content     jsonb not null default '{}'::jsonb,
  status      text not null default 'DRAFT' check (status in ('DRAFT','PENDING','SENT')),
  sent_at     timestamptz,
  sent_by     uuid references public.teachers(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (student_id, report_date)
);

create index if not exists idx_reports_date on public.daily_reports(org_id, report_date desc);

-- ------------------------------------------------------------
-- 学习机同步事件（幂等键：device_id + event_id）
-- ------------------------------------------------------------
create table if not exists public.sync_events (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  device_id    text not null,
  event_id     text not null,
  event_type   text not null,
  payload      jsonb not null default '{}'::jsonb,
  occurred_at  timestamptz,
  received_at  timestamptz not null default now(),
  processed_at timestamptz,
  status       text not null default 'PENDING' check (status in ('PENDING','PROCESSED','FAILED')),
  error        text,
  unique (device_id, event_id)
);

create index if not exists idx_sync_status on public.sync_events(org_id, status);

create table if not exists public.sync_watermarks (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  source       text not null,
  watermark_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (org_id, source)
);

-- ------------------------------------------------------------
-- 学生与学习机设备绑定
-- ------------------------------------------------------------
create table if not exists public.device_bindings (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.orgs(id) on delete cascade,
  student_id   uuid references public.students(id) on delete set null,
  device_id    text not null,
  external_student_id text,
  bound_at     timestamptz,
  created_at   timestamptz not null default now(),
  unique (org_id, device_id)
);

-- ------------------------------------------------------------
-- 知识库 / AI
-- ------------------------------------------------------------
create table if not exists public.knowledge_docs (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.orgs(id) on delete cascade,
  title       text not null,
  layer       text not null default 'L1',
  content     text,
  status      text not null default 'READY' check (status in ('PROCESSING','READY','FAILED')),
  created_at  timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.orgs(id) on delete cascade,
  teacher_id      uuid references public.teachers(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null,
  citations       jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- RLS
-- 原则：本机构可读；写限本人或教务；财务/配置类仅教务
-- ============================================================
create or replace function public.current_teacher_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.teachers where auth_user_id = auth.uid() and active limit 1;
$$;

create or replace function public.current_org_id()
returns uuid language sql stable security definer set search_path = public as $$
  select org_id from public.teachers where auth_user_id = auth.uid() and active limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teachers
    where auth_user_id = auth.uid() and active and role in ('OWNER','ADMIN')
  );
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'orgs','teachers','students','courses','rooms','hour_packages','lessons',
    'lesson_students','consumptions','attendance','mistake_sets','print_tasks',
    'explanations','review_reminders','point_rules','point_logs','redeem_requests',
    'daily_reports','sync_events','sync_watermarks','device_bindings',
    'knowledge_docs','ai_messages'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- 通用策略：本机构可读
do $$
declare t text;
begin
  foreach t in array array[
    'teachers','students','courses','rooms','hour_packages','lessons',
    'lesson_students','consumptions','attendance','mistake_sets','print_tasks',
    'explanations','review_reminders','point_rules','point_logs','redeem_requests',
    'daily_reports','sync_events','sync_watermarks','device_bindings',
    'knowledge_docs','ai_messages'
  ]
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format(
      'create policy %I_read on public.%I for select using (org_id = public.current_org_id())',
      t, t);
  end loop;
end $$;

-- orgs 单独处理（无 org_id 列）
drop policy if exists orgs_read on public.orgs;
create policy orgs_read on public.orgs for select using (id = public.current_org_id());

-- 写策略：本机构内可写（教务额外放开的在应用层控制）
do $$
declare t text;
begin
  foreach t in array array[
    'students','courses','rooms','hour_packages','lessons','lesson_students',
    'consumptions','attendance','mistake_sets','print_tasks','explanations',
    'review_reminders','point_logs','redeem_requests','daily_reports',
    'sync_events','sync_watermarks','device_bindings','ai_messages'
  ]
  loop
    execute format('drop policy if exists %I_write on public.%I', t, t);
    execute format(
      'create policy %I_write on public.%I for all using (org_id = public.current_org_id()) with check (org_id = public.current_org_id())',
      t, t);
  end loop;
end $$;

-- 敏感表：仅教务可写
drop policy if exists point_rules_admin on public.point_rules;
create policy point_rules_admin on public.point_rules for all
  using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());

drop policy if exists teachers_admin on public.teachers;
create policy teachers_admin on public.teachers for all
  using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());

drop policy if exists knowledge_admin on public.knowledge_docs;
create policy knowledge_admin on public.knowledge_docs for all
  using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());
