import { cache } from 'react'
import { cookies } from 'next/headers'
import type { Role } from './permissions'
import { projectRefOf, readLocalSession } from './session-cookie'

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

async function loadCurrentUser(): Promise<CurrentUser | null> {
  if (isDemo) return DEMO_USER

  try {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()

    // 先从 cookie 本地取 userId（零网络请求）；
    // 拿不到时（老会话/分片异常）再退回一次 auth 校验。
    const jar = await cookies()
    const local = readLocalSession(
      jar.getAll(),
      projectRefOf(process.env.NEXT_PUBLIC_SUPABASE_URL)
    )

    let userId = local?.userId ?? ''
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null
      userId = user.id
    }

    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, name, org_id, role, orgs(name)')
      .eq('auth_user_id', userId)
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

/**
 * 同一次请求内多处调用只查一次库（layout 与 page 常各调一次）。
 */
export const getCurrentUser = cache(loadCurrentUser)
