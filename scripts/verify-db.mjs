/**
 * 数据库建表结果验证
 * 用法：node scripts/verify-db.mjs
 */
import fs from 'node:fs'

const env = Object.fromEntries(
  fs
    .readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const BASE = env.NEXT_PUBLIC_SUPABASE_URL
const SK = env.SUPABASE_SERVICE_ROLE_KEY

const TABLES = [
  'orgs', 'teachers', 'students', 'courses', 'rooms', 'hour_packages',
  'lessons', 'lesson_students', 'consumptions', 'attendance', 'mistake_sets',
  'print_tasks', 'explanations', 'review_reminders', 'point_rules', 'point_logs',
  'redeem_requests', 'daily_reports', 'sync_events', 'sync_watermarks',
  'device_bindings', 'knowledge_docs', 'ai_messages',
]

async function count(table) {
  const res = await fetch(`${BASE}/rest/v1/${table}?select=*`, {
    method: 'HEAD',
    headers: {
      apikey: SK,
      Authorization: `Bearer ${SK}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  })
  // 403 且报 permission denied → 表存在，只是没授权
  if (res.status === 403) return { ok: false, perm: true, n: 0 }
  const range = res.headers.get('content-range') // 形如 0-0/12
  if (!res.ok && !range) return { ok: false, code: res.status, n: 0 }
  const total = range?.split('/')[1]
  return { ok: true, n: total === '*' ? 0 : Number(total) }
}

let missing = []
let noPerm = []
console.log('表名'.padEnd(22) + '状态'.padEnd(10) + '行数')
console.log('-'.repeat(40))

for (const t of TABLES) {
  const r = await count(t)
  if (r.ok) {
    console.log(t.padEnd(22) + 'OK'.padEnd(10) + r.n)
  } else if (r.perm) {
    console.log(t.padEnd(22) + 'NO PERM'.padEnd(10) + '-')
    noPerm.push(t)
  } else {
    console.log(t.padEnd(22) + 'MISSING'.padEnd(10) + '-')
    missing.push(t)
  }
}

console.log('')
if (missing.length === 0 && noPerm.length === 0) {
  console.log(`全部 ${TABLES.length} 张表已就绪，权限正常`)
} else if (noPerm.length > 0) {
  console.log(`表已建好，但 ${noPerm.length} 张缺少授权`)
  console.log('→ 请在 SQL Editor 执行 supabase/0003_grants.sql')
} else {
  console.log(`缺失 ${missing.length} 张表：${missing.join(', ')}`)
  console.log('→ 请在 SQL Editor 执行 supabase/setup_all.sql')
}
