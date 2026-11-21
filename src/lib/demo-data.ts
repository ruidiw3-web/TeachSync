/** 演示数据：仅在未配置 Supabase 时使用 */

export type DemoStudent = {
  id: string
  name: string
  grade: string
  guardian: string
  phone: string
}

export const DEMO_STUDENTS: DemoStudent[] = [
  { id: 's01', name: '张伟', grade: '初一', guardian: '张建国', phone: '138****0001' },
  { id: 's02', name: '李娜', grade: '初一', guardian: '李红',   phone: '138****0002' },
  { id: 's03', name: '王强', grade: '初二', guardian: '王磊',   phone: '138****0003' },
  { id: 's04', name: '刘洋', grade: '初二', guardian: '刘敏',   phone: '138****0004' },
  { id: 's05', name: '陈静', grade: '初三', guardian: '陈刚',   phone: '138****0005' },
  { id: 's06', name: '杨帆', grade: '初一', guardian: '杨丽',   phone: '138****0006' },
  { id: 's07', name: '赵磊', grade: '初二', guardian: '赵强',   phone: '138****0007' },
  { id: 's08', name: '孙悦', grade: '初三', guardian: '孙伟',   phone: '138****0008' },
  { id: 's09', name: '周涛', grade: '初一', guardian: '周军',   phone: '138****0009' },
  { id: 's10', name: '吴敏', grade: '初二', guardian: '吴芳',   phone: '138****0010' },
  { id: 's11', name: '郑浩', grade: '初三', guardian: '郑明',   phone: '138****0011' },
  { id: 's12', name: '黄婷', grade: '初一', guardian: '黄勇',   phone: '138****0012' },
]

export type DemoSession = {
  id: string
  title: string
  lineType: 'WANFU' | 'SUPERVISE' | 'LESSON'
  billingMode: 'FREE' | 'PAID'
  time: string
  supervisor: string
  status: 'PLANNED' | 'ONGOING' | 'CLOSED'
  headcount: number
}

export const DEMO_SESSIONS: DemoSession[] = [
  {
    id: 'k1',
    title: '周一晚辅 · 作业看管',
    lineType: 'WANFU',
    billingMode: 'FREE',
    time: '17:30 – 20:30',
    supervisor: '李敏',
    status: 'ONGOING',
    headcount: 12,
  },
  {
    id: 'k2',
    title: '智习室 · 初二数学查漏',
    lineType: 'SUPERVISE',
    billingMode: 'PAID',
    time: '18:00 – 20:00',
    supervisor: '王芳',
    status: 'PLANNED',
    headcount: 4,
  },
]

export type DemoHomework = {
  studentId: string
  subjects: { name: string; done: boolean }[]
  machineMin: number | null
  releaseCount: number
  qaCount: number
}

export const DEMO_HOMEWORK: Record<string, DemoHomework> = {
  s01: { studentId: 's01', subjects: [{ name: '语文', done: true }, { name: '数学', done: true }, { name: '英语', done: true }], machineMin: 20, releaseCount: 3, qaCount: 2 },
  s02: { studentId: 's02', subjects: [{ name: '语文', done: true }, { name: '数学', done: true }, { name: '英语', done: false }], machineMin: 15, releaseCount: 1, qaCount: 1 },
  s03: { studentId: 's03', subjects: [{ name: '语文', done: true }, { name: '数学', done: false }], machineMin: null, releaseCount: 0, qaCount: 0 },
  s04: { studentId: 's04', subjects: [{ name: '语文', done: true }, { name: '数学', done: true }, { name: '英语', done: true }], machineMin: 30, releaseCount: 5, qaCount: 3 },
  s05: { studentId: 's05', subjects: [{ name: '物理', done: true }, { name: '化学', done: true }], machineMin: 45, releaseCount: 2, qaCount: 1 },
  s06: { studentId: 's06', subjects: [{ name: '语文', done: false }, { name: '数学', done: false }], machineMin: null, releaseCount: 0, qaCount: 0 },
  s07: { studentId: 's07', subjects: [{ name: '数学', done: true }, { name: '英语', done: true }], machineMin: 10, releaseCount: 1, qaCount: 0 },
  s08: { studentId: 's08', subjects: [{ name: '物理', done: true }, { name: '化学', done: true }, { name: '数学', done: true }], machineMin: 25, releaseCount: 2, qaCount: 2 },
  s09: { studentId: 's09', subjects: [{ name: '语文', done: true }, { name: '数学', done: false }], machineMin: null, releaseCount: 0, qaCount: 1 },
  s10: { studentId: 's10', subjects: [{ name: '英语', done: true }, { name: '数学', done: true }], machineMin: 35, releaseCount: 4, qaCount: 1 },
  s11: { studentId: 's11', subjects: [{ name: '物理', done: false }, { name: '数学', done: false }], machineMin: null, releaseCount: 0, qaCount: 0 },
  s12: { studentId: 's12', subjects: [{ name: '语文', done: true }, { name: '英语', done: true }], machineMin: 20, releaseCount: 1, qaCount: 1 },
}

export const DEMO_LESSONS = [
  { id: 'l1', title: '小四科速记 · 大班', kind: 'GROUP', teacher: '陈老师', time: '周六 09:00–11:00', students: 7, status: 'PLANNED' },
  { id: 'l2', title: '一对一 · 初二数学', kind: 'ONE_ON_ONE', teacher: '王老师', time: '周六 14:00–15:30', students: 1, status: 'PLANNED' },
  { id: 'l3', title: '一对一 · 初三物理', kind: 'ONE_ON_ONE', teacher: '刘老师', time: '周日 10:00–11:30', students: 1, status: 'PLANNED' },
  { id: 'l4', title: '小四科速记 · 大班', kind: 'GROUP', teacher: '陈老师', time: '周日 15:00–17:00', students: 6, status: 'PLANNED' },
]

export const DEMO_FEEDBACK_QUEUE = [
  { id: 'f1', student: '张伟', summary: '作业 3/3 完成 · 学习机 20 分钟（免费体验）· 扫码放行 3 次 · 答疑 2 题', sent: true },
  { id: 'f2', student: '李娜', summary: '作业 2/3 完成（英语未完成：作业量偏大）· 学习机 15 分钟 · 扫码 1 次', sent: true },
  { id: 'f3', student: '王强', summary: '作业 1/2 完成（数学未完成）· 未使用学习机', sent: false },
  { id: 'f4', student: '陈静', summary: '作业 2/2 完成 · 学习机 45 分钟 · 扫码 2 次 · 答疑 1 题', sent: false },
]
