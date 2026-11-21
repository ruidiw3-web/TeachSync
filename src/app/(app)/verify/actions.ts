'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, isDemo } from '@/lib/session'
import { can } from '@/lib/permissions'
import { resolveBySteps, verifyBySteps } from '@/lib/write-fallback'

export type ActionResult = { ok: boolean; message: string; code?: string }

export type BatchResult = {
  ok: boolean
  message: string
  succeeded: number
  failed: Array<{ id: string; message: string }>
}

type RpcRow = { ok?: boolean; code?: string; message?: string; hours?: number; conflicts?: string[] }

function normalize(raw: unknown, fallback: string): ActionResult {
  const r = (raw ?? {}) as RpcRow
  return { ok: r.ok === true, message: r.message || fallback, code: r.code }
}

/** 单笔核销：PENDING → VERIFIED 并扣减课时包 */
export async function verifyConsumption(id: string): Promise<ActionResult> {
  if (isDemo) return { ok: false, message: '演示模式不支持写入' }
  if (!id) return { ok: false, message: '缺少核销记录 ID' }

  const user = await getCurrentUser()
  if (!user) return { ok: false, message: '登录已失效，请重新登录' }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('fn_verify_consumption', { p_id: id })

    // 42883 = 函数不存在，走补偿式写入
    if (error && error.code === '42883') {
      const fb = await verifyBySteps(supabase, id, user.staffId)
      if (fb.ok) {
        revalidatePath('/verify')
        revalidatePath('/today')
      }
      return { ok: fb.ok, message: fb.message, code: fb.code }
    }
    if (error) return { ok: false, message: `核销失败：${error.message}` }

    const res = normalize(data, '核销失败')
    if (res.ok) {
      revalidatePath('/verify')
      revalidatePath('/today')
    }
    return res
  } catch {
    return { ok: false, message: '网络异常，核销未提交成功，请重试' }
  }
}

/** 批量核销：逐笔提交，失败项回传原因，成功的照常入账 */
export async function verifyBatch(ids: string[]): Promise<BatchResult> {
  if (isDemo) return { ok: false, message: '演示模式不支持写入', succeeded: 0, failed: [] }
  const list = [...new Set(ids)].filter(Boolean)
  if (list.length === 0) {
    return { ok: false, message: '请先勾选要核销的记录', succeeded: 0, failed: [] }
  }

  let succeeded = 0
  const failed: Array<{ id: string; message: string }> = []

  for (const id of list) {
    const r = await verifyConsumption(id)
    if (r.ok) succeeded += 1
    else failed.push({ id, message: r.message })
  }

  revalidatePath('/verify')
  revalidatePath('/today')

  if (failed.length === 0) {
    return { ok: true, message: `已核销 ${succeeded} 笔`, succeeded, failed }
  }
  if (succeeded === 0) {
    return { ok: false, message: failed[0]?.message ?? '核销失败', succeeded, failed }
  }
  return {
    ok: true,
    message: `成功 ${succeeded} 笔，失败 ${failed.length} 笔：${failed[0].message}`,
    succeeded,
    failed,
  }
}

/** 复核结算：REVIEW_NEEDED / IN_REVIEW → RESOLVED，仅教务及以上 */
export async function resolveConsumption(input: {
  id: string
  note?: string
  hours?: number | null
}): Promise<ActionResult> {
  if (isDemo) return { ok: false, message: '演示模式不支持写入' }
  if (!input?.id) return { ok: false, message: '缺少核销记录 ID' }

  const user = await getCurrentUser()
  if (!user) return { ok: false, message: '登录已失效，请重新登录' }
  if (!can(user.roles, 'verify:correct')) {
    return { ok: false, message: '只有教务或负责人可以复核对账异常' }
  }

  const rawHours = input.hours
  const hours =
    rawHours === null || rawHours === undefined || Number.isNaN(Number(rawHours))
      ? null
      : Number(rawHours)
  if (hours !== null && hours <= 0) {
    return { ok: false, message: '结算课时必须大于 0' }
  }

  try {
    const supabase = await createClient()

    if (hours === null) {
      return { ok: false, message: '请填写本次结算课时' }
    }

    const { data, error } = await supabase.rpc('fn_resolve_consumption', {
      p_id: input.id,
      p_note: input.note?.trim() || null,
      p_hours: hours,
      p_machine_hours: null,
    })

    if (error && error.code === '42883') {
      const fb = await resolveBySteps(
        supabase,
        input.id,
        user.staffId,
        hours,
        input.note?.trim() || null
      )
      if (fb.ok) {
        revalidatePath('/verify')
        revalidatePath('/today')
      }
      return { ok: fb.ok, message: fb.message, code: fb.code }
    }
    if (error) return { ok: false, message: `复核失败：${error.message}` }

    const res = normalize(data, '复核失败')
    if (res.ok) {
      revalidatePath('/verify')
      revalidatePath('/today')
    }
    return res
  } catch {
    return { ok: false, message: '网络异常，复核未提交成功，请重试' }
  }
}
