/**
 * 冒烟测试：用真实账号登录 → 拼出 @supabase/ssr 的 cookie → 逐页请求
 * 用法：node scripts/smoke.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const envPath = path.join(process.cwd(), '.env.local')
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const URL_BASE = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.env.APP_BASE || 'http://localhost:3000'
const EMAIL = process.env.TEST_EMAIL || '15732002612@163.com'
const PASSWORD = process.env.TEST_PASSWORD || 'TeachSync2026'

function b64url(str) {
  return Buffer.from(str, 'utf8').toString('base64url')
}

async function login() {
  const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: ANON },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`登录失败 ${res.status}: ${JSON.stringify(data)}`)
  return data
}

function buildCookies(session) {
  const ref = new URL(URL_BASE).hostname.split('.')[0]
  const key = `sb-${ref}-auth-token`
  const raw = 'base64-' + b64url(JSON.stringify(session))
  const MAX = 3180
  const encoded = encodeURIComponent(raw)
  if (encoded.length <= MAX) return [`${key}=${raw}`]

  const out = []
  let rest = encoded
  let i = 0
  while (rest.length > 0) {
    let head = rest.slice(0, MAX)
    const lastPct = head.lastIndexOf('%')
    if (lastPct > MAX - 3) head = head.slice(0, lastPct)
    out.push(`${key}.${i}=${head}`)
    rest = rest.slice(head.length)
    i++
  }
  return out
}

const PAGES = [
  ['/today', '今日课表'],
  ['/schedule', 'sched-card'],
  ['/verify', '待核销'],
  ['/students', '学生'],
  ['/mistakes', '错题'],
  ['/attendance', '考勤'],
  ['/points', '积分'],
  ['/reports', '日报'],
  ['/tasks', '任务'],
  ['/settings', '设置'],
]

const main = async () => {
  console.log('== 1. 登录 ==')
  const session = await login()
  console.log('   ok  user=', session.user?.email, ' ref=', new URL(URL_BASE).hostname.split('.')[0])

  const cookies = buildCookies(session)
  const cookieHeader = cookies.join('; ')
  console.log('   cookie 分片数 =', cookies.length)

  console.log('== 2. 页面 ==')
  let bad = 0
  for (const [p, marker] of PAGES) {
    const res = await fetch(APP + p, { headers: { cookie: cookieHeader }, redirect: 'manual' })
    const html = res.status === 200 ? await res.text() : ''
    const hit = html.includes(marker)
    if (res.status !== 200 || !hit) bad++
    console.log(
      `   ${res.status === 200 && hit ? 'OK  ' : 'FAIL'} ${p}  status=${res.status} marker=${marker} ${hit ? '命中' : '未命中'}`
    )
  }

  console.log('== 3. API ==')
  for (const q of ['今天还有几节课', '还有多少笔待核销', '张伟还剩多少课时', '本周排课有冲突吗']) {
    const res = await fetch(APP + '/api/ai', {
      method: 'POST',
      headers: { cookie: cookieHeader, 'content-type': 'application/json' },
      body: JSON.stringify({ message: q }),
    })
    const j = await res.json().catch(() => ({}))
    console.log(`   ${res.status === 200 ? 'OK  ' : 'FAIL'} 「${q}」→ ${(j.answer || '').split('\n')[0].slice(0, 60)}`)
    if (res.status !== 200) bad++
  }

  console.log(bad === 0 ? '\n全部通过' : `\n有 ${bad} 项失败`)
  process.exit(bad === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('异常：', e.message)
  process.exit(1)
})
