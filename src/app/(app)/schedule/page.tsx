import { connection } from 'next/server'
import { PageHeader } from '@/components/page-header'
import { getFormOptions, getScheduleLessons } from '@/lib/queries'
import { addDaysYmd, mondayOf, startOfDay, ymdOf } from '@/lib/time'
import { ScheduleBoard } from './schedule-board'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  await connection()

  const sp = await searchParams
  const raw = sp?.from ?? ''
  // 周起点一律按机构时区算，且必须是周一
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : ymdOf(new Date())
  const weekStart = mondayOf(anchor)

  const from = startOfDay(weekStart)
  const to = startOfDay(addDaysYmd(weekStart, 7))

  const [lessons, options] = await Promise.all([
    getScheduleLessons(from.toISOString(), to.toISOString()),
    getFormOptions(),
  ])

  return (
    <div className="page p02">
      <PageHeader />
      <div className="page-body">
        <ScheduleBoard weekStart={weekStart} lessons={lessons} options={options} />
      </div>
    </div>
  )
}
