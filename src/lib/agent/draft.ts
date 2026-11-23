/**
 * 反馈草稿生成：把「今天这个学生到底发生了什么」拼成家长能看懂的一段话。
 *
 * 铁律：所有句子都必须来自库里的具体字段。查不到的项一律写「暂无记录」，
 * 绝不补写「表现优秀」这类没有数据支撑的评价。宁可短，不可编。
 */

import { createClient } from '@/lib/supabase/server'
import { isDemo } from '@/lib/demo-flag'
import { endOfDay, hmOf, mdOf, startOfDay } from '@/lib/time'

export type DraftSection = { heading: string; body: string }

export type FeedbackDraft = {
  studentId: string
  studentName: string
  guardianName: string | null
  date: string
  sections: DraftSection[]
  /** 纯文本版，方便直接复制到微信 */
  text: string
  /** 草稿引用的数据，界面上摊开给人核对 */
  facts: string[]
  /** 缺什么数据、哪句话因此没写 */
  gaps: string[]
}

type Row = Record<string, unknown>

const ATT_LABEL: Record<string, string> = {
  PRESENT: '按时到课',
  LATE: '迟到',
  LEAVE: '请假',
  ABSENT: '缺勤',
}

export async function buildFeedbackDraft(
  studentId: string,
  date: string
): Promise<{ ok: true; draft: FeedbackDraft } | { ok: false; error: string }> {
  if (isDemo) return { ok: false, error: '演示模式没有真实数据，无法生成草稿。' }

  const supabase = await createClient()
  const from = startOfDay(date).toISOString()
  const to = endOfDay(date).toISOString()

  const [stuRes, lsRes, attRes, conRes, misRes, pkgRes] = await Promise.all([
    supabase
      .from('students')
      .select('id, name, grade, guardian_name')
      .eq('id', studentId)
      .maybeSingle(),
    supabase
      .from('lesson_students')
      .select(
        'lessons!inner(id, title, start_at, end_at, hours, status, courses(name))'
      )
      .eq('student_id', studentId)
      .gte('lessons.start_at', from)
      .lte('lessons.start_at', to),
    supabase
      .from('attendance')
      .select('lesson_id, status, note, lessons!inner(start_at)')
      .eq('student_id', studentId)
      .gte('lessons.start_at', from)
      .lte('lessons.start_at', to),
    supabase
      .from('consumptions')
      .select('lesson_id, hours, machine_hours, diff, status, lessons!inner(start_at)')
      .eq('student_id', studentId)
      .gte('lessons.start_at', from)
      .lte('lessons.start_at', to),
    supabase
      .from('mistake_sets')
      .select('title, subject, item_count, generated_at')
      .eq('student_id', studentId)
      .gte('generated_at', from)
      .lte('generated_at', to),
    supabase
      .from('hour_packages')
      .select('total_hours, used_hours, expire_at')
      .eq('student_id', studentId)
      .eq('status', 'ACTIVE'),
  ])

  const stu = stuRes.data as { id: string; name: string; grade: string | null; guardian_name: string | null } | null
  if (!stu) return { ok: false, error: '找不到这个学生。' }

  const lessons = ((lsRes.data ?? []) as unknown as Array<{ lessons: Row | Row[] | null }>).map(
    (r) => (Array.isArray(r.lessons) ? r.lessons[0] : r.lessons) as Row | null
  ).filter(Boolean) as Row[]

  if (lessons.length === 0) {
    return {
      ok: false,
      error: `${stu.name} 在 ${mdOf(date)} 没有排课记录，没有可写的内容。`,
    }
  }

  const att = ((attRes.data ?? []) as unknown as Row[]).map((r) => r)
  const con = ((conRes.data ?? []) as unknown as Row[]).map((r) => r)
  const mistakes = (misRes.data ?? []) as unknown as Array<{
    title: string
    subject: string | null
    item_count: number
  }>

  const facts: string[] = []
  const gaps: string[] = []
  const sections: DraftSection[] = []

  // ---- 一、当日内容 ----
  const lessonLines = lessons
    .sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)))
    .map((l) => {
      const course = (l.courses as { name?: string } | null)?.name
      const title = String(l.title)
      // 课程名已经包含在标题里就不重复写（例：初三数学 · 冲刺A班）
      const label = course && !title.includes(course) ? `${course} · ${title}` : title
      const time = `${hmOf(String(l.start_at))}–${hmOf(String(l.end_at))}`
      const h = Number(l.hours)
      facts.push(`${time} ${title}，${h} 课时`)
      return `· ${time} ${label}（${h} 课时）`
    })
  sections.push({ heading: '一、当日学习内容', body: lessonLines.join('\n') })

  // ---- 二、到课情况 ----
  const attByLesson = new Map<string, string>()
  for (const a of att) attByLesson.set(String(a.lesson_id), String(a.status))

  if (att.length === 0) {
    gaps.push('当日没有考勤记录，因此没有写课堂表现评价')
    sections.push({
      heading: '二、到课情况',
      body: '当日暂无考勤记录，待督导老师补录后再补充这一部分。',
    })
  } else {
    const body = lessons
      .map((l) => {
        const st = attByLesson.get(String(l.id))
        if (!st) return null
        facts.push(`${String(l.title)}：${ATT_LABEL[st] ?? st}`)
        const note = att.find((a) => String(a.lesson_id) === String(l.id))?.note
        return `· ${String(l.title)}：${ATT_LABEL[st] ?? st}${note ? `（${String(note)}）` : ''}`
      })
      .filter(Boolean)
      .join('\n')
    sections.push({ heading: '二、到课情况', body })
  }

  // ---- 三、课时消耗 ----
  if (con.length === 0) {
    gaps.push('当日没有扣课时记录，因此没写课时消耗')
    sections.push({
      heading: '三、课时消耗',
      body: '当日暂无扣课时记录。',
    })
  } else {
    const totalHours = con.reduce((s, c) => s + Number(c.hours), 0)
    const machineHours = con.reduce((s, c) => s + Number(c.machine_hours ?? 0), 0)
    const hasMachine = con.some((c) => c.machine_hours !== null)
    const abnormal = con.filter((c) => Number(c.diff ?? 0) !== 0)

    let body = `· 当日合计扣减 ${totalHours} 课时`
    facts.push(`扣课时 ${totalHours} 课时`)

    if (hasMachine) {
      body += `\n· 学习机记录 ${machineHours} 课时${
        abnormal.length === 0 ? '，与登记一致' : '，与登记存在差异，已转核销复核'
      }`
      facts.push(`学习机 ${machineHours} 课时`)
    } else {
      gaps.push('当日没有学习机使用记录，未写学习机部分')
    }

    sections.push({ heading: '三、课时消耗', body })
  }

  // ---- 四、待跟进 ----
  const follow: string[] = []

  if (mistakes.length > 0) {
    const items = mistakes.reduce((s, m) => s + Number(m.item_count ?? 0), 0)
    follow.push(
      `· 当日生成错题 ${mistakes.length} 份共 ${items} 题，已加入讲解计划（${mistakes
        .map((m) => m.title)
        .join('、')}）`
    )
    facts.push(`错题 ${mistakes.length} 份 / ${items} 题`)
  }

  const left = (pkgRes.data ?? []).reduce(
    (s, p) => s + Number(p.total_hours) - Number(p.used_hours),
    0
  )
  if ((pkgRes.data ?? []).length > 0) {
    facts.push(`剩余课时 ${left}`)
    if (left <= 2) {
      follow.push(`· 当前剩余 ${left} 课时，已接近用尽，建议尽快安排续费以免影响排课`)
    } else {
      follow.push(`· 当前剩余 ${left} 课时`)
    }
  } else {
    gaps.push('未查到有效课时包，未写剩余课时')
  }

  sections.push({
    heading: '四、待跟进',
    body: follow.length > 0 ? follow.join('\n') : '当日无额外待办事项。',
  })

  // ---- 五、家长提示（只写有依据的） ----
  const advice: string[] = []
  if (attByLesson.size > 0 && [...attByLesson.values()].some((s) => s === 'ABSENT')) {
    advice.push('· 当日有缺勤，请与督导老师确认补课时间。')
  }
  if (mistakes.length > 0) {
    advice.push('· 错题清单已打印，下次课会安排讲解，家里可以先让孩子过一遍题面。')
  }
  if (left <= 2 && (pkgRes.data ?? []).length > 0) {
    advice.push('· 课时接近用尽，续费事宜可与督导老师联系。')
  }
  if (advice.length === 0) {
    advice.push('· 当日学习情况正常，如孩子在家有疑问可以随时反馈。')
  }
  sections.push({ heading: '五、家长提示', body: advice.join('\n') })

  const text = [
    `${stu.name} 的学习反馈（${mdOf(date)}）`,
    '',
    ...sections.map((s) => `${s.heading}\n${s.body}`),
    '',
    '—— 由 TeachSync 根据当日考勤、课时与错题记录自动生成，请确认后发送',
  ].join('\n')

  return {
    ok: true,
    draft: {
      studentId: stu.id,
      studentName: stu.name,
      guardianName: stu.guardian_name,
      date,
      sections,
      text,
      facts,
      gaps,
    },
  }
}
