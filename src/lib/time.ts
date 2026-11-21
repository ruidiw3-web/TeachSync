/**
 * 时区统一处理
 *
 * 服务器（Netlify / Vercel）跑在 UTC，直接用 new Date().getHours() 会得到 UTC 小时，
 * 导致课表时间整体偏移 8 小时。所有面向用户的时间必须显式按机构时区计算。
 *
 * 机构时区固定为 Asia/Shanghai（UTC+8，无夏令时），因此用固定偏移换算，
 * 结果精确且不依赖服务器 locale。
 * 若将来机构迁到有夏令时的时区，需改用 Intl.DateTimeFormat + timeZone。
 */
export const TZ = 'Asia/Shanghai'
export const TZ_OFFSET = '+08:00'
const OFFSET_MS = 8 * 60 * 60 * 1000

const pad = (n: number) => String(n).padStart(2, '0')

/** 把任意时刻平移到「机构时区的挂钟时间」，之后只能用 getUTC* 读 */
function wall(d: Date) {
  return new Date(d.getTime() + OFFSET_MS)
}

/** YYYY-MM-DD（机构时区） */
export function ymdOf(input: string | Date): string {
  const t = wall(typeof input === 'string' ? new Date(input) : input)
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

/** HH:mm（机构时区） */
export function hmOf(input: string | Date): string {
  const t = wall(typeof input === 'string' ? new Date(input) : input)
  return `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}`
}

/** MM-DD（机构时区） */
export function mdOf(input: string | Date): string {
  const t = wall(typeof input === 'string' ? new Date(input) : input)
  return `${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`
}

/** 由「YYYY-MM-DD + HH:mm」构造真实时刻（按机构时区解释） */
export function atLocal(ymd: string, hm: string): Date {
  return new Date(`${ymd}T${hm}:00${TZ_OFFSET}`)
}

/** YYYY-MM-DD 加减天数 */
export function addDaysYmd(ymd: string, n: number): string {
  const base = new Date(`${ymd}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + n)
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}`
}

/** 两个日期相差几天（b - a） */
export function diffDays(a: string, b: string): number {
  const ta = new Date(`${a}T00:00:00Z`).getTime()
  const tb = new Date(`${b}T00:00:00Z`).getTime()
  return Math.round((tb - ta) / 86400000)
}

/** 所在周的周一（YYYY-MM-DD） */
export function mondayOf(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  const shift = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - shift)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** 某天 00:00:00 的时刻 */
export function startOfDay(ymd: string): Date {
  return new Date(`${ymd}T00:00:00${TZ_OFFSET}`)
}

/** 某天 23:59:59.999 的时刻 */
export function endOfDay(ymd: string): Date {
  return new Date(`${ymd}T23:59:59.999${TZ_OFFSET}`)
}

/** 某月起点的 YYYY-MM-01 */
export function monthStartYmd(input: Date = new Date()): string {
  const y = ymdOf(input)
  return `${y.slice(0, 7)}-01`
}

/** 带星期的中文日期，用于顶栏 */
export function fmtCnDate(input: Date = new Date()): string {
  const t = wall(input)
  const dow = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][t.getUTCDay()]
  return `${t.getUTCFullYear()}年${t.getUTCMonth() + 1}月${t.getUTCDate()}日 ${dow}`
}

/** 时间区间文本 */
export function fmtRange(startISO: string, endISO: string): string {
  return `${hmOf(startISO)}–${hmOf(endISO)}`
}
