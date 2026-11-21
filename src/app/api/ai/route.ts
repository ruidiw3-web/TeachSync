import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isDemo } from '@/lib/demo-flag'
import { fmtTime } from '@/lib/queries'
import { addDaysYmd, endOfDay, mondayOf, startOfDay, ymdOf } from '@/lib/time'

type Body = { message?: string }

function todayRange() {
  const iso = ymdOf(new Date())
  return { s: startOfDay(iso), e: endOfDay(iso), iso }
}

export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ answer: '请求格式不正确。' }, { status: 400 })
  }

  const q = (body.message ?? '').trim()
  if (!q) return NextResponse.json({ answer: '想问点什么？' })

  if (isDemo) {
    return NextResponse.json({
      answer: '当前处于演示模式（未连接数据库），只能查看界面结构，还没有真实数据可查。',
    })
  }

  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ answer: '登录已失效，请刷新页面重新登录。' }, { status: 401 })
    }

    // ---- 意图：待核销 ----
    if (/核销|对账|课时差异/.test(q) && !/还剩|剩余|多少课时/.test(q)) {
      const [pending, abnormal] = await Promise.all([
        supabase
          .from('consumptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING'),
        supabase
          .from('consumptions')
          .select('*', { count: 'exact', head: true })
          .in('status', ['REVIEW_NEEDED', 'IN_REVIEW']),
      ])
      return NextResponse.json({
        answer: `待核销 ${pending.count ?? 0} 笔，需要人工复核的对账异常 ${abnormal.count ?? 0} 笔。\n去「核销中心」可以勾选后一键核销，异常笔会走复核流程。`,
      })
    }

    // ---- 意图：今日课表 ----
    if (/(今天|今日).*(课|节)|课表/.test(q)) {
      const { s, e } = todayRange()
      const { data } = await supabase
        .from('lessons')
        .select('title, start_at, end_at, status, rooms(name), teachers!lessons_teacher_id_fkey(name)')
        .gte('start_at', s.toISOString())
        .lte('start_at', e.toISOString())
        .order('start_at')
      const rows = (data ?? []) as unknown as Array<{
        title: string
        start_at: string
        end_at: string
        status: string
        rooms: { name: string } | null
        teachers: { name: string } | null
      }>
      if (rows.length === 0) {
        return NextResponse.json({ answer: '今天没有排课。' })
      }
      const lines = rows.map(
        (r, i) =>
          `${i + 1}. ${fmtTime(r.start_at)}–${fmtTime(r.end_at)} ${r.title}${
            r.teachers?.name ? ` · ${r.teachers.name}` : ''
          }${r.rooms?.name ? ` · ${r.rooms.name}` : ''}${
            r.status === 'ONGOING' ? '（进行中）' : r.status === 'CONSUMED' ? '（已核销）' : ''
          }`
      )
      return NextResponse.json({ answer: `今天共 ${rows.length} 节课：\n${lines.join('\n')}` })
    }

    // ---- 意图：学生剩余课时 ----
    if (/还剩|剩余|多少课时|余额/.test(q)) {
      const { data: students } = await supabase.from('students').select('id, name').eq('status', 'ACTIVE')
      const hit = (students ?? []).find((s) => q.includes(String(s.name)))
      if (!hit) {
        return NextResponse.json({
          answer: '没有在问题里识别到学生姓名。可以说「张伟还剩多少课时」这样的问法。',
        })
      }
      const { data: pkgs } = await supabase
        .from('hour_packages')
        .select('total_hours, used_hours, status, expire_at')
        .eq('student_id', hit.id)
        .eq('status', 'ACTIVE')
      const total = (pkgs ?? []).reduce((a, p) => a + Number(p.total_hours), 0)
      const used = (pkgs ?? []).reduce((a, p) => a + Number(p.used_hours), 0)
      const left = total - used
      return NextResponse.json({
        answer: `${hit.name}：剩余 ${left} 课时（已用 ${used} / 共购入 ${total}，${(pkgs ?? []).length} 个有效课时包）。${
          left <= 4 ? '\n剩余不足 4 课时，建议提醒家长续费。' : ''
        }`,
      })
    }

    // ---- 意图：排课冲突 ----
    if (/冲突|撞课|排课/.test(q)) {
      const weekStart = mondayOf(ymdOf(new Date()))
      const monday = startOfDay(weekStart)
      const next = startOfDay(addDaysYmd(weekStart, 7))

      const { data } = await supabase
        .from('lessons')
        .select('id, title, start_at, end_at, teacher_id, room_id, teachers!lessons_teacher_id_fkey(name), rooms(name)')
        .gte('start_at', monday.toISOString())
        .lt('start_at', next.toISOString())
        .neq('status', 'CANCELLED')

      const rows = (data ?? []) as unknown as Array<{
        id: string
        title: string
        start_at: string
        end_at: string
        teacher_id: string | null
        room_id: string | null
        teachers: { name: string } | null
        rooms: { name: string } | null
      }>

      const hits: string[] = []
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          const a = rows[i]
          const b = rows[j]
          const overlap =
            new Date(a.start_at) < new Date(b.end_at) && new Date(b.start_at) < new Date(a.end_at)
          if (!overlap) continue
          if (a.teacher_id && a.teacher_id === b.teacher_id) {
            hits.push(`教师冲突：${a.teachers?.name ?? '同一教师'} · ${a.title} / ${b.title}`)
          }
          if (a.room_id && a.room_id === b.room_id) {
            hits.push(`教室冲突：${a.rooms?.name ?? '同一教室'} · ${a.title} / ${b.title}`)
          }
        }
      }
      if (hits.length === 0) {
        return NextResponse.json({
          answer: `本周 ${rows.length} 节课，没有检测到教师或教室时间冲突。`,
        })
      }
      return NextResponse.json({
        answer: `本周检测到 ${hits.length} 处冲突：\n${hits.slice(0, 8).join('\n')}`,
      })
    }

    // ---- 意图：日报 ----
    if (/日报/.test(q)) {
      const { count } = await supabase
        .from('daily_reports')
        .select('*', { count: 'exact', head: true })
        .in('status', ['DRAFT', 'PENDING'])
      return NextResponse.json({
        answer: `有 ${count ?? 0} 份日报还是草稿/待提交状态。去「日报中心」确认内容后即可推送家长。`,
      })
    }

    // ---- 意图：错题 / 打印 ----
    if (/错题|打印|复习/.test(q)) {
      const { iso } = todayRange()
      const [prints, overdue] = await Promise.all([
        supabase
          .from('print_tasks')
          .select('*', { count: 'exact', head: true })
          .in('status', ['PENDING', 'PRINTED_UNTAUGHT', 'ESCALATED']),
        supabase
          .from('review_reminders')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING')
          .lt('due_date', iso),
      ])
      return NextResponse.json({
        answer: `错题讲解待处理 ${prints.count ?? 0} 份，已逾期未复习 ${overdue.count ?? 0} 条。\n逾期复习建议优先安排，复习周期拖长会明显降低留存。`,
      })
    }

    // ---- 兜底 ----
    return NextResponse.json({
      answer:
        '我目前能可靠回答这几类问题：\n· 今天/今日课表\n· 待核销与对账异常笔数\n· 某学生剩余课时\n· 本周排课冲突\n· 日报待提交份数\n· 错题打印与逾期复习\n\n换个说法再问一次试试。',
    })
  } catch {
    return NextResponse.json(
      { answer: '查询数据库时出错，暂时拿不到数据。请稍后重试。' },
      { status: 500 }
    )
  }
}
