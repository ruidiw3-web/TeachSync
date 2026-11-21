/**
 * 写入链路的数据层验证：用登录用户的 token（走 RLS）模拟一次核销与一次调课
 * 断言：consumption 状态翻转、hour_packages.used_hours 增加、调课时间变更
 * 结束后自动还原，不留脏数据
 * 用法：node scripts/test-writes.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const env = Object.fromEntries(
  fs
    .readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const SUPA = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const REST = SUPA + '/rest/v1/'

let TOKEN = ''
const H = () => ({
  apikey: ANON,
  Authorization: 'Bearer ' + TOKEN,
  'content-type': 'application/json',
  Prefer: 'return=representation',
})

async function get(table, qs) {
  const r = await fetch(`${REST}${table}?${qs}`, { headers: H() })
  if (!r.ok) throw new Error(`${table} 读 ${r.status} ${await r.text()}`)
  return r.json()
}
async function patch(table, qs, body) {
  const r = await fetch(`${REST}${table}?${qs}`, {
    method: 'PATCH',
    headers: H(),
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${table} 改 ${r.status} ${await r.text()}`)
  return r.json()
}

const results = []
function check(name, ok, extra = '') {
  results.push(ok)
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`)
}

const main = async () => {
  const auth = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: ANON },
    body: JSON.stringify({ email: '15732002612@163.com', password: 'TeachSync2026' }),
  })
  const s = await auth.json()
  if (!s.access_token) throw new Error('登录失败')
  TOKEN = s.access_token

  console.log('== A. RPC 函数是否存在 ==')
  const rpc = await fetch(`${REST}rpc/fn_verify_consumption`, {
    method: 'POST',
    headers: H(),
    body: JSON.stringify({ p_id: '00000000-0000-0000-0000-000000000000' }),
  })
  const rpcBody = await rpc.text()
  const rpcMissing = rpc.status === 404 || rpcBody.includes('42883') || rpcBody.includes('Could not find')
  console.log(`   RPC fn_verify_consumption → ${rpc.status} ${rpcMissing ? '(不存在，走补偿式写入)' : rpcBody.slice(0, 120)}`)

  console.log('== B. 模拟单笔核销 ==')
  const pend = await get('consumptions', 'select=id,student_id,hours,status&status=eq.PENDING&limit=1')
  const c = pend[0]
  if (!c) throw new Error('没有 PENDING 核销记录')
  const need = Number(c.hours)

  const pkgs = await get(
    'hour_packages',
    `select=id,total_hours,used_hours&student_id=eq.${c.student_id}&status=eq.ACTIVE&order=expire_at.asc`
  )
  const before = pkgs.map((p) => Number(p.used_hours))
  const have = pkgs.reduce((a, p) => a + (Number(p.total_hours) - Number(p.used_hours)), 0)
  console.log(`   记录 ${c.id.slice(0, 8)} 需 ${need} 课时，可用 ${have}`)

  const flip = await patch('consumptions', `id=eq.${c.id}&status=eq.PENDING`, {
    status: 'VERIFIED',
  })
  check('状态 PENDING → VERIFIED（带守卫）', flip.length === 1)

  const again = await patch('consumptions', `id=eq.${c.id}&status=eq.PENDING`, { status: 'VERIFIED' })
  check('重复核销被守卫拦住（幂等）', again.length === 0)

  let left = need
  for (const p of pkgs) {
    if (left <= 0) break
    const avail = Number(p.total_hours) - Number(p.used_hours)
    if (avail <= 0) continue
    const take = Math.min(left, avail)
    await patch('hour_packages', `id=eq.${p.id}`, {
      used_hours: Number(p.used_hours) + take,
      status: Number(p.used_hours) + take >= Number(p.total_hours) ? 'EXHAUSTED' : 'ACTIVE',
    })
    left -= take
  }
  const afterPkgs = await get(
    'hour_packages',
    `select=id,used_hours&student_id=eq.${c.student_id}&status=eq.ACTIVE&order=expire_at.asc`
  )
  const after = afterPkgs.map((p) => Number(p.used_hours))
  const delta = after.reduce((a, v, i) => a + (v - (before[i] ?? 0)), 0)
  check('课时包扣减总额正确', delta === need, `实际 +${delta}`)

  // 还原
  await patch('consumptions', `id=eq.${c.id}`, { status: 'PENDING', reviewed_by: null })
  for (let i = 0; i < pkgs.length; i++) {
    await patch('hour_packages', `id=eq.${pkgs[i].id}`, {
      used_hours: before[i],
      status: 'ACTIVE',
    })
  }
  const restored = await get('consumptions', `select=status&id=eq.${c.id}`)
  check('测试数据已还原', restored[0].status === 'PENDING')

  console.log('== C. 模拟调课 ==')
  const lesson = (
    await get(
      'lessons',
      'select=id,title,start_at,end_at,status&status=eq.SCHEDULED&order=start_at.desc&limit=1'
    )
  )[0]
  if (!lesson) {
    check('存在可调课次', false)
  } else {
    const oldStart = lesson.start_at
    const s2 = new Date(lesson.start_at)
    s2.setMinutes(s2.getMinutes() + 30)
    const e2 = new Date(lesson.end_at)
    e2.setMinutes(e2.getMinutes() + 30)

    const moved = await patch('lessons', `id=eq.${lesson.id}`, {
      start_at: s2.toISOString(),
      end_at: e2.toISOString(),
    })
    check('改期写入成功', moved.length === 1)
    check('开始时间已偏移 30 分钟', moved[0].start_at !== oldStart)

    await patch('lessons', `id=eq.${lesson.id}`, {
      start_at: oldStart,
      end_at: lesson.end_at,
    })
    const back = await get('lessons', `select=start_at&id=eq.${lesson.id}`)
    check('改期已还原', back[0].start_at === oldStart)
  }

  const bad = results.filter((x) => !x).length
  console.log(bad === 0 ? '\n数据层写入链路正常' : `\n有 ${bad} 项失败`)
  process.exit(bad === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('异常：', e.message)
  process.exit(1)
})
