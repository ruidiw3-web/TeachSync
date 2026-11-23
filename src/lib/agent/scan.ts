/**
 * Agent 任务机制：把「异常预警 / 待办提醒 / 反馈草稿待生成」从库里算出来。
 *
 * 设计原则（重要，别破坏）：
 * 1. 每条结论都必须能指回具体记录，不推断、不寒暄、不编造。
 * 2. 一次扫描只打一批并行查询（当前环境每次往返约 250ms，串行会翻倍）。
 * 3. 信号 id 用「规则:实体」拼成稳定键，重复扫描不会产生重复事项。
 */

import { createClient } from '@/lib/supabase/server'
import { isDemo } from '@/lib/demo-flag'
import {
  addDaysYmd,
  endOfDay,
  hmOf,
  mdOf,
  mondayOf,
  startOfDay,
  ymdOf,
} from '@/lib/time'

export type Severity = 'high' | 'medium' | 'low'
export type SignalKind = 'ALERT' | 'TODO' | 'DRAFT'

export type AgentSignal = {
  id: string
  kind: SignalKind
  severity: Severity
  /** 规则名，例如「课时对账异常」 */
  category: string
  title: string
  /** 判断依据，界面直接展示，便于人工复核 */
  detail: string
  href: string
  action: string
  studentId?: string
  refDate?: string
}

export type AgentReport = {
  generatedAt: string
  signals: AgentSignal[]
  counts: {
    high: number
    alert: number
    todo: number
    draft: number
    total: number
  }
  ruleBook: Array<{ name: string; note: string; hit: number }>
}

const SEV: Record<Severity, number> = { high: 0, medium: 1, low: 2 }

const EMPTY: AgentReport = {
  generatedAt: '',
  signals: [],
  counts: { high: 0, alert: 0, todo: 0, draft: 0, total: 0 },
  ruleBook: [],
}

type ConsumptionRow = {
  id: string
  status: string
  hours: number
  machine_hours: number | null
  diff: number
  created_at: string
  student_id: string
  students: { name: string } | null
  lessons: { title: string } | null
}

type PrintRow = {
  id: string
  status: string
  created_at: string
  printed_at: string | null
  due_at: string | null
  students: { name: string } | null
  mistake_sets: { title: string; item_count: number } | null
}

type PackageRow = {
  id: string
  total_hours: number
  used_hours: number
  expire_at: string | null
  student_id: string
  students: { name: string } | null
  courses: { name: string } | null
}

type LessonRow = {
  id: string
  title: string
  start_at: string
  end_at: string
  teacher_id: string | null
  room_id: string | null
  teachers: { name: string } | null
  rooms: { name: string } | null
}

type TodayLessonRow = {
  id: string
  title: string
  status: string
  start_at: string
  lesson_students: Array<{ student_id: string; students: { name: string } | null }> | null
}

type ReminderRow = {
  id: string
  due_date: string
  students: { name: string } | null
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

/** 同一个学生多个课时包合并成一条，避免刷屏 */
function aggregatePackages(rows: PackageRow[]) {
  const map = new Map<
    string,
    { name: string; left: number; courses: string[]; nearestExpire: string | null }
  >()
  for (const p of rows) {
    const cur =
      map.get(p.student_id) ??
      { name: p.students?.name ?? '未知学生', left: 0, courses: [], nearestExpire: null }
    cur.left += Number(p.total_hours) - Number(p.used_hours)
    const cname = p.courses?.name
    if (cname && !cur.courses.includes(cname)) cur.courses.push(cname)
    if (p.expire_at && (!cur.nearestExpire || p.expire_at < cur.nearestExpire)) {
      cur.nearestExpire = p.expire_at
    }
    map.set(p.student_id, cur)
  }
  return map
}

export async function runAgentScan(): Promise<AgentReport> {
  if (isDemo) return EMPTY

  const supabase = await createClient()

  const now = new Date()
  const today = ymdOf(now)
  const weekStart = mondayOf(today)
  const weekFrom = startOfDay(weekStart).toISOString()
  const weekTo = startOfDay(addDaysYmd(weekStart, 7)).toISOString()
  const dayTo = endOfDay(today).toISOString()
  const draftFrom = startOfDay(addDaysYmd(today, -7)).toISOString()
  const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString()

  // 一批并行查完，不串行等
  const [consRes, printRes, pkgRes, weekRes, todayRes, reportRes, remindRes] =
    await Promise.all([
      supabase
        .from('consumptions')
        .select(
          'id, status, hours, machine_hours, diff, created_at, student_id, students(name), lessons(title)'
        )
        .in('status', ['PENDING', 'REVIEW_NEEDED', 'IN_REVIEW'])
        .order('created_at', { ascending: true })
        .limit(200),
      supabase
        .from('print_tasks')
        .select(
          'id, status, created_at, printed_at, due_at, students(name), mistake_sets(title, item_count)'
        )
        .in('status', ['PENDING', 'PRINTED_UNTAUGHT', 'ESCALATED'])
        .limit(200),
      supabase
        .from('hour_packages')
        .select('id, total_hours, used_hours, expire_at, student_id, students(name), courses(name)')
        .eq('status', 'ACTIVE')
        .limit(500),
      supabase
        .from('lessons')
        .select(
          'id, title, start_at, end_at, teacher_id, room_id, teachers!lessons_teacher_id_fkey(name), rooms(name)'
        )
        .gte('start_at', weekFrom)
        .lt('start_at', weekTo)
        .neq('status', 'CANCELLED'),
      supabase
        .from('lessons')
        .select('id, title, status, start_at, lesson_students(student_id, students(name))')
        .gte('start_at', draftFrom)
        .lte('start_at', dayTo)
        .in('status', ['FINISHED', 'CONSUMED'])
        .order('start_at', { ascending: false }),
      supabase
        .from('daily_reports')
        .select('student_id, report_date')
        .gte('report_date', addDaysYmd(today, -7))
        .lte('report_date', today),
      supabase
        .from('review_reminders')
        .select('id, due_date, students(name)')
        .eq('status', 'PENDING')
        .lt('due_date', today)
        .limit(100),
    ])

  const cons = (consRes.data ?? []) as unknown as ConsumptionRow[]
  const prints = (printRes.data ?? []) as unknown as PrintRow[]
  const pkgs = (pkgRes.data ?? []) as unknown as PackageRow[]
  const week = (weekRes.data ?? []) as unknown as LessonRow[]
  const todayLessons = (todayRes.data ?? []) as unknown as TodayLessonRow[]
  const reportSet = new Set(
    (reportRes.data ?? []).map((r) => `${r.student_id}|${String(r.report_date)}`)
  )
  const reminds = (remindRes.data ?? []) as unknown as ReminderRow[]

  const signals: AgentSignal[] = []
  const hit: Record<string, number> = {}
  const bump = (name: string) => {
    hit[name] = (hit[name] ?? 0) + 1
  }

  // ---------- 规则 1：课时对账异常 ----------
  const abnormal = cons.filter(
    (c) => c.status === 'REVIEW_NEEDED' || c.status === 'IN_REVIEW' || Number(c.diff ?? 0) !== 0
  )
  for (const c of abnormal) {
    const diff = Number(c.diff ?? 0)
    const name = c.students?.name ?? '未知学生'
    signals.push({
      id: `consumption-abnormal:${c.id}`,
      kind: 'ALERT',
      severity: 'high',
      category: '课时对账异常',
      title: `${name} 的课时与学习机上报不一致`,
      detail: `${c.lessons?.title ?? '课次'} · 教务记 ${Number(c.hours)} 课时，学习机 ${
        c.machine_hours === null ? '无记录' : `${Number(c.machine_hours)} 课时`
      }，差额 ${diff > 0 ? '+' : ''}${diff}`,
      href: '/verify',
      action: '去复核',
      studentId: c.student_id,
    })
    bump('课时对账异常')
  }

  // ---------- 规则 2：核销积压 ----------
  const stale = cons.filter(
    (c) => c.status === 'PENDING' && daysSince(c.created_at) >= 2
  )
  if (stale.length > 0) {
    const worst = stale.reduce((a, b) => (daysSince(a.created_at) > daysSince(b.created_at) ? a : b))
    signals.push({
      id: 'consumption-stale:batch',
      kind: 'TODO',
      severity: 'medium',
      category: '核销积压',
      title: `${stale.length} 笔课时超过 2 天未核销`,
      detail: `最早一笔来自 ${worst.students?.name ?? '未知学生'}，已积压 ${daysSince(
        worst.created_at
      )} 天。课时不核销，学生余额和续费提醒都会失准。`,
      href: '/verify',
      action: '批量核销',
    })
    bump('核销积压')
  }

  // ---------- 规则 3：错题印了没讲 ----------
  const untaught = prints.filter(
    (p) => p.status === 'PRINTED_UNTAUGHT' || p.status === 'ESCALATED'
  )
  for (const p of untaught) {
    const name = p.students?.name ?? '未知学生'
    const over = daysSince(p.printed_at ?? p.created_at)
    signals.push({
      id: `print-untaught:${p.id}`,
      kind: 'ALERT',
      severity: p.status === 'ESCALATED' ? 'high' : 'medium',
      category: '错题印了没讲',
      title: `${name} 的错题已打印但还没讲解`,
      detail: `${p.mistake_sets?.title ?? '错题集'}${
        p.mistake_sets?.item_count ? ` · ${p.mistake_sets.item_count} 题` : ''
      }${over > 0 ? ` · 已放置 ${over} 天` : ''}${
        p.status === 'ESCALATED' ? ' · 已触发超时升级' : ''
      }`,
      href: '/mistakes',
      action: '安排讲解',
      studentId: undefined,
    })
    bump('错题印了没讲')
  }

  // ---------- 规则 4：课时余额不足 ----------
  const agg = aggregatePackages(pkgs)
  for (const [studentId, info] of agg) {
    if (info.left > 2) continue
    signals.push({
      id: `hours-low:${studentId}`,
      kind: 'ALERT',
      severity: info.left <= 0 ? 'high' : 'medium',
      category: '课时余额不足',
      title: `${info.name} 剩余 ${info.left} 课时`,
      detail:
        info.left <= 0
          ? '课时已用尽，下一节课将无法扣课时，请先联系家长续费'
          : `低于 2 课时警戒线${info.courses.length ? `（${info.courses.join('、')}）` : ''}，建议提前续费`,
      href: '/students',
      action: '查看学生',
      studentId,
    })
    bump('课时余额不足')
  }

  // ---------- 规则 5：课时包临期 ----------
  const soon = addDaysYmd(today, 14)
  for (const [studentId, info] of agg) {
    if (!info.nearestExpire) continue
    if (info.nearestExpire < today || info.nearestExpire > soon) continue
    signals.push({
      id: `hours-expiring:${studentId}`,
      kind: 'TODO',
      severity: 'medium',
      category: '课时包临期',
      title: `${info.name} 的课时包 ${mdOf(info.nearestExpire)} 到期`,
      detail: `还剩 ${info.left} 课时未用完，到期作废。建议本周内安排补课或办理延期。`,
      href: '/students',
      action: '查看学生',
      studentId,
    })
    bump('课时包临期')
  }

  // ---------- 规则 6：教师 / 教室时间冲突 ----------
  for (let i = 0; i < week.length; i++) {
    for (let j = i + 1; j < week.length; j++) {
      const a = week[i]
      const b = week[j]
      const overlap =
        new Date(a.start_at) < new Date(b.end_at) &&
        new Date(b.start_at) < new Date(a.end_at)
      if (!overlap) continue

      if (a.teacher_id && a.teacher_id === b.teacher_id) {
        signals.push({
          id: `conflict-teacher:${a.id}:${b.id}`,
          kind: 'ALERT',
          severity: 'high',
          category: '排课冲突',
          title: `${a.teachers?.name ?? '同一教师'} 同一时段被排了两节课`,
          detail: `${mdOf(a.start_at)} ${hmOf(a.start_at)}–${hmOf(a.end_at)}「${a.title}」与「${
            b.title
          }」重叠`,
          href: '/schedule',
          action: '去调课',
        })
        bump('排课冲突')
      }
      if (a.room_id && a.room_id === b.room_id) {
        signals.push({
          id: `conflict-room:${a.id}:${b.id}`,
          kind: 'ALERT',
          severity: 'medium',
          category: '排课冲突',
          title: `${a.rooms?.name ?? '同一教室'} 被两节课占用`,
          detail: `${mdOf(a.start_at)} ${hmOf(a.start_at)}–${hmOf(a.end_at)}「${a.title}」与「${
            b.title
          }」重叠`,
          href: '/schedule',
          action: '去调课',
        })
        bump('排课冲突')
      }
    }
  }

  // ---------- 规则 7：已结课但没发反馈 → 生成草稿 ----------
  let draftCount = 0
  for (const l of todayLessons) {
    const d = ymdOf(l.start_at)
    for (const ls of l.lesson_students ?? []) {
      if (reportSet.has(`${ls.student_id}|${d}`)) continue
      if (draftCount >= 12) break
      draftCount++
      const name = ls.students?.name ?? '未知学生'
      signals.push({
        id: `report-missing:${ls.student_id}:${d}`,
        kind: 'DRAFT',
        severity: 'medium',
        category: '反馈草稿',
        title: `${name} · ${l.title} 还没发家长反馈`,
        detail: `${mdOf(l.start_at)} ${hmOf(l.start_at)} 的课已结束，系统可据考勤与扣课时自动起草，你确认后即可发送。`,
        href: `/tasks?draft=${ls.student_id}&date=${d}`,
        action: '生成草稿',
        studentId: ls.student_id,
        refDate: d,
      })
      bump('反馈草稿')
    }
  }

  // ---------- 规则 8：错题复习逾期 ----------
  if (reminds.length > 0) {
    const names = reminds
      .slice(0, 3)
      .map((r) => `${r.students?.name ?? '未知学生'}(${mdOf(r.due_date)})`)
      .join('、')
    signals.push({
      id: 'review-overdue:batch',
      kind: 'TODO',
      severity: 'medium',
      category: '复习逾期',
      title: `${reminds.length} 条错题复习已过复习日`,
      detail: `${names}${reminds.length > 3 ? ' 等' : ''}。复习周期一旦拖长，遗忘率会明显上升。`,
      href: '/mistakes',
      action: '安排复习',
    })
    bump('复习逾期')
  }

  signals.sort(
    (a, b) => SEV[a.severity] - SEV[b.severity] || a.category.localeCompare(b.category)
  )

  const ruleBook = [
    { name: '课时对账异常', note: '学习机上报课时 ≠ 教务登记，或已进入复核', hit: hit['课时对账异常'] ?? 0 },
    { name: '核销积压', note: '待核销超过 2 天未处理', hit: hit['核销积压'] ?? 0 },
    { name: '错题印了没讲', note: '打印完成但未标记已讲解，含超时升级', hit: hit['错题印了没讲'] ?? 0 },
    { name: '课时余额不足', note: '剩余课时 ≤ 2', hit: hit['课时余额不足'] ?? 0 },
    { name: '课时包临期', note: '14 天内到期且尚有余额', hit: hit['课时包临期'] ?? 0 },
    { name: '排课冲突', note: '同一教师或同一教室时段重叠', hit: hit['排课冲突'] ?? 0 },
    { name: '反馈草稿', note: '今日已结课但该学生当天无日报', hit: hit['反馈草稿'] ?? 0 },
    { name: '复习逾期', note: '错题复习计划已过复习日', hit: hit['复习逾期'] ?? 0 },
  ]

  return {
    generatedAt: new Date().toISOString(),
    signals,
    counts: {
      high: signals.filter((s) => s.severity === 'high').length,
      alert: signals.filter((s) => s.kind === 'ALERT').length,
      todo: signals.filter((s) => s.kind === 'TODO').length,
      draft: signals.filter((s) => s.kind === 'DRAFT').length,
      total: signals.length,
    },
    ruleBook,
  }
}
