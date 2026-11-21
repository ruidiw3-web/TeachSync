'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/session'
import { isDemo } from '@/lib/demo-flag'

export type MoveResult = { ok: boolean; message: string; conflicts?: string[] }

type SupabaseLike = Awaited<ReturnType<typeof createClient>>

/** 拖拽改期：交给数据库函数做冲突校验与落库 */
export async function moveLesson(
  id: string,
  startISO: string,
  endISO: string
): Promise<MoveResult> {
  if (isDemo) return { ok: false, message: '演示模式不支持写入' }
  if (!id || !startISO || !endISO) return { ok: false, message: '参数不完整' }

  const s = new Date(startISO)
  const e = new Date(endISO)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
    return { ok: false, message: '时间格式不正确' }
  }
  if (e <= s) return { ok: false, message: '结束时间必须晚于开始时间' }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('fn_move_lesson', {
      p_id: id,
      p_start: s.toISOString(),
      p_end: e.toISOString(),
    })

    // 42883 = 函数不存在 → 降级为应用层校验
    if (error && error.code === '42883') {
      return moveBySteps(supabase, id, s, e)
    }
    if (error) return { ok: false, message: `改期失败：${error.message}` }

    const r = (data ?? {}) as { ok?: boolean; message?: string; conflicts?: string[] }
    if (r.ok) {
      revalidatePath('/schedule')
      revalidatePath('/today')
      return { ok: true, message: r.message ?? '已改期' }
    }
    return { ok: false, message: r.message ?? '改期失败', conflicts: r.conflicts }
  } catch {
    return { ok: false, message: '网络异常，改期未保存' }
  }
}

/** 补偿式调课：数据库没装 fn_move_lesson 时在应用层做冲突校验 */
async function moveBySteps(
  supabase: SupabaseLike,
  id: string,
  start: Date,
  end: Date
): Promise<MoveResult> {
  const { data: l, error } = await supabase
    .from('lessons')
    .select('id, title, status, teacher_id, room_id, org_id')
    .eq('id', id)
    .maybeSingle()

  if (error) return { ok: false, message: `读取课次失败：${error.message}` }
  if (!l) return { ok: false, message: '课次不存在' }
  if (l.status !== 'SCHEDULED') {
    return { ok: false, message: '只有「待上课」的课次可以调课' }
  }

  const sISO = start.toISOString()
  const eISO = end.toISOString()
  const conflicts: string[] = []

  const { data: overlaps } = await supabase
    .from('lessons')
    .select('id, title, teacher_id, room_id, start_at, teachers!lessons_teacher_id_fkey(name), rooms(name)')
    .eq('org_id', l.org_id)
    .neq('status', 'CANCELLED')
    .neq('id', id)
    .lt('start_at', eISO)
    .gt('end_at', sISO)

  const rows = (overlaps ?? []) as unknown as Array<{
    id: string
    title: string
    teacher_id: string | null
    room_id: string | null
    start_at: string
    teachers: { name: string } | null
    rooms: { name: string } | null
  }>

  for (const o of rows) {
    const at = new Date(o.start_at).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    if (l.teacher_id && o.teacher_id === l.teacher_id) {
      conflicts.push(`教师冲突：${o.teachers?.name ?? '该教师'} ${at} 已有「${o.title}」`)
    }
    if (l.room_id && o.room_id === l.room_id) {
      conflicts.push(`教室冲突：${o.rooms?.name ?? '该教室'} ${at} 已被「${o.title}」占用`)
    }
  }

  // 学生重叠单独查
  const { data: mine } = await supabase
    .from('lesson_students')
    .select('student_id')
    .eq('lesson_id', id)

  const myStudents = (mine ?? []).map((x) => x.student_id)
  if (myStudents.length > 0) {
    const { data: links } = await supabase
      .from('lesson_students')
      .select('lesson_id, student_id')
      .in('student_id', myStudents)
      .neq('lesson_id', id)

    const otherLessonIds = [...new Set((links ?? []).map((x) => x.lesson_id))]
    const clashIds = rows.filter((r) => otherLessonIds.includes(r.id)).map((r) => r.id)

    if (clashIds.length > 0) {
      const { data: names } = await supabase
        .from('students')
        .select('id, name')
        .in(
          'id',
          (links ?? []).filter((x) => clashIds.includes(x.lesson_id)).map((x) => x.student_id)
        )
      const list = (names ?? []).map((n) => n.name).join('、')
      const titles = rows.filter((r) => clashIds.includes(r.id)).map((r) => r.title)
      conflicts.push(`学生冲突：${list} 在该时段另有「${titles[0]}」`)
    }
  }

  if (conflicts.length > 0) {
    return { ok: false, message: '该时段存在冲突', conflicts }
  }

  const { error: upErr } = await supabase
    .from('lessons')
    .update({ start_at: sISO, end_at: eISO })
    .eq('id', id)

  if (upErr) return { ok: false, message: `改期失败：${upErr.message}` }

  revalidatePath('/schedule')
  revalidatePath('/today')
  return { ok: true, message: '已改期' }
}

export type CreateLessonInput = {
  courseId: string | null
  teacherId: string | null
  roomId: string | null
  title: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  hours: number
  studentIds: string[]
}

export type CreateResult = { ok: boolean; message: string; id?: string }

/** 新建课次：先做时间冲突校验，再写 lessons + lesson_students */
export async function createLesson(input: CreateLessonInput): Promise<CreateResult> {
  if (isDemo) return { ok: false, message: '演示模式不支持写入' }

  const user = await getCurrentUser()
  if (!user) return { ok: false, message: '登录已失效，请重新登录' }

  const title = input.title?.trim()
  if (!title) return { ok: false, message: '请填写课次名称' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, message: '日期格式不正确' }
  if (!/^\d{2}:\d{2}$/.test(input.startTime)) return { ok: false, message: '开始时间格式不正确' }
  const hours = Number(input.hours)
  if (!Number.isFinite(hours) || hours <= 0 || hours > 12) {
    return { ok: false, message: '课时长度需在 0.5–12 之间' }
  }

  const start = new Date(`${input.date}T${input.startTime}:00`)
  if (Number.isNaN(start.getTime())) return { ok: false, message: '时间解析失败' }
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000)

  try {
    const supabase = await createClient()

    // 同一时段的重叠课次（排除已取消）
    const { data: sameDay } = await supabase
      .from('lessons')
      .select('id, title, start_at, end_at, teacher_id, room_id, lesson_students(student_id)')
      .eq('org_id', user.orgId)
      .neq('status', 'CANCELLED')
      .gte('start_at', new Date(start.getTime() - 12 * 3600 * 1000).toISOString())
      .lte('start_at', new Date(end.getTime() + 12 * 3600 * 1000).toISOString())

    const rows = (sameDay ?? []) as unknown as Array<{
      id: string
      title: string
      start_at: string
      end_at: string
      teacher_id: string | null
      room_id: string | null
      lesson_students: Array<{ student_id: string }>
    }>

    const overlap = (a: Date, b: Date, c: Date, d: Date) => a < d && c < b
    const reasons: string[] = []

    for (const r of rows) {
      if (!overlap(start, end, new Date(r.start_at), new Date(r.end_at))) continue
      if (input.teacherId && r.teacher_id === input.teacherId) {
        reasons.push(`教师在该时段已有「${r.title}」`)
      }
      if (input.roomId && r.room_id === input.roomId) {
        reasons.push(`教室在该时段已有「${r.title}」`)
      }
      const shared = r.lesson_students?.some((s) => input.studentIds.includes(s.student_id))
      if (shared) reasons.push(`有学生在「${r.title}」中，时间重叠`)
    }

    if (reasons.length > 0) {
      return { ok: false, message: [...new Set(reasons)].slice(0, 3).join('；') }
    }

    const { data: created, error } = await supabase
      .from('lessons')
      .insert({
        org_id: user.orgId,
        course_id: input.courseId,
        teacher_id: input.teacherId,
        room_id: input.roomId,
        title,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        hours,
        status: 'SCHEDULED',
        created_by: user.staffId,
      })
      .select('id')
      .single()

    if (error || !created) {
      return { ok: false, message: `建课失败：${error?.message ?? '未知错误'}` }
    }

    if (input.studentIds.length > 0) {
      const { error: lsErr } = await supabase.from('lesson_students').insert(
        input.studentIds.map((sid) => ({
          lesson_id: created.id,
          student_id: sid,
          org_id: user.orgId,
        }))
      )
      if (lsErr) {
        // 学生关联失败则回滚课次，避免出现没有学生的空课
        await supabase.from('lessons').delete().eq('id', created.id)
        return { ok: false, message: `学生关联失败，已回滚：${lsErr.message}` }
      }
    }

    revalidatePath('/schedule')
    revalidatePath('/today')
    return { ok: true, message: '课次已创建', id: created.id }
  } catch {
    return { ok: false, message: '网络异常，课次未创建' }
  }
}
