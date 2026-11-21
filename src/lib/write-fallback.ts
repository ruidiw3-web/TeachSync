import type { SupabaseClient } from '@supabase/supabase-js'

export type WriteResult = {
  ok: boolean
  message: string
  code?: string
  hours?: number
  conflicts?: string[]
}

/**
 * 补偿式核销（数据库没装 fn_verify_consumption 时使用）
 * 关键点：状态翻转带 `status = PENDING` 守卫，保证同一笔只被成功核销一次；
 * 扣课时中途失败会把已扣的量和核销状态一起回滚。
 */
export async function verifyBySteps(
  supabase: SupabaseClient,
  id: string,
  actorId: string | null
): Promise<WriteResult> {
  const { data: c, error } = await supabase
    .from('consumptions')
    .select('id, org_id, student_id, hours, status')
    .eq('id', id)
    .maybeSingle()

  if (error) return { ok: false, message: `读取核销记录失败：${error.message}` }
  if (!c) return { ok: false, message: '核销记录不存在', code: 'NOT_FOUND' }
  if (c.status !== 'PENDING') {
    return { ok: false, message: '该记录已被处理，请刷新页面', code: 'BAD_STATE' }
  }

  const need = Number(c.hours)

  const { data: pkgs, error: pkErr } = await supabase
    .from('hour_packages')
    .select('id, total_hours, used_hours, expire_at')
    .eq('student_id', c.student_id)
    .eq('status', 'ACTIVE')
    .order('expire_at', { ascending: true, nullsFirst: false })

  if (pkErr) return { ok: false, message: `读取课时包失败：${pkErr.message}` }

  const have = (pkgs ?? []).reduce((a, p) => a + (Number(p.total_hours) - Number(p.used_hours)), 0)
  if (have < need) {
    return {
      ok: false,
      message: `课时不足：本次需 ${need}，账户可用 ${have}`,
      code: 'NO_HOURS',
    }
  }

  // 抢占状态：只有仍是 PENDING 才会更新成功
  const { data: flipped, error: flipErr } = await supabase
    .from('consumptions')
    .update({ status: 'VERIFIED', reviewed_by: actorId })
    .eq('id', id)
    .eq('status', 'PENDING')
    .select('id')

  if (flipErr) return { ok: false, message: `核销失败：${flipErr.message}` }
  if (!flipped || flipped.length === 0) {
    return { ok: false, message: '这笔已被其他人核销，请刷新', code: 'BAD_STATE' }
  }

  // 按到期时间先后扣减
  let left = need
  const done: Array<{ id: string; add: number; full: boolean }> = []

  for (const p of pkgs ?? []) {
    if (left <= 0) break
    const avail = Number(p.total_hours) - Number(p.used_hours)
    if (avail <= 0) continue
    const take = Math.min(left, avail)
    const nextUsed = Number(p.used_hours) + take
    const full = nextUsed >= Number(p.total_hours)

    const { error: upErr } = await supabase
      .from('hour_packages')
      .update({ used_hours: nextUsed, status: full ? 'EXHAUSTED' : 'ACTIVE' })
      .eq('id', p.id)

    if (upErr) {
      // 回滚已扣的课时与核销状态
      for (const d of done) {
        await supabase
          .from('hour_packages')
          .update({ used_hours: Number(d.add), status: 'ACTIVE' })
          .eq('id', d.id)
      }
      await supabase.from('consumptions').update({ status: 'PENDING', reviewed_by: null }).eq('id', id)
      return { ok: false, message: `扣减课时失败，已回滚：${upErr.message}` }
    }

    done.push({ id: p.id, add: Number(p.used_hours), full })
    left -= take
  }

  if (left > 0) {
    // 理论上不会发生（前面已校验），保险起见回滚
    for (const d of done) {
      await supabase
        .from('hour_packages')
        .update({ used_hours: Number(d.add), status: 'ACTIVE' })
        .eq('id', d.id)
    }
    await supabase.from('consumptions').update({ status: 'PENDING', reviewed_by: null }).eq('id', id)
    return { ok: false, message: '课时扣减不完整，已回滚', code: 'NO_HOURS' }
  }

  return { ok: true, message: `已核销 ${need} 课时`, hours: need }
}

/** 补偿式复核结算（对应 fn_resolve_consumption 的降级路径） */
export async function resolveBySteps(
  supabase: SupabaseClient,
  id: string,
  actorId: string | null,
  finalHours: number,
  note: string | null
): Promise<WriteResult> {
  const { data: c, error } = await supabase
    .from('consumptions')
    .select('id, student_id, hours, machine_hours, status')
    .eq('id', id)
    .maybeSingle()

  if (error) return { ok: false, message: `读取核销记录失败：${error.message}` }
  if (!c) return { ok: false, message: '核销记录不存在', code: 'NOT_FOUND' }
  if (c.status !== 'REVIEW_NEEDED' && c.status !== 'IN_REVIEW') {
    return { ok: false, message: '该记录不在待复核状态，请刷新页面', code: 'BAD_STATE' }
  }
  if (!Number.isFinite(finalHours) || finalHours <= 0) {
    return { ok: false, message: '结算课时必须大于 0', code: 'BAD_INPUT' }
  }

  const { data: pkgs, error: pkErr } = await supabase
    .from('hour_packages')
    .select('id, total_hours, used_hours')
    .eq('student_id', c.student_id)
    .eq('status', 'ACTIVE')
    .order('expire_at', { ascending: true, nullsFirst: false })

  if (pkErr) return { ok: false, message: `读取课时包失败：${pkErr.message}` }

  const have = (pkgs ?? []).reduce((a, p) => a + (Number(p.total_hours) - Number(p.used_hours)), 0)
  if (have < finalHours) {
    return {
      ok: false,
      message: `课时不足：本次需 ${finalHours}，账户可用 ${have}`,
      code: 'NO_HOURS',
    }
  }

  const { data: flipped, error: upErr } = await supabase
    .from('consumptions')
    .update({
      status: 'RESOLVED',
      hours: finalHours,
      review_note: note,
      resolved_by: actorId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', ['REVIEW_NEEDED', 'IN_REVIEW'])
    .select('id')

  if (upErr) return { ok: false, message: `复核失败：${upErr.message}` }
  if (!flipped || flipped.length === 0) {
    return { ok: false, message: '这笔已被其他人处理，请刷新', code: 'BAD_STATE' }
  }

  let left = finalHours
  const done: Array<{ id: string; before: number; full: boolean }> = []

  for (const p of pkgs ?? []) {
    if (left <= 0) break
    const avail = Number(p.total_hours) - Number(p.used_hours)
    if (avail <= 0) continue
    const take = Math.min(left, avail)
    const nextUsed = Number(p.used_hours) + take
    const full = nextUsed >= Number(p.total_hours)

    const { error: e2 } = await supabase
      .from('hour_packages')
      .update({ used_hours: nextUsed, status: full ? 'EXHAUSTED' : 'ACTIVE' })
      .eq('id', p.id)

    if (e2) {
      for (const d of done) {
        await supabase
          .from('hour_packages')
          .update({ used_hours: d.before, status: 'ACTIVE' })
          .eq('id', d.id)
      }
      await supabase
        .from('consumptions')
        .update({ status: 'REVIEW_NEEDED', resolved_by: null, resolved_at: null })
        .eq('id', id)
      return { ok: false, message: `扣减课时失败，已回滚：${e2.message}` }
    }

    done.push({ id: p.id, before: Number(p.used_hours), full })
    left -= take
  }

  return { ok: true, message: `复核完成，已按 ${finalHours} 课时结算`, hours: finalHours }
}
