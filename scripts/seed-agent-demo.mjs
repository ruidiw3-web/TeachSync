/**
 * 为 Agent 巡检补充可演示的「待办提醒」样例数据（幂等）：
 *   1. 把 2 个课时包的到期日改到 10 天后  → 触发「课时包临期」
 *   2. 造 2 条已过复习日的复习提醒        → 触发「复习逾期」
 * 只改这两个字段，不动其他业务数据。
 * 用法：node scripts/seed-agent-demo.mjs
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

const BASE = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/, '') + '/rest/v1/'
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'content-type': 'application/json' }

const get = async (p) => (await fetch(BASE + p, { headers: H })).json()
const patch = (p, body) =>
  fetch(BASE + p, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(body) })
const post = (p, body) =>
  fetch(BASE + p, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(body) })

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const plus = (days) => ymd(new Date(Date.now() + 8 * 3600e3 + days * 86400e3))

// 1. 课时包临期
const pkgs = await get('hour_packages?select=id,expire_at,status&status=eq.ACTIVE&limit=2')
for (const p of pkgs) {
  const r = await patch(`hour_packages?id=eq.${p.id}`, { expire_at: plus(10) })
  console.log(r.ok ? `课时包 ${p.id.slice(0, 8)} 到期日改为 ${plus(10)}` : `课时包更新失败 ${r.status}`)
}

// 2. 复习逾期
const existing = await get("review_reminders?select=id&status=eq.PENDING&limit=1")
if (existing.length > 0) {
  console.log('复习提醒已有待处理记录，跳过')
} else {
  const students = await get('students?select=id&status=eq.ACTIVE&limit=2')
  const rows = students.map((s, i) => ({
    student_id: s.id,
    due_date: plus(-3 - i),
    status: 'PENDING',
  }))
  const orgs = await get('orgs?select=id&limit=1')
  for (const r of rows) r.org_id = orgs[0].id
  const res = await post('review_reminders', rows)
  console.log(res.ok ? `新增 ${rows.length} 条逾期复习提醒` : `新增失败 ${res.status}`)
}
