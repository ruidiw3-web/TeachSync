import { connection } from 'next/server'
import { PageHeader } from '@/components/page-header'
import { getFormOptions, getScheduleLessons } from '@/lib/queries'
import { ScheduleBoard } from './schedule-board'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function mondayOf(d: Date) {
  const t = new Date(d)
  t.setHours(0, 0, 0, 0)
  const shift = (t.getDay() + 6) % 7
  t.setDate(t.getDate() - shift)
  return t
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  await connection()

  const sp = await searchParams
  const raw = sp?.from ?? ''
  let base: Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number)
    base = mondayOf(new Date(y, m - 1, d))
  } else {
    base = mondayOf(new Date())
  }

  const weekStart = toYmd(base)
  const weekEndDate = new Date(base)
  weekEndDate.setDate(base.getDate() + 7)

  const [lessons, options] = await Promise.all([
    getScheduleLessons(base.toISOString(), weekEndDate.toISOString()),
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
