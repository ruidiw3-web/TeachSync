import type { Role } from './permissions'

export type CurrentUser = {
  staffId: string
  name: string
  orgId: string
  orgName: string
  roles: Role[]
  /** 主角色，用于界面展示「教务 / 教师 / 负责人」 */
  primaryRole: Role
}

export const isDemo = !(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxxxxxxx')
)

const DEMO_USER: CurrentUser = {
  staffId: 'demo-staff-1',
  name: '陈老师',
  orgId: '00000000-0000-4000-8000-000000000001',
  orgName: '启明学习中心',
  roles: ['ADMIN'],
  primaryRole: 'ADMIN',
}

const ROLES: Role[] = ['OWNER', 'ADMIN', 'TEACHER']

function normRole(v: unknown): Role {
  const s = String(v ?? '').toUpperCase()
  return (ROLES.find((r) => r === s) ?? 'TEACHER') as Role
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (isDemo) return DEMO_USER

  try {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, name, org_id, role, orgs(name)')
      .eq('auth_user_id', user.id)
      .eq('active', true)
      .maybeSingle()

    if (!teacher) return null

    const primaryRole = normRole(teacher.role)

    return {
      staffId: teacher.id,
      name: teacher.name,
      orgId: teacher.org_id,
      orgName: (teacher.orgs as unknown as { name: string } | null)?.name ?? '未命名机构',
      roles: [primaryRole],
      primaryRole,
    }
  } catch {
    return null
  }
}
