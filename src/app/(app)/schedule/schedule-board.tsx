'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@/components/icons'
import { Toast, useToast } from '@/components/toast'
import type { FormOptions, ScheduleLesson } from '@/lib/queries'
import { addDaysYmd, atLocal, diffDays, hmOf, ymdOf } from '@/lib/time'
import { createLesson, moveLesson } from './actions'

const DOW = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const DEFAULT_ROWS = ['08:30', '10:15', '13:30', '15:30', '18:30']

type Props = {
  weekStart: string
  lessons: ScheduleLesson[]
  options: FormOptions
}

type Hint = { level: 'ok' | 'warn' | 'err'; reasons: string[] }

/** 时间一律按机构时区读，不能用 getHours（服务器在 UTC，会差 8 小时） */
const hm = hmOf
const addDays = addDaysYmd

function dayDiff(weekStartYmd: string, iso: string) {
  return diffDays(weekStartYmd, ymdOf(iso))
}

/** 纯字符串计算周序号，避免服务端/客户端时区不同导致 hydration 不一致 */
function weekNo(weekStartYmd: string) {
  const jan1 = `${weekStartYmd.slice(0, 4)}-01-01`
  return Math.floor(diffDays(jan1, weekStartYmd) / 7) + 1
}

/**
 * 课程名本身带「·」（如「初三数学 · 冲刺A班」），
 * 直接整串当标题会和下一行重复，所以拆成「科目 / 班型」两行。
 */
function splitCourse(courseName: string): { name: string; sub: string } {
  const parts = courseName.split(' · ')
  if (parts.length >= 2) return { name: parts[0], sub: parts.slice(1).join(' · ') }
  return { name: courseName, sub: '' }
}


export function ScheduleBoard({ weekStart, lessons: initial, options }: Props) {
  const router = useRouter()
  const { toast, show } = useToast()

  const [lessons, setLessons] = useState<ScheduleLesson[]>(initial)
  const [mode, setMode] = useState<'week' | 'day'>('week')
  const [dayCursor, setDayCursor] = useState(() => {
    const today = new Date()
    const idx = dayDiff(weekStart, today.toISOString())
    return idx >= 0 && idx < 7 ? idx : 0
  })
  const [filter, setFilter] = useState<{ type: 'teacher' | 'room'; id: string } | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const [drag, setDrag] = useState<ScheduleLesson | null>(null)
  const [hint, setHint] = useState<{ day: number; time: string; level: string; reasons: string[] } | null>(null)
  const [confirm, setConfirm] = useState<{
    lesson: ScheduleLesson
    day: number
    time: string
    reasons: string[]
  } | null>(null)
  const [busy, setBusy] = useState(false)

  // 新建课次抽屉
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    courseId: '',
    teacherId: '',
    roomId: '',
    date: addDays(weekStart, 0),
    startTime: '08:30',
    hours: '1.5',
    studentIds: [] as string[],
  })

  const studentName = useMemo(() => {
    const m = new Map<string, string>()
    options.students.forEach((s) => m.set(s.id, s.name))
    return m
  }, [options.students])

  const visible = useMemo(() => {
    if (!filter) return lessons
    return lessons.filter((l) =>
      filter.type === 'teacher' ? l.teacherId === filter.id : l.roomId === filter.id
    )
  }, [lessons, filter])

  const rows = useMemo(() => {
    const set = new Set(visible.map((l) => hm(l.startAt)))
    if (set.size === 0) return DEFAULT_ROWS
    return [...set].sort()
  }, [visible])

  const days = mode === 'week' ? [0, 1, 2, 3, 4, 5, 6] : [dayCursor]
  const todayYmd = ymdOf(new Date())

  function lessonsAt(day: number, time: string) {
    return visible.filter((l) => dayDiff(weekStart, l.startAt) === day && hm(l.startAt) === time)
  }

  /** 落点冲突预判：教师/教室 = 硬冲突，学生重叠 = 需确认 */
  function checkDrop(lesson: ScheduleLesson, day: number, time: string): Hint & { start: Date; end: Date } {
    const dateYmd = addDays(weekStart, day)
    const start = atLocal(dateYmd, time)
    const dur = new Date(lesson.endAt).getTime() - new Date(lesson.startAt).getTime()
    const end = new Date(start.getTime() + dur)

    const reasons: string[] = []
    let level: 'ok' | 'warn' | 'err' = 'ok'

    for (const o of lessons) {
      if (o.id === lesson.id) continue
      const s2 = new Date(o.startAt)
      const e2 = new Date(o.endAt)
      if (!(start < e2 && s2 < end)) continue

      if (lesson.teacherId && o.teacherId === lesson.teacherId) {
        reasons.push(`${o.teacherName} 该时段已有「${o.title}」`)
        level = 'err'
      }
      if (lesson.roomId && o.roomId === lesson.roomId) {
        reasons.push(`${o.roomName} 该时段已被「${o.title}」占用`)
        level = 'err'
      }
      const shared = o.studentIds.filter((id) => lesson.studentIds.includes(id))
      if (shared.length > 0) {
        reasons.push(
          `${shared.map((id) => studentName.get(id) ?? '学生').join('、')} 在该时段另有「${o.title}」`
        )
        if (level !== 'err') level = 'warn'
      }
    }

    return { level, reasons: [...new Set(reasons)], start, end }
  }

  function onDragStart(e: React.DragEvent, l: ScheduleLesson) {
    // 已结课/进行中的课次不允许改期，但也要给出反馈，不能静默失败
    if (l.status !== 'SCHEDULED') {
      e.preventDefault()
      show(
        `「${l.title}」${l.status === 'FINISHED' ? '已结课' : '正在进行'}，不能拖动改期。只有待上课的蓝色课卡可拖。`,
        'warn'
      )
      return
    }
    setDrag(l)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', l.id)
  }

  function onDragOver(e: React.DragEvent, day: number, time: string) {
    if (!drag) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const r = checkDrop(drag, day, time)
    if (!hint || hint.day !== day || hint.time !== time || hint.level !== r.level) {
      setHint({ day, time, level: r.level, reasons: r.reasons })
    }
  }

  function onDragLeave(day: number, time: string) {
    if (hint && hint.day === day && hint.time === time) setHint(null)
  }

  async function commitMove(lesson: ScheduleLesson, day: number, time: string) {
    const r = checkDrop(lesson, day, time)
    const snapshot = lessons

    // 乐观更新
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lesson.id ? { ...l, startAt: r.start.toISOString(), endAt: r.end.toISOString() } : l
      )
    )
    setBusy(true)
    const res = await moveLesson(lesson.id, r.start.toISOString(), r.end.toISOString())
    setBusy(false)

    if (!res.ok) {
      setLessons(snapshot)
      show(res.conflicts?.length ? `${res.message}：${res.conflicts[0]}` : res.message, 'err')
      return
    }
    show(`${lesson.title} 已改到 ${DOW[day]} ${time}`, 'ok')
  }

  function onDrop(e: React.DragEvent, day: number, time: string) {
    e.preventDefault()
    if (!drag) return
    const lesson = drag
    setDrag(null)
    setHint(null)

    if (dayDiff(weekStart, lesson.startAt) === day && hm(lesson.startAt) === time) return

    const r = checkDrop(lesson, day, time)
    if (r.level === 'err') {
      show(`该时段存在冲突：${r.reasons[0]}`, 'err')
      return
    }
    if (r.level === 'warn') {
      setConfirm({ lesson, day, time, reasons: r.reasons })
      return
    }
    void commitMove(lesson, day, time)
  }

  async function submitCreate() {
    if (!form.title.trim()) {
      show('请填写课次名称', 'warn')
      return
    }
    setBusy(true)
    const res = await createLesson({
      title: form.title.trim(),
      courseId: form.courseId || null,
      teacherId: form.teacherId || null,
      roomId: form.roomId || null,
      date: form.date,
      startTime: form.startTime,
      hours: Number(form.hours),
      studentIds: form.studentIds,
    })
    setBusy(false)

    if (!res.ok) {
      show(res.message, 'err')
      return
    }
    setCreating(false)
    setForm((f) => ({ ...f, title: '', studentIds: [] }))
    show('课次已创建', 'ok')
    router.refresh()
  }

  const conflictCount = useMemo(() => {
    let n = 0
    for (let i = 0; i < lessons.length; i++) {
      for (let j = i + 1; j < lessons.length; j++) {
        const a = lessons[i]
        const b = lessons[j]
        const s1 = new Date(a.startAt)
        const e1 = new Date(a.endAt)
        const s2 = new Date(b.startAt)
        const e2 = new Date(b.endAt)
        if (!(s1 < e2 && s2 < e1)) continue
        if ((a.teacherId && a.teacherId === b.teacherId) || (a.roomId && a.roomId === b.roomId)) n++
      }
    }
    return n
  }, [lessons])

  const filterLabel = filter
    ? filter.type === 'teacher'
      ? options.teachers.find((t) => t.id === filter.id)?.name ?? '教师'
      : options.rooms.find((r) => r.id === filter.id)?.name ?? '教室'
    : '教师 / 教室'

  return (
    <>
      <div className="toolbar">
        <div className="week-switch">
          <Link className="stepper" href={`/schedule?from=${addDays(weekStart, -7)}`} aria-label="上一周">
            <Icon name="chevron-left" size={12} />
          </Link>
          <span className="week-label">
            {weekStart.slice(5).replace('-', '/')} - {addDays(weekStart, 6).slice(5).replace('-', '/')} · 第{' '}
            {weekNo(weekStart)} 周
          </span>
          <Link className="stepper" href={`/schedule?from=${addDays(weekStart, 7)}`} aria-label="下一周">
            <Icon name="chevron-right" size={12} />
          </Link>
        </div>

        <div className="segment">
          <span
            className={`seg-item${mode === 'week' ? ' is-on' : ''}`}
            onClick={() => setMode('week')}
          >
            周课表
          </span>
          <span
            className={`seg-item${mode === 'day' ? ' is-on' : ''}`}
            onClick={() => setMode('day')}
          >
            日课表
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <button className="tool-btn" onClick={() => setFilterOpen((v) => !v)}>
            <Icon name="filter" size={15} />
            <span>{filterLabel}</span>
          </button>
          {filterOpen && (
            <div className="filter-dd">
              <button
                className={`filter-dd-item${!filter ? ' is-on' : ''}`}
                onClick={() => {
                  setFilter(null)
                  setFilterOpen(false)
                }}
              >
                全部课次
              </button>
              <div className="filter-dd-sep" />
              {options.teachers.map((t) => (
                <button
                  key={t.id}
                  className={`filter-dd-item${
                    filter?.type === 'teacher' && filter.id === t.id ? ' is-on' : ''
                  }`}
                  onClick={() => {
                    setFilter({ type: 'teacher', id: t.id })
                    setFilterOpen(false)
                  }}
                >
                  {t.name}
                </button>
              ))}
              <div className="filter-dd-sep" />
              {options.rooms.map((r) => (
                <button
                  key={r.id}
                  className={`filter-dd-item${
                    filter?.type === 'room' && filter.id === r.id ? ' is-on' : ''
                  }`}
                  onClick={() => {
                    setFilter({ type: 'room', id: r.id })
                    setFilterOpen(false)
                  }}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="tb-spacer" />

        <button
          className="conflict-btn"
          onClick={() =>
            conflictCount === 0
              ? show('本周没有检测到教师或教室冲突', 'ok')
              : show(`本周检测到 ${conflictCount} 处教师/教室冲突，红色课卡即为冲突项`, 'warn')
          }
        >
          <Icon name="alert" size={14} />
          <span>全局冲突检测{conflictCount > 0 ? ` (${conflictCount})` : ''}</span>
        </button>

        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <Icon name="plus" size={14} />
          <span>新增课程</span>
        </button>
      </div>

      <div className="card sched-card">
        <div className="sched-head">
          <div className="sched-corner">时间</div>
          {days.map((d) => {
            const ymd = addDays(weekStart, d)
            const isToday = ymd === todayYmd
            return (
              <div
                key={d}
                className={`sched-day${isToday ? ' is-today' : ''}`}
                onClick={() => {
                  setDayCursor(d)
                  setMode('day')
                }}
                style={{ cursor: 'pointer' }}
              >
                <span className="dow">{DOW[d]}</span>
                <span className="dt">
                  {ymd.slice(5).replace('-', '/')}
                  {isToday ? ' 今天' : ''}
                </span>
              </div>
            )
          })}
        </div>

        <div className="sched-body">
          <div className="time-col">
            {rows.map((t) => {
              const endOfRow = visible.find((l) => hm(l.startAt) === t)
              return (
                <div className="time-cell" key={t}>
                  <span className="tm-start">{t}</span>
                  <span className="tm-end">{endOfRow ? hm(endOfRow.endAt) : ''}</span>
                </div>
              )
            })}
          </div>

          {days.map((d) => {
            const ymd = addDays(weekStart, d)
            const isToday = ymd === todayYmd
            return (
              <div key={d} className={`day-col${isToday ? ' is-today' : ''}`}>
                {rows.map((t) => {
                  const items = lessonsAt(d, t)
                  const isHover = hint?.day === d && hint.time === t
                  return (
                    <div
                      key={t}
                      className={`cell${drag ? ' dz' : ''}${isHover ? ` dz-${hint.level}` : ''}`}
                      style={isHover ? { borderStyle: 'dashed' } : undefined}
                      onDragOver={(e) => onDragOver(e, d, t)}
                      onDragLeave={() => onDragLeave(d, t)}
                      onDrop={(e) => onDrop(e, d, t)}
                    >
                      {isHover && items.length === 0 && (
                        <div className="drop-tip">
                          <Icon name={hint.level === 'ok' ? 'check' : 'alert'} size={12} />
                          <span className="drop-title">
                            {hint.level === 'ok'
                              ? '可放置'
                              : hint.level === 'warn'
                                ? '需确认'
                                : '时段冲突'}
                          </span>
                        </div>
                      )}
                      {isHover && items.length > 0 && (
                        <div className="drop-tip">
                          <Icon name="alert" size={12} />
                          <span className="drop-title">{hint.reasons[0] ?? '时段冲突'}</span>
                        </div>
                      )}

                      {items.map((l) => {
                        const live = l.status === 'ONGOING'
                        const finished = l.status === 'FINISHED'
                        const dragged = drag?.id === l.id
                        return (
                          <div
                            key={l.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, l)}
                            onDragEnd={() => {
                              setDrag(null)
                              setHint(null)
                            }}
                            className={`course${live ? ' is-live' : finished ? ' is-amber' : ''}${
                              dragged ? ' is-drag-src' : ''
                            }${l.status !== 'SCHEDULED' ? ' is-locked' : ''}`}
                            title={
                              l.status === 'SCHEDULED'
                                ? `${l.title} · ${l.teacherName} · ${l.roomName}（可拖动改期）`
                                : `${l.title} · ${finished ? '已结课' : '进行中'}，不可拖动改期`
                            }
                          >
                            <span className="course-name">{splitCourse(l.courseName).name}</span>
                            <span className="course-sub">
                              {splitCourse(l.courseName).sub || l.title}
                            </span>
                            <span
                              className={`course-meta${finished ? ' is-amber' : ''}`}
                            >{`${l.roomName} · ${l.studentCount}人`}</span>
                            {live && <span className="tag-live">进行中</span>}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* 需确认落点 */}
      {confirm && (
        <div className="ov-fixed" onClick={(e) => e.target === e.currentTarget && setConfirm(null)}>
          <div className="ov-mask" />
          <div className="ov-modal" style={{ maxWidth: 440 }}>
            <div className="ov-head">
              <span className="ov-title">该落点需要确认</span>
              <button className="ov-close" onClick={() => setConfirm(null)}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <div className="ov-body" style={{ overflowY: 'auto' }}>
              <div className="inline-hint">
                把「{confirm.lesson.title}」移到 {DOW[confirm.day]} {confirm.time}
              </div>
              <div
                style={{
                  background: 'var(--warn-bg-soft)',
                  border: '1px solid var(--warn-line)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 12,
                  color: 'var(--warn-ink)',
                  lineHeight: 1.6,
                }}
              >
                {confirm.reasons.map((r, i) => (
                  <div key={i}>· {r}</div>
                ))}
                <div style={{ marginTop: 6 }}>教师和教室没有冲突，但学生时间重叠。确认后系统仍会按你的选择改期。</div>
              </div>
            </div>
            <div className="ov-foot">
              <div className="sp" />
              <button className="btn btn-ghost" onClick={() => setConfirm(null)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={async () => {
                  const c = confirm
                  setConfirm(null)
                  await commitMove(c.lesson, c.day, c.time)
                }}
              >
                确认改期
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新建课次 */}
      {creating && (
        <div className="ov-fixed" onClick={(e) => e.target === e.currentTarget && setCreating(false)}>
          <div className="ov-mask" />
          <div className="ov-modal w560" style={{ maxWidth: 560 }}>
            <div className="ov-head">
              <span className="ov-title">新增课程</span>
              <button className="ov-close" onClick={() => setCreating(false)}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <div className="ov-body" style={{ overflowY: 'auto' }}>
              <div className="fi">
                <span className="fi-label">课次名称</span>
                <input
                  className="fi-input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="例如：初三数学 · 冲刺A班"
                />
              </div>
              <div className="fi-row">
                <div className="fi">
                  <span className="fi-label">课程</span>
                  <select
                    className="fi-input"
                    value={form.courseId}
                    onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                  >
                    <option value="">不指定</option>
                    {options.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fi">
                  <span className="fi-label">教师</span>
                  <select
                    className="fi-input"
                    value={form.teacherId}
                    onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                  >
                    <option value="">不指定</option>
                    {options.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fi-row">
                <div className="fi">
                  <span className="fi-label">教室</span>
                  <select
                    className="fi-input"
                    value={form.roomId}
                    onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                  >
                    <option value="">不指定</option>
                    {options.rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fi">
                  <span className="fi-label">日期</span>
                  <input
                    className="fi-input"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="fi-row">
                <div className="fi">
                  <span className="fi-label">开始时间</span>
                  <input
                    className="fi-input"
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  />
                </div>
                <div className="fi">
                  <span className="fi-label">课时长度（小时）</span>
                  <input
                    className="fi-input"
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                  />
                </div>
              </div>
              <div className="fi">
                <span className="fi-label">上课学生（已选 {form.studentIds.length} 人）</span>
                <div className="chk-grid">
                  {options.students.map((s) => {
                    const on = form.studentIds.includes(s.id)
                    return (
                      <label key={s.id} className="chk-item">
                        <span className={`checkbox${on ? ' is-on' : ''}`}>
                          {on && <Icon name="check" size={10} />}
                        </span>
                        <input
                          type="checkbox"
                          checked={on}
                          style={{ display: 'none' }}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              studentIds: on
                                ? f.studentIds.filter((x) => x !== s.id)
                                : [...f.studentIds, s.id],
                            }))
                          }
                        />
                        <span>
                          {s.name}
                          {s.grade ? ` · ${s.grade}` : ''}
                        </span>
                      </label>
                    )
                  })}
                  {options.students.length === 0 && (
                    <span className="inline-hint">还没有学生，先去「学生管理」添加</span>
                  )}
                </div>
              </div>
            </div>
            <div className="ov-foot">
              <span className="autosave">保存前会校验教师、教室与学生的时段冲突</span>
              <button className="btn btn-ghost" onClick={() => setCreating(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={submitCreate} disabled={busy}>
                {busy ? '创建中…' : '创建课次'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast state={toast} />
    </>
  )
}
