import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()]}))
const U=env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/rest\/v1\/?$/,''), A=env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const auth = createClient(U, A)
const { data: s, error: se } = await auth.auth.signInWithPassword({ email:'demo@teachsync.app', password:'TeachSyncDemo2026' })
if (se) { console.error('登录失败', se.message); process.exit(1) }
const sb = createClient(U, A, { global: { headers: { Authorization: `Bearer ${s.session.access_token}` } }, auth: { persistSession:false } })
const pad=n=>String(n).padStart(2,'0')
const today = new Date(Date.now()+8*3600e3).toISOString().slice(0,10)
const dayFrom=`${today}T00:00:00+08:00`, dayTo=`${today}T23:59:59+08:00`
const tests = {
  consumptions: () => sb.from('consumptions').select('id, status, hours, machine_hours, diff, created_at, student_id, students(name), lessons(title)').in('status',['PENDING','REVIEW_NEEDED','IN_REVIEW']).limit(5),
  print_tasks: () => sb.from('print_tasks').select('id, status, created_at, printed_at, due_at, students(name), mistake_sets(title, item_count)').limit(5),
  hour_packages: () => sb.from('hour_packages').select('id, total_hours, used_hours, expire_at, student_id, students(name), courses(name)').eq('status','ACTIVE').limit(5),
  lessons_week: () => sb.from('lessons').select('id, title, start_at, end_at, teacher_id, room_id, teachers!lessons_teacher_id_fkey(name), rooms(name)').neq('status','CANCELLED').limit(5),
  lessons_today: () => sb.from('lessons').select('id, title, status, start_at, lesson_students(student_id, students(name))').gte('start_at',dayFrom).lte('start_at',dayTo).limit(5),
  daily_reports: () => sb.from('daily_reports').select('student_id').eq('report_date',today).limit(5),
  review_reminders: () => sb.from('review_reminders').select('id, due_date, students(name)').eq('status','PENDING').limit(5),
  ls_inner: () => sb.from('lesson_students').select('lessons!inner(id, title, start_at, end_at, hours, status, courses(name))').gte('lessons.start_at',dayFrom).lte('lessons.start_at',dayTo).limit(3),
  attendance_inner: () => sb.from('attendance').select('lesson_id, status, note, lessons!inner(start_at)').gte('lessons.start_at',dayFrom).lte('lessons.start_at',dayTo).limit(3),
  cons_inner: () => sb.from('consumptions').select('lesson_id, hours, machine_hours, diff, status, lessons!inner(start_at)').gte('lessons.start_at',dayFrom).lte('lessons.start_at',dayTo).limit(3),
}
for (const [name, fn] of Object.entries(tests)) {
  const r = await fn()
  const n = Array.isArray(r.data) ? r.data.length : 0
  console.log(`${r.error ? 'FAIL' : 'OK  '} ${name.padEnd(18)} rows=${n}${r.error ? '  → '+r.error.message : ''}`)
}
