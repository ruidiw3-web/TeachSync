import { connection } from 'next/server'
import { Shell } from '@/components/shell'
import { IconSprite } from '@/components/icons'
import { UserProvider } from '@/components/user-provider'
import { AiDock } from '@/components/ai-dock'
import { getCurrentUser } from '@/lib/session'
import { getNavCounts } from '@/lib/queries'

// 内部管理系统：全部按请求渲染，不做静态预渲染
export const instant = false

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  await connection()

  const user = await getCurrentUser()
  const counts = await getNavCounts()

  return (
    <UserProvider user={user}>
      <IconSprite />
      <Shell counts={counts}>{children}</Shell>
      <AiDock />
    </UserProvider>
  )
}
