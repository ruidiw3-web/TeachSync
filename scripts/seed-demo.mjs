/**
 * 插入今日演示数据（课次 / 核销 / 打印 / 日报）
 * 用法：node scripts/seed-demo.mjs
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
const H = {
  apikey: SK,
  Authorization: `Bearer ${SK}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

async function q(path, opts = {}) {
  const res = await fetch(`${BASE}/rest/v1/${path}`, { headers: H, ...opts })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${text}`)
  return text ? JSON.parse(text) : null
}

// 取基础数据
const [org] = await q('orgs?select=id')
const teachers = await q('teachers?select=id&limit=1')
const courses = await q('courses?select=id,name,subject,kind')
const rooms = await q('rooms?select=id,name')
const students = await q('students?select=id,name&order=name')

if (!org || !teachers.length) {
  console.error('缺少 org 或 teacher，请先建账号')
  process.exit(1)
}

const teacherId = teachers[0].id
const orgId = org.id

// 今日 6 节课（与原型课表对应）
const today = new Date()
today.setHours(0, 0, 0, 0)

const at = (h, m) => {
  const d = new Date(today)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

const plan = [
  { c: 0, start: [8, 30], end: [10, 0], room: 0, status: 'FINISHED', title: '初三数学 · 冲刺A班' },
  { c: 1, start: [10, 15], end: [11, 45], room: 1, status: 'FINISHED', title: '高一物理 · 力学专题' },
  { c: 2, start: [13, 30], end: [15, 0], room: 0, status: 'FINISHED', title: '初三英语 · 语法精讲' },
  { c: 3, start: [15, 30], end: [17, 0], room: 0, status: 'SCHEDULED', title: '初二数学 · 几何证明' },
  { c: 4, start: [18, 0], end: [19, 30], room: 2, status: 'SCHEDULED', title: '一对一 · 初二数学' },
  { c: 0, start: [19, 30], end: [21, 0], room: 1, status: 'SCHEDULED', title: '初三数学 · 晚间加练' },
]

const existing = await q(
  `lessons?select=id&org_id=eq.${orgId}&start_at=gte.${today.toISOString()}`
)
if (existing?.length) {
  console.log(`今日已有 ${existing.length} 节课，跳过课次插入`)
} else {
  const rows = plan.map((p) => ({
    org_id: orgId,
    course_id: courses[p.c]?.id,
    teacher_id: teacherId,
    room_id: rooms[p.room]?.id,
    title: p.title,
    subject: courses[p.c]?.subject,
    start_at: at(...p.start),
    end_at: at(...p.end),
    hours: 1,
    status: p.status,
    created_by: teacherId,
  }))
  const inserted = await q('lessons', {
    method: 'POST',
    body: JSON.stringify(rows),
  })
  console.log(`插入课次 ${inserted.length} 条`)
}

// 待核销（含 3 条对账异常）
const lessons = await q(
  `lessons?select=id,title,start_at&org_id=eq.${orgId}&start_at=gte.${today.toISOString()}&order=start_at`
)
const cons = await q(`consumptions?select=id&org_id=eq.${orgId}`)
if (!cons?.length) {
  const rows = []
  lessons.forEach((l, li) => {
    const n = li < 3 ? 4 : 2
    for (let i = 0; i < n; i++) {
      const s = students[(li * 4 + i) % students.length]
      const abnormal = li < 1 && i < 3
      rows.push({
        org_id: orgId,
        lesson_id: l.id,
        student_id: s.id,
        hours: 1,
        machine_hours: abnormal ? 1.5 : 1,
        status: abnormal ? 'REVIEW_NEEDED' : 'PENDING',
      })
    }
  })
  const inserted = await q('consumptions', {
    method: 'POST',
    body: JSON.stringify(rows),
  })
  console.log(`插入核销 ${inserted.length} 条（含 3 条对账异常）`)
} else {
  console.log(`已有核销 ${cons.length} 条，跳过`)
}

// 错题集 + 打印任务
const sets = await q(`mistake_sets?select=id&org_id=eq.${orgId}`)
if (!sets?.length) {
  const subjects = ['数学', '物理', '英语']
  const setRows = students.slice(0, 5).map((s, i) => ({
    org_id: orgId,
    student_id: s.id,
    subject: subjects[i % 3],
    title: `${subjects[i % 3]}错题集 · 第${i + 1}单元`,
    item_count: 6 + i * 2,
    source: 'MACHINE',
  }))
  const insertedSets = await q('mistake_sets', {
    method: 'POST',
    body: JSON.stringify(setRows),
  })
  const taskRows = insertedSets.map((s, i) => ({
    org_id: orgId,
    student_id: s.student_id,
    mistake_set_id: s.id,
    status: i === 0 ? 'ESCALATED' : i < 2 ? 'PRINTED_UNTAUGHT' : 'PENDING',
    due_at: new Date(today.getTime() + 24 * 3600 * 1000).toISOString(),
  }))
  const insertedTasks = await q('print_tasks', {
    method: 'POST',
    body: JSON.stringify(taskRows),
  })
  console.log(`插入错题集 ${insertedSets.length} 份、打印任务 ${insertedTasks.length} 条`)
} else {
  console.log(`已有错题集 ${sets.length} 份，跳过`)
}

// 日报草稿
const reports = await q(`daily_reports?select=id&org_id=eq.${orgId}`)
if (!reports?.length) {
  const dateStr = today.toISOString().slice(0, 10)
  const rows = students.slice(0, 3).map((s) => ({
    org_id: orgId,
    student_id: s.id,
    report_date: dateStr,
    status: 'PENDING',
    content: {
      attendance: '准时到课，全程专注',
      progress: '完成本单元 3 个知识点练习',
      mistakes: '二次函数图像平移仍有混淆',
      homework: '课后 5 题，已布置',
      suggestion: '建议本周加强图像变换的专项练习',
    },
  }))
  const inserted = await q('daily_reports', {
    method: 'POST',
    body: JSON.stringify(rows),
  })
  console.log(`插入日报草稿 ${inserted.length} 条`)
} else {
  console.log(`已有日报 ${reports.length} 条，跳过`)
}

console.log('\n演示数据准备完成')
