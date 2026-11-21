/**
 * 补齐本周与下周的课次，并把今天已过时段的课次收口为已完成。
 * 幂等：同一 teacher + start_at 已存在的课次会跳过。
 * 用法：node scripts/seed-week.mjs
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

const BASE = env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/'
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
const H = {
  apikey: KEY,
  Authorization: 'Bearer ' + KEY,
  'content-type': 'application/json',
  Prefer: 'return=representation',
}

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const at = (d, hm) => {
  const [h, m] = hm.split(':').map(Number)
  const t = new Date(d)
  t.setHours(h, m, 0, 0)
  return t
}

async function get(table, qs = 'select=*') {
  const r = await fetch(`${BASE}${table}?${qs}`, { headers: H })
  if (!r.ok) throw new Error(`${table} 读取失败 ${r.status} ${await r.text()}`)
  return r.json()
}

async function post(table, body) {
  const r = await fetch(BASE + table, { method: 'POST', headers: H, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`${table} 写入失败 ${r.status} ${await r.text()}`)
  return r.json()
}

async function patch(table, qs, body) {
  const r = await fetch(`${BASE}${table}?${qs}`, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`${table} 更新失败 ${r.status} ${await r.text()}`)
  return r.json()
}

const PLAN = [
  // 本周日
  { date: 'SUN', time: '08:30', hours: 1.5, course: '初三数学 · 冲刺B班', room: '301 教室', students: 7 },
  { date: 'SUN', time: '10:15', hours: 1.5, course: '初二数学 · 几何证明', room: '205 教室', students: 6 },
  { date: 'SUN', time: '13:30', hours: 1.5, course: '初三英语 · 语法精讲', room: '301 教室', students: 9 },
  { date: 'SUN', time: '15:30', hours: 1.5, course: '一对一 · 初二数学', room: '102 教室', students: 1 },
  { date: 'SUN', time: '18:30', hours: 1.5, course: '高一物理 · 力学专题', room: '205 教室', students: 6 },
  // 下周
  { date: 'MON', time: '18:30', hours: 1.5, course: '初三数学 · 晚间加练', room: '301 教室', students: 5 },
  { date: 'TUE', time: '18:30', hours: 1.5, course: '初二数学 · 几何证明', room: '205 教室', students: 6 },
  { date: 'WED', time: '10:15', hours: 1.5, course: '高一物理 · 力学专题', room: '205 教室', students: 6 },
  { date: 'WED', time: '13:30', hours: 1.5, course: '初三英语 · 语法精讲', room: '301 教室', students: 9 },
  { date: 'THU', time: '15:30', hours: 1.5, course: '一对一 · 初二数学', room: '102 教室', students: 1 },
  { date: 'FRI', time: '18:30', hours: 1.5, course: '初三数学 · 冲刺A班', room: '301 教室', students: 8 },
  { date: 'NEXT_SAT', time: '08:30', hours: 1.5, course: '初三数学 · 冲刺B班', room: '301 教室', students: 7 },
  { date: 'NEXT_SAT', time: '10:15', hours: 1.5, course: '初二数学 · 几何证明', room: '205 教室', students: 6 },
]

function targetDate(tag, today) {
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const map = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 }
  if (tag === 'NEXT_SAT') {
    const d = new Date(monday)
    d.setDate(monday.getDate() + 12)
    return d
  }
  const d = new Date(monday)
  d.setDate(monday.getDate() + map[tag])
  return d
}

const main = async () => {
  const today = new Date()
  const courses = await get('courses', 'select=id,name')
  const teachers = await get('teachers', 'select=id,name&active=eq.true')
  const rooms = await get('rooms', 'select=id,name')
  const students = await get('students', 'select=id,name&status=eq.ACTIVE&order=name')
  const orgId = (await get('orgs', 'select=id&limit=1'))[0]?.id

  if (!orgId || teachers.length === 0) throw new Error('缺少 org 或 teacher，先跑基础 seed')
  const teacher = teachers[0]
  console.log(`机构 ${orgId.slice(0, 8)} · 教师 ${teacher.name} · 学生 ${students.length} 人`)

  const pick = (name) => courses.find((c) => c.name === name)
  const room = (name) => rooms.find((r) => r.name === name)

  // 1. 今天已过时段的课次收口
  const tStart = new Date(today)
  tStart.setHours(0, 0, 0, 0)
  const tEnd = new Date(today)
  tEnd.setHours(23, 59, 59, 999)
  const todayLessons = await get(
    'lessons',
    `select=id,title,start_at,end_at,status&start_at=gte.${tStart.toISOString()}&start_at=lte.${tEnd.toISOString()}&order=start_at`
  )
  const now = new Date()
  let fixed = 0
  for (const l of todayLessons) {
    const s = new Date(l.start_at)
    const e = new Date(l.end_at)
    let next = l.status
    if (e <= now) next = 'FINISHED'
    else if (s <= now && now < e) next = 'ONGOING'
    else next = 'SCHEDULED'
    if (next !== l.status) {
      await patch('lessons', `id=eq.${l.id}`, { status: next })
      fixed++
    }
  }
  console.log(`今日课次状态校正 ${fixed} 条 / 共 ${todayLessons.length} 条`)

  // 2. 补齐课次
  let created = 0
  let skipped = 0
  for (const p of PLAN) {
    const d = targetDate(p.date, today)
    const start = at(d, p.time)
    const end = new Date(start.getTime() + p.hours * 3600 * 1000)
    const exists = await get(
      'lessons',
      `select=id&teacher_id=eq.${teacher.id}&start_at=eq.${start.toISOString()}`
    )
    if (exists.length > 0) {
      skipped++
      continue
    }
    const course = pick(p.course)
    const rm = room(p.room)
    const [lesson] = await post('lessons', {
      org_id: orgId,
      course_id: course?.id ?? null,
      teacher_id: teacher.id,
      room_id: rm?.id ?? null,
      title: p.course,
      subject: course?.name?.split(' · ')[0] ?? null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      hours: p.hours,
      status: 'SCHEDULED',
    })

    const chosen = students.slice(0, p.students)
    if (chosen.length > 0) {
      await post(
        'lesson_students',
        chosen.map((s) => ({ lesson_id: lesson.id, student_id: s.id, org_id: orgId }))
      )
    }
    created++
    console.log(
      `  + ${ymd(d)} ${p.time} ${p.course} · ${rm?.name ?? '未安排'} · ${chosen.length}人`
    )
  }

  console.log(`新增 ${created} 条，跳过 ${skipped} 条`)
}

main().catch((e) => {
  console.error('失败：', e.message)
  process.exit(1)
})
