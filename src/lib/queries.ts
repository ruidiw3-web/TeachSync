import { createClient } from './supabase/server'
import { isDemo } from './demo-flag'

export type DashboardData = {
  todayLessons: number
  pendingConsumptions: number
  abnormalConsumptions: number
  pendingPrints: number
  pendingReports: number
  pendingRedeems: number
  lessons: Array<{
    id: string
    title: string
    time: string
    meta: string
    status: string
  }>
  reviews: Array<{ id: string; name: string; detail: string; tone: 'err' | 'warn' | 'ok'; label: string }>
}

const EMPTY_DASH: DashboardData = {
  todayLessons: 0,
  pendingConsumptions: 0,
  abnormalConsumptions: 0,
  pendingPrints: 0,
  pendingReports: 0,
  pendingRedeems: 0,
  lessons: [],
  reviews: [],
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function fmtDate(d: string | Date) {
  const t = typeof d === 'string' ? new Date(d) : d
  const mm = String(t.getMonth() + 1).padStart(2, '0')
  const dd = String(t.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}

// ------------------------------------------------------------
// 侧边栏徽标
// ------------------------------------------------------------
export async function getNavCounts(): Promise<Record<string, number>> {
  if (isDemo) return {}
  try {
    const supabase = await createClient()
    const [verify, mistakes, points, reports, prints] = await Promise.all([
      supabase
        .from('consumptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING', 'REVIEW_NEEDED']),
      supabase
        .from('review_reminders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
      supabase
        .from('redeem_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING'),
      supabase
        .from('daily_reports')
        .select('*', { count: 'exact', head: true })
        .in('status', ['DRAFT', 'PENDING']),
      supabase
        .from('print_tasks')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PENDING', 'PRINTED_UNTAUGHT', 'ESCALATED']),
    ])

    const n = {
      verify: verify.count ?? 0,
      mistakes: mistakes.count ?? 0,
      points: points.count ?? 0,
      reports: reports.count ?? 0,
      tasks: (prints.count ?? 0) + (reports.count ?? 0) + (points.count ?? 0),
    }
    return n
  } catch {
    return {}
  }
}

// ------------------------------------------------------------
// 工作台
// ------------------------------------------------------------
export async function getDashboard(): Promise<DashboardData> {
  if (isDemo) return EMPTY_DASH

  try {
    const supabase = await createClient()
    const now = new Date()
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(now)
    dayEnd.setHours(23, 59, 59, 999)
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`

    const [lessonsRes, pendingRes, abnormalRes, printsRes, reportsRes, redeemRes, reviewRes] =
      await Promise.all([
        supabase
          .from('lessons')
          .select('id, title, start_at, end_at, status, rooms(name), courses(name)')
          .gte('start_at', dayStart.toISOString())
          .lte('start_at', dayEnd.toISOString())
          .order('start_at'),
        supabase
          .from('consumptions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['PENDING', 'REVIEW_NEEDED']),
        supabase
          .from('consumptions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['REVIEW_NEEDED', 'IN_REVIEW']),
        supabase
          .from('print_tasks')
          .select('*', { count: 'exact', head: true })
          .in('status', ['PENDING', 'ESCALATED']),
        supabase
          .from('daily_reports')
          .select('*', { count: 'exact', head: true })
          .in('status', ['DRAFT', 'PENDING']),
        supabase
          .from('redeem_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING'),
        supabase
          .from('review_reminders')
          .select('id, due_date, status, students(name), explanations(mastery)')
          .eq('status', 'PENDING')
          .lte('due_date', today)
          .order('due_date')
          .limit(4),
      ])

    const rows = lessonsRes.data ?? []

    const reviews = ((reviewRes.data ?? []) as unknown as Array<{
      id: string
      due_date: string
      students: { name: string } | null
    }>).map((r) => {
      const name = r.students?.name ?? '学生'
      const overdue = r.due_date < today
      return {
        id: r.id,
        name,
        detail: overdue ? `${fmtDate(r.due_date)} 应复习 · 已逾期` : '今日到期待复习',
        tone: (overdue ? 'err' : 'warn') as 'err' | 'warn',
        label: overdue ? '已逾期' : '今日',
      }
    })

    return {
      todayLessons: rows.length,
      pendingConsumptions: pendingRes.count ?? 0,
      abnormalConsumptions: abnormalRes.count ?? 0,
      pendingPrints: printsRes.count ?? 0,
      pendingReports: reportsRes.count ?? 0,
      pendingRedeems: redeemRes.count ?? 0,
      lessons: rows.map((l) => ({
        id: l.id,
        title: l.title,
        time: `${fmtTime(l.start_at)}–${fmtTime(l.end_at)}`,
        meta: [
          (l.courses as unknown as { name: string } | null)?.name,
          (l.rooms as unknown as { name: string } | null)?.name,
        ]
          .filter(Boolean)
          .join(' · '),
        status: l.status,
      })),
      reviews,
    }
  } catch {
    return EMPTY_DASH
  }
}

// ------------------------------------------------------------
// 核销
// ------------------------------------------------------------
export type VerifyRow = {
  id: string
  studentId: string
  studentName: string
  courseName: string
  lessonTitle: string
  when: string
  hours: number
  machineHours: number | null
  diff: number
  status: string
  packageLeft: number | null
}

export type VerifyData = {
  rows: VerifyRow[]
  pending: number
  abnormal: number
  verifiedThisMonth: number
  autoRate: number
}

export async function getVerifyData(): Promise<VerifyData> {
  const empty: VerifyData = { rows: [], pending: 0, abnormal: 0, verifiedThisMonth: 0, autoRate: 100 }
  if (isDemo) return empty

  try {
    const supabase = await createClient()
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [openRes, monthRes] = await Promise.all([
      supabase
        .from('consumptions')
        .select(
          'id, hours, machine_hours, diff, status, student_id, students(name), lessons(title, start_at, courses(name))'
        )
        .in('status', ['PENDING', 'REVIEW_NEEDED', 'IN_REVIEW'])
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('consumptions')
        .select('status', { count: 'exact' })
        .gte('created_at', monthStart.toISOString())
        .limit(1000),
    ])

    const raw = (openRes.data ?? []) as unknown as Array<{
      id: string
      hours: number
      machine_hours: number | null
      diff: number
      status: string
      student_id: string
      students: { name: string } | null
      lessons: { title: string; start_at: string; courses: { name: string } | null } | null
    }>

    // 剩余课时：按 student 聚合课时包
    const studentIds = [...new Set(raw.map((r) => r.student_id))]
    const leftMap = new Map<string, number>()
    if (studentIds.length > 0) {
      const { data: pkgs } = await supabase
        .from('hour_packages')
        .select('student_id, total_hours, used_hours')
        .in('student_id', studentIds)
        .eq('status', 'ACTIVE')
      for (const p of pkgs ?? []) {
        const left = Number(p.total_hours) - Number(p.used_hours)
        leftMap.set(p.student_id, (leftMap.get(p.student_id) ?? 0) + left)
      }
    }

    const rows: VerifyRow[] = raw.map((r) => ({
      id: r.id,
      studentId: r.student_id,
      studentName: r.students?.name ?? '—',
      courseName: r.lessons?.courses?.name ?? r.lessons?.title ?? '—',
      lessonTitle: r.lessons?.title ?? '',
      when: r.lessons?.start_at
        ? `${fmtDate(r.lessons.start_at)} ${fmtTime(r.lessons.start_at)}`
        : '—',
      hours: Number(r.hours),
      machineHours: r.machine_hours === null ? null : Number(r.machine_hours),
      diff: Number(r.diff ?? 0),
      status: r.status,
      packageLeft: leftMap.get(r.student_id) ?? null,
    }))

    const monthRows = monthRes.data ?? []
    const verified = monthRows.filter((x) => x.status === 'VERIFIED').length
    const needReview = monthRows.filter((x) => x.status === 'REVIEW_NEEDED').length
    const rate = monthRows.length > 0 ? ((monthRows.length - needReview) / monthRows.length) * 100 : 100

    return {
      rows,
      pending: rows.filter((r) => r.status === 'PENDING').length,
      abnormal: rows.filter((r) => r.status === 'REVIEW_NEEDED' || r.status === 'IN_REVIEW').length,
      verifiedThisMonth: verified,
      autoRate: Math.round(rate * 10) / 10,
    }
  } catch {
    return empty
  }
}

// ------------------------------------------------------------
// 排课
// ------------------------------------------------------------
export type ScheduleLesson = {
  id: string
  title: string
  courseName: string
  teacherId: string | null
  teacherName: string
  roomId: string | null
  roomName: string
  startAt: string
  endAt: string
  hours: number
  status: string
  studentIds: string[]
  studentCount: number
}

export async function getScheduleLessons(fromISO: string, toISO: string): Promise<ScheduleLesson[]> {
  if (isDemo) return []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('lessons')
      .select(
        'id, title, start_at, end_at, hours, status, teacher_id, room_id, teachers!lessons_teacher_id_fkey(name), rooms(name), courses(name), lesson_students(student_id)'
      )
      .gte('start_at', fromISO)
      .lt('start_at', toISO)
      .neq('status', 'CANCELLED')
      .order('start_at')

    const rows = (data ?? []) as unknown as Array<{
      id: string
      title: string
      start_at: string
      end_at: string
      hours: number
      status: string
      teacher_id: string | null
      room_id: string | null
      teachers: { name: string } | null
      rooms: { name: string } | null
      courses: { name: string } | null
      lesson_students: Array<{ student_id: string }>
    }>

    return rows.map((l) => ({
      id: l.id,
      title: l.title,
      courseName: l.courses?.name ?? l.title,
      teacherId: l.teacher_id,
      teacherName: l.teachers?.name ?? '未指派',
      roomId: l.room_id,
      roomName: l.rooms?.name ?? '未安排',
      startAt: l.start_at,
      endAt: l.end_at,
      hours: Number(l.hours),
      status: l.status,
      studentIds: (l.lesson_students ?? []).map((s) => s.student_id),
      studentCount: (l.lesson_students ?? []).length,
    }))
  } catch {
    return []
  }
}

// ------------------------------------------------------------
// 学生
// ------------------------------------------------------------
export async function getStudents() {
  if (isDemo) return []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('students')
      .select('id, name, grade, class_name, guardian_name, guardian_phone, status')
      .eq('status', 'ACTIVE')
      .order('name')
    return data ?? []
  } catch {
    return []
  }
}

// ------------------------------------------------------------
// 其他列表（保留兼容）
// ------------------------------------------------------------
export async function getPendingConsumptions() {
  if (isDemo) return []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('consumptions')
      .select(
        'id, hours, machine_hours, diff, status, students(name), lessons(title, start_at, teachers!lessons_teacher_id_fkey(name))'
      )
      .in('status', ['PENDING', 'REVIEW_NEEDED', 'IN_REVIEW'])
      .order('created_at', { ascending: false })
      .limit(50)
    return data ?? []
  } catch {
    return []
  }
}

export async function getPrintTasks() {
  if (isDemo) return []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('print_tasks')
      .select('id, status, due_at, created_at, students(name), mistake_sets(title, item_count, subject)')
      .in('status', ['PENDING', 'PRINTED_UNTAUGHT', 'ESCALATED'])
      .order('created_at', { ascending: false })
      .limit(50)
    return data ?? []
  } catch {
    return []
  }
}

export async function getWeekLessons() {
  if (isDemo) return []
  try {
    const supabase = await createClient()
    const start = new Date()
    start.setDate(start.getDate() - start.getDay() + 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)

    const { data } = await supabase
      .from('lessons')
      .select('id, title, start_at, end_at, status, hours, courses(name), teachers!lessons_teacher_id_fkey(name), rooms(name)')
      .gte('start_at', start.toISOString())
      .lt('start_at', end.toISOString())
      .order('start_at')
    return data ?? []
  } catch {
    return []
  }
}

// ------------------------------------------------------------
// 排课表单选项
// ------------------------------------------------------------
export type FormOptions = {
  courses: Array<{ id: string; name: string }>
  teachers: Array<{ id: string; name: string }>
  rooms: Array<{ id: string; name: string }>
  students: Array<{ id: string; name: string; grade: string | null }>
}

export async function getFormOptions(): Promise<FormOptions> {
  const empty: FormOptions = { courses: [], teachers: [], rooms: [], students: [] }
  if (isDemo) return empty
  try {
    const supabase = await createClient()
    const [c, t, r, s] = await Promise.all([
      supabase.from('courses').select('id, name').order('name'),
      supabase.from('teachers').select('id, name').eq('active', true).order('name'),
      supabase.from('rooms').select('id, name').order('name'),
      supabase.from('students').select('id, name, grade').eq('status', 'ACTIVE').order('name'),
    ])
    return {
      courses: c.data ?? [],
      teachers: t.data ?? [],
      rooms: r.data ?? [],
      students: s.data ?? [],
    }
  } catch {
    return empty
  }
}
