'use client'

import { useMemo, useState, useTransition } from 'react'
import { Icon } from '@/components/icons'
import { Toast, useToast } from '@/components/toast'
import type { VerifyData, VerifyRow } from '@/lib/queries'
import { resolveConsumption, verifyBatch } from './actions'

type Filter = 'all' | 'abnormal' | 'ready'

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: '一致', cls: 'pill-ok' },
  REVIEW_NEEDED: { label: '对账异常', cls: 'pill-err' },
  IN_REVIEW: { label: '复核中', cls: 'pill-warn' },
}

export function VerifyClient({ data, canAdmin }: { data: VerifyData; canAdmin: boolean }) {
  const { toast, show } = useToast()
  const [pending, startTransition] = useTransition()

  const [rows, setRows] = useState<VerifyRow[]>(data.rows)
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)

  // 复核弹层
  const [reviewTarget, setReviewTarget] = useState<VerifyRow | null>(null)
  const [reviewHours, setReviewHours] = useState('')
  const [reviewNote, setReviewNote] = useState('')

  const visible = useMemo(() => {
    if (filter === 'abnormal') {
      return rows.filter((r) => r.status === 'REVIEW_NEEDED' || r.status === 'IN_REVIEW')
    }
    if (filter === 'ready') return rows.filter((r) => r.status === 'PENDING')
    return rows
  }, [rows, filter])

  const selectable = visible.filter((r) => r.status === 'PENDING')
  const selectedRows = rows.filter((r) => selected.has(r.id) && r.status === 'PENDING')
  const selectedHours = selectedRows.reduce((a, r) => a + r.hours, 0)
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id))

  const pendingCount = rows.filter((r) => r.status === 'PENDING').length
  const abnormalCount = rows.filter(
    (r) => r.status === 'REVIEW_NEEDED' || r.status === 'IN_REVIEW'
  ).length

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectable.map((r) => r.id)))
    }
  }

  async function doVerifyOne(row: VerifyRow) {
    setBusyId(row.id)
    // 乐观移除，失败再放回
    const snapshot = rows
    setRows((prev) => prev.filter((r) => r.id !== row.id))
    setSelected((prev) => {
      const n = new Set(prev)
      n.delete(row.id)
      return n
    })

    const res = await verifyBatchSafe([row.id])

    setBusyId(null)
    if (!res.ok) {
      setRows(snapshot)
      show(res.message, 'err')
      return
    }
    show(`${row.studentName} · ${row.hours} 课时已核销`, 'ok')
  }

  async function doVerifyBatch() {
    if (selectedRows.length === 0) {
      show('请先勾选要核销的记录', 'warn')
      return
    }
    const ids = selectedRows.map((r) => r.id)
    const snapshot = rows
    setRows((prev) => prev.filter((r) => !ids.includes(r.id)))
    setSelected(new Set())

    const res = await verifyBatchSafe(ids)
    if (!res.ok) {
      setRows(snapshot)
      show(res.message, 'err')
      return
    }
    show(res.message, res.failed.length > 0 ? 'warn' : 'ok')
  }

  // 包一层，保证客户端异常也不会把页面打崩
  async function verifyBatchSafe(ids: string[]) {
    try {
      return await verifyBatch(ids)
    } catch {
      return { ok: false, message: '网络异常，核销未提交成功', succeeded: 0, failed: [] }
    }
  }

  function openReview(row: VerifyRow) {
    setReviewTarget(row)
    setReviewHours(String(row.machineHours ?? row.hours))
    setReviewNote('')
  }

  async function submitReview() {
    if (!reviewTarget) return
    const hours = Number(reviewHours)
    if (!Number.isFinite(hours) || hours <= 0) {
      show('结算课时必须大于 0', 'err')
      return
    }
    setBusyId(reviewTarget.id)
    const snapshot = rows
    const id = reviewTarget.id
    setRows((prev) => prev.filter((r) => r.id !== id))

    let res
    try {
      res = await resolveConsumption({ id, hours, note: reviewNote })
    } catch {
      res = { ok: false, message: '网络异常，复核未提交成功' }
    }

    setBusyId(null)
    if (!res.ok) {
      setRows(snapshot)
      show(res.message, 'err')
      return
    }
    setReviewTarget(null)
    show(res.message, 'ok')
  }

  return (
    <>
      {abnormalCount > 0 && (
        <div className="alert-bar">
          <Icon name="alert" size={18} />
          <div className="alert-main">
            <span className="alert-title">有 {abnormalCount} 笔课时对账异常，需要人工复核</span>
            <span className="alert-desc">
              教务核销记录与学习机上报数据不一致，系统已冻结对应课时，复核后自动结算
            </span>
          </div>
          <button className="btn btn-xs btn-danger" onClick={() => setFilter('abnormal')}>
            立即复核
          </button>
        </div>
      )}

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-bar" style={{ background: 'var(--warn)' }} />
          <div className="stat-main">
            <span className="stat-label">待核销</span>
            <span className="stat-value">{pendingCount} 笔</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-bar" style={{ background: 'var(--err)' }} />
          <div className="stat-main">
            <span className="stat-label">对账异常</span>
            <span className="stat-value c-err">{abnormalCount} 笔</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-bar" style={{ background: 'var(--ok)' }} />
          <div className="stat-main">
            <span className="stat-label">本月已核销</span>
            <span className="stat-value">{data.verifiedThisMonth} 笔</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-bar" style={{ background: 'var(--primary)' }} />
          <div className="stat-main">
            <span className="stat-label">自动对账成功率</span>
            <span className="stat-value" style={{ color: 'var(--primary)' }}>
              {data.autoRate}%
            </span>
          </div>
        </div>
      </div>

      <div className="card verify-card">
        <div className="card-head">
          <span className="card-title">待核销课时</span>
          <div className="tb-spacer" />
          <div className="seg-tags">
            <button
              className={`seg-tag${filter === 'all' ? ' is-on' : ''}`}
              onClick={() => setFilter('all')}
            >
              全部 {rows.length}
            </button>
            <button
              className={`seg-tag${filter === 'abnormal' ? ' is-on' : ''} is-err`}
              onClick={() => setFilter('abnormal')}
            >
              对账异常 {abnormalCount}
            </button>
            <button
              className={`seg-tag${filter === 'ready' ? ' is-on' : ''}`}
              onClick={() => setFilter('ready')}
            >
              可直接核销 {pendingCount}
            </button>
          </div>
        </div>

        {selectedRows.length > 0 && (
          <div className="bulk-bar">
            <span className={`checkbox${allSelected ? ' is-on' : ''}`} onClick={toggleAll}>
              {allSelected && <Icon name="check" size={10} />}
            </span>
            <span className="bulk-text">
              已选 {selectedRows.length} 笔，合计 {selectedHours} 课时
            </span>
            <button
              className="btn btn-xs btn-primary"
              style={{ padding: '0 16px 0 14px' }}
              onClick={doVerifyBatch}
              disabled={pending}
            >
              <Icon name="check" size={13} />
              <span>{pending ? '核销中…' : '批量核销'}</span>
            </button>
          </div>
        )}

        <div className="tbl-head">
          <span className="th">
            <span
              className={`checkbox${allSelected ? ' is-on' : ''}`}
              onClick={toggleAll}
              style={{ cursor: 'pointer' }}
            >
              {allSelected && <Icon name="check" size={10} />}
            </span>
          </span>
          <span className="th">学生</span>
          <span className="th">课程 / 班级</span>
          <span className="th">上课时间</span>
          <span className="th">教务核销</span>
          <span className="th">学习机上报</span>
          <span className="th fill">对账状态</span>
          <span className="th">操作</span>
        </div>

        <div className="tbl-body">
          {visible.length === 0 && (
            <div className="empty-state">
              <Icon name="check" size={22} />
              <span className="empty-title">
                {rows.length === 0 ? '没有待核销的课时' : '当前筛选下没有记录'}
              </span>
              <span className="empty-desc">
                {rows.length === 0
                  ? '课次结束后学习机上报数据会自动生成核销单'
                  : '切换到「全部」查看其他记录'}
              </span>
            </div>
          )}

          {visible.map((r) => {
            const bad = r.status === 'REVIEW_NEEDED' || r.status === 'IN_REVIEW'
            const meta = STATUS_META[r.status] ?? { label: r.status, cls: 'pill-gray' }
            const isSel = selected.has(r.id)
            const isBusy = busyId === r.id

            return (
              <div
                key={r.id}
                className={`trow${bad ? ' is-bad' : isSel ? ' is-sel' : ''}`}
                style={{ opacity: isBusy ? 0.5 : 1 }}
              >
                <span
                  className={`cb checkbox${isSel ? ' is-on' : ''}`}
                  onClick={() => r.status === 'PENDING' && toggle(r.id)}
                  style={{ cursor: r.status === 'PENDING' ? 'pointer' : 'not-allowed' }}
                  title={r.status === 'PENDING' ? '选择' : '异常记录需单独复核'}
                >
                  {isSel && <Icon name="check" size={10} />}
                </span>

                <div className="stu-cell">
                  <span
                    className="tr-avatar"
                    style={{
                      background: bad ? 'var(--err-bg)' : 'var(--primary-tint)',
                      color: bad ? 'var(--err-ink)' : 'var(--primary)',
                    }}
                  >
                    {r.studentName.slice(0, 1)}
                  </span>
                  <span className="tr-name">{r.studentName}</span>
                </div>

                <span className="tr-course">{r.courseName}</span>
                <span className="tr-time">{r.when}</span>
                <span className="tr-hours">{r.hours} 课时</span>
                <span className={`tr-report${bad ? ' is-err' : ''}`}>
                  {r.machineHours === null ? '未上报' : `${r.machineHours} 课时`}
                </span>
                <span className="tr-status">
                  <span className={`pill ${meta.cls}`}>
                    {bad && r.diff !== 0 ? `差异 ${Math.abs(r.diff)} 课时` : meta.label}
                  </span>
                </span>
                <span className="tr-op-cell">
                  {r.status === 'PENDING' ? (
                    <button className="tr-op" onClick={() => doVerifyOne(r)} disabled={isBusy}>
                      {isBusy ? '核销中' : '核销'}
                    </button>
                  ) : (
                    <button
                      className="tr-op"
                      onClick={() => openReview(r)}
                      disabled={isBusy}
                      title={canAdmin ? '复核对账异常' : '需要教务权限'}
                    >
                      复核
                    </button>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 复核弹层 */}
      {reviewTarget && (
        <div className="ov-fixed" onClick={(e) => e.target === e.currentTarget && setReviewTarget(null)}>
          <div className="ov-mask" />
          <div className="ov-modal" style={{ maxWidth: 480 }}>
            <div className="ov-head">
              <span className="ov-title">复核对账异常</span>
              <button className="ov-close" onClick={() => setReviewTarget(null)}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <div className="ov-body" style={{ overflowY: 'auto' }}>
              <div className="inline-hint">
                {reviewTarget.studentName} · {reviewTarget.courseName} · {reviewTarget.when}
              </div>
              <div className="fi-row">
                <div className="fi">
                  <span className="fi-label">教务记录</span>
                  <div className="fi-input" style={{ background: 'var(--pearl)' }}>
                    {reviewTarget.hours} 课时
                  </div>
                </div>
                <div className="fi">
                  <span className="fi-label">学习机上报</span>
                  <div
                    className="fi-input"
                    style={{
                      background: 'var(--pearl)',
                      color: reviewTarget.machineHours === null ? 'var(--ink-40)' : 'var(--err-ink)',
                    }}
                  >
                    {reviewTarget.machineHours === null ? '未上报' : `${reviewTarget.machineHours} 课时`}
                  </div>
                </div>
              </div>
              <div className="fi">
                <span className="fi-label">本次结算课时（以哪个为准）</span>
                <input
                  className="fi-input"
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={reviewHours}
                  onChange={(e) => setReviewHours(e.target.value)}
                />
              </div>
              <div className="fi">
                <span className="fi-label">复核说明（写入核销记录）</span>
                <input
                  className="fi-input"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="例如：学习机提前退出，按教务记录结算"
                />
              </div>
              <div className="inline-hint">
                提交后将按结算课时扣减课时包，记录标记为「已结算」，不可再修改。
                {!canAdmin && ' 当前账号为教师，复核需要教务或负责人权限。'}
              </div>
            </div>
            <div className="ov-foot">
              <div className="sp" />
              <button className="btn btn-ghost" onClick={() => setReviewTarget(null)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={submitReview}
                disabled={!canAdmin || busyId === reviewTarget.id}
              >
                {busyId === reviewTarget.id ? '提交中…' : '确认结算'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast state={toast} />
    </>
  )
}
