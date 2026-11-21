export type Role = 'OWNER' | 'ADMIN' | 'TEACHER'

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: '负责人',
  ADMIN: '教务',
  TEACHER: '教师',
}

/** 权限点：沿用 v0.1 的「教务及以上」语义 */
export type Permission =
  | 'verify:correct' // 课时对账修正
  | 'points:rule' // 积分规则配置
  | 'points:approve' // 兑换审批
  | 'sync:monitor' // 数据同步监控
  | 'student:bind' // 学生绑定认领
  | 'kb:manage' // 知识库管理
  | 'org:config' // 机构配置
  | 'member:manage' // 权限与成员

const ADMIN_POINTS: Permission[] = [
  'verify:correct',
  'points:rule',
  'points:approve',
  'sync:monitor',
  'student:bind',
  'kb:manage',
  'org:config',
  'member:manage',
]

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: ADMIN_POINTS,
  ADMIN: ADMIN_POINTS,
  TEACHER: [],
}

export function can(roles: Role[], p: Permission): boolean {
  return roles.some((r) => ROLE_PERMISSIONS[r]?.includes(p))
}

export type NavItem = {
  id: string
  label: string
  href: string
  icon: string
  badge?: { n: string; tone?: 'err' | 'blue' | 'warn' }
  perm?: Permission
}

/** v0.1 定稿的 10 个一级导航 */
export const NAV: NavItem[] = [
  { id: 'p01', label: '工作台', href: '/today', icon: 'dashboard' },
  { id: 'p02', label: '排课中心', href: '/schedule', icon: 'calendar-check' },
  { id: 'p07', label: '核销中心', href: '/verify', icon: 'verify', badge: { n: '12' } },
  { id: 'p13', label: '学生管理', href: '/students', icon: 'users' },
  { id: 'p15', label: '错题与复习', href: '/mistakes', icon: 'mistake', badge: { n: '5', tone: 'warn' } },
  { id: 'p18', label: '考勤', href: '/attendance', icon: 'clock' },
  { id: 'p20', label: '积分', href: '/points', icon: 'star', badge: { n: '3', tone: 'blue' } },
  { id: 'p21', label: '日报中心', href: '/reports', icon: 'report', badge: { n: '3', tone: 'warn' } },
  { id: 'pnt', label: '任务中心', href: '/tasks', icon: 'task', badge: { n: '23', tone: 'blue' } },
  { id: 'pst', label: '设置', href: '/settings', icon: 'gear' },
]
