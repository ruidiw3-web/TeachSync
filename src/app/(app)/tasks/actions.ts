'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/session'

/**
 * 把 Agent 生成的反馈草稿落成 daily_reports 的 DRAFT。
 * 同一学生同一天只保留一份（表上有 unique(student_id, report_date)）。
 */
export async function saveDraftToReport(
  studentId: string,
  date: string,
  text: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: '登录已失效，请刷新页面重新登录。' }

  const supabase = await createClient()
  const { error } = await supabase.from('daily_reports').upsert(
    {
      org_id: user.orgId,
      student_id: studentId,
      report_date: date,
      content: { text, source: 'AGENT_DRAFT' },
      status: 'DRAFT',
    },
    { onConflict: 'student_id,report_date' }
  )

  if (error) return { ok: false, error: `保存失败：${error.message}` }

  revalidatePath('/tasks')
  revalidatePath('/reports')
  return { ok: true }
}
