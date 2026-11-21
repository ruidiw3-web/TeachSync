import { connection } from 'next/server'
import { PageHeader } from '@/components/page-header'
import { getVerifyData } from '@/lib/queries'
import { getCurrentUser } from '@/lib/session'
import { can } from '@/lib/permissions'
import { VerifyClient } from './verify-client'

export default async function Page() {
  await connection()

  const [data, user] = await Promise.all([getVerifyData(), getCurrentUser()])
  const canAdmin = user ? can(user.roles, 'verify:correct') : false

  return (
    <div className="page p07">
      <PageHeader />
      <div className="page-body">
        <VerifyClient data={data} canAdmin={canAdmin} />
      </div>
    </div>
  )
}
