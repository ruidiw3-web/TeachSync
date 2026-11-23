import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { projectRefOf, readLocalSession } from '@/lib/session-cookie'
import { runAgentScan } from '@/lib/agent/scan'
import { buildFeedbackDraft } from '@/lib/agent/draft'

type Body = { action?: 'scan' | 'draft'; studentId?: string; date?: string }

/**
 * Agent 任务接口。
 * 鉴权走 cookie 本地解析（不额外打一次 auth），真正的数据权限由 RLS 兜底。
 */
export async function POST(req: Request) {
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: '请求格式不正确' }, { status: 400 })
  }

  const jar = await cookies()
  const local = readLocalSession(
    jar.getAll(),
    projectRefOf(process.env.NEXT_PUBLIC_SUPABASE_URL)
  )
  if (!local) {
    return NextResponse.json({ error: '登录已失效，请刷新页面重新登录' }, { status: 401 })
  }

  try {
    if (body.action === 'draft') {
      if (!body.studentId || !body.date) {
        return NextResponse.json({ error: '缺少学生或日期参数' }, { status: 400 })
      }
      const res = await buildFeedbackDraft(body.studentId, body.date)
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 422 })
      return NextResponse.json({ draft: res.draft })
    }

    const report = await runAgentScan()
    return NextResponse.json(report)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '扫描失败' },
      { status: 500 }
    )
  }
}
