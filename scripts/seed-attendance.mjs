/**
 * 给已结课（FINISHED / CONSUMED）的课次补考勤记录。
 * 幂等：按 (lesson_id, student_id) 去重，已有记录不覆盖。
 * 用法：node scripts/seed-attendance.mjs
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
const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'content-type': 'application/json',
}

const get = async (p) => {
  const r = await fetch(BASE + p, { headers: H })
  if (!r.ok) throw new Error(`${p} → ${r.status} ${await r.text()}`)
  return r.json()
}

/** 稳定的伪随机：同一条课次+学生永远得到同一个结果 */
function pick(key) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  const n = h % 100
  if (n < 85) return 'PRESENT'
  if (n < 95) return 'LATE'
  if (n < 98) return 'LEAVE'
  return 'ABSENT'
}

const lessons = await get(
  'lessons?select=id,start_at,status,lesson_students(student_id)&status=in.(FINISHED,CONSUMED)&order=start_at.asc'
)

const existing = await get('attendance?select=lesson_id,student_id')
const have = new Set(existing.map((a) => `${a.lesson_id}|${a.student_id}`))

const rows = []
for (const l of lessons) {
  for (const ls of l.lesson_students ?? []) {
    const k = `${l.id}|${ls.student_id}`
    if (have.has(k)) continue
    const status = pick(k)
    const start = new Date(l.start_at).getTime()
    rows.push({
      lesson_id: l.id,
      student_id: ls.student_id,
      status,
      check_in_at:
        status === 'PRESENT'
          ? new Date(start).toISOString()
          : status === 'LATE'
            ? new Date(start + 12 * 60_000).toISOString()
            : null,
      check_out_at:
        status === 'PRESENT' || status === 'LATE'
          ? new Date(start + 90 * 60_000).toISOString()
          : null,
      note: status === 'ABSENT' ? '未到，家长已说明' : status === 'LEAVE' ? '提前请假' : null,
    })
  }
}

if (rows.length === 0) {
  console.log('考勤已完整，无需补录')
  process.exit(0)
}

// org_id 由 RLS 默认值不生效，这里显式带上
const orgs = await get('orgs?select=id&limit=1')
for (const r of rows) r.org_id = orgs[0].id

const res = await fetch(BASE + 'attendance', {
  method: 'POST',
  headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify(rows),
})
if (!res.ok) {
  console.error('写入失败:', res.status, (await res.text()).slice(0, 300))
  process.exit(1)
}

const tally = rows.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {})
console.log(`补录考勤 ${rows.length} 条：`, tally)
