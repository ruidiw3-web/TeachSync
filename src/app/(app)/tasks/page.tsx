import { connection } from 'next/server'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { Icon } from '@/components/icons'
import { runAgentScan, type AgentSignal, type Severity } from '@/lib/agent/scan'
import { DraftRow } from './draft-row'

const SEV_STYLE: Record<Severity, { pill: string; label: string }> = {
  high: { pill: 'pill-err', label: '优先处理' },
  medium: { pill: 'pill-warn', label: '建议处理' },
  low: { pill: 'pill-gray', label: '可延后' },
}

const CAT_ICON: Record<string, string> = {
  课时对账异常: 'verify',
  核销积压: 'verify',
  错题印了没讲: 'printer',
  课时余额不足: 'users',
  课时包临期: 'clock',
  排课冲突: 'calendar-check',
  反馈草稿: 'doc',
  复习逾期: 'mistake',
}

function SignalRow({ s }: { s: AgentSignal }) {
  const sev = SEV_STYLE[s.severity]
  return (
    <Link href={s.href} className="lrow ag-row">
      <span
        className="todo-icon"
        style={{
          background: s.severity === 'high' ? 'var(--err-bg)' : 'var(--primary-tint)',
          color: s.severity === 'high' ? 'var(--err)' : 'var(--primary)',
        }}
      >
        <Icon name={CAT_ICON[s.category] ?? 'alert'} size={14} />
      </span>
      <div className="lrow-main">
        <span className="lrow-title">{s.title}</span>
        <span className="lrow-sub">{s.detail}</span>
      </div>
      <span className={`pill ${sev.pill}`}>{sev.label}</span>
      <span className="ag-go">
        {s.action}
        <Icon name="chevron-right" size={12} />
      </span>
    </Link>
  )
}

function Group({
  title,
  sub,
  items,
}: {
  title: string
  sub: string
  items: AgentSignal[]
}) {
  return (
    <>
      <div className="grp-head">
        {title} · {items.length} 项
        <span className="ag-grp-sub">{sub}</span>
      </div>
      {items.length === 0 ? (
        <div className="ag-empty">
          <Icon name="check" size={14} />
          <span>{title}目前没有需要处理的事项</span>
        </div>
      ) : (
        items.map((s) => <SignalRow key={s.id} s={s} />)
      )}
    </>
  )
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()
  const [report, sp] = await Promise.all([runAgentScan(), searchParams])
  const autoStudent = typeof sp.draft === 'string' ? sp.draft : ''
  const alerts = report.signals.filter((s) => s.kind === 'ALERT')
  const todos = report.signals.filter((s) => s.kind === 'TODO')
  const drafts = report.signals.filter((s) => s.kind === 'DRAFT')
  const clean = report.signals.length === 0

  const scannedAt = report.generatedAt
    ? new Date(report.generatedAt).toLocaleTimeString('zh-CN', {
        hour12: false,
        timeZone: 'Asia/Shanghai',
      })
    : '未连接数据'

  return (
    <div className="page pnt">
      <PageHeader />

      <div className="page-body">
        {/* 概览 */}
        <div className="sum-row">
          <div className="sum-chip">
            <span className="stat-bar" style={{ background: 'var(--err)' }} />
            <div className="sum-main">
              <span className="sum-label">高危预警</span>
              <span className="sum-value">{report.counts.high} 项</span>
            </div>
          </div>
          <div className="sum-chip">
            <span className="stat-bar" style={{ background: 'var(--warn)' }} />
            <div className="sum-main">
              <span className="sum-label">待办提醒</span>
              <span className="sum-value">{report.counts.todo} 项</span>
            </div>
          </div>
          <div className="sum-chip">
            <span className="stat-bar" style={{ background: 'var(--ai-violet)' }} />
            <div className="sum-main">
              <span className="sum-label">反馈草稿待生成</span>
              <span className="sum-value">{report.counts.draft} 份</span>
            </div>
          </div>
          <div className="sum-chip">
            <span className="stat-bar" style={{ background: 'var(--ok)' }} />
            <div className="sum-main">
              <span className="sum-label">命中规则</span>
              <span className="sum-value">
                {report.ruleBook.filter((r) => r.hit > 0).length} / {report.ruleBook.length}
              </span>
            </div>
          </div>
        </div>

        {/* 主体清单 */}
        <div className="card list-card">
          <div className="card-head">
            <span className="rl-title">Agent 巡检结果</span>
            <span className="rl-count">{scannedAt} 扫描</span>
          </div>

          <div className="lbody">
            {clean ? (
              <div className="ag-empty ag-empty-lg">
                <Icon name="check" size={18} />
                <div>
                  <strong>全部正常</strong>
                  <p>八项规则都没有命中，今天不需要额外处理。</p>
                </div>
              </div>
            ) : (
              <>
                <Group title="异常预警" sub="会直接影响收费或课表，建议当天处理" items={alerts} />
                <Group title="待办提醒" sub="不影响今天上课，但拖久了会变成问题" items={todos} />

                <div className="grp-head">
                  反馈草稿 · {drafts.length} 份
                  <span className="ag-grp-sub">已结课但当天还没发给家长的</span>
                </div>
                {drafts.length === 0 ? (
                  <div className="ag-empty">
                    <Icon name="check" size={14} />
                    <span>今天的反馈草稿都已生成</span>
                  </div>
                ) : (
                  drafts.map((s) => (
                    <DraftRow
                      key={s.id}
                      studentId={s.studentId ?? ''}
                      refDate={s.refDate ?? ''}
                      title={s.title}
                      detail={s.detail}
                      autoOpen={!!autoStudent && autoStudent === s.studentId}
                    />
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* 规则说明 */}
        <div className="card ag-rules">
          <div className="card-head">
            <span className="rl-title">巡检规则</span>
            <span className="rl-count">每次进入本页实时计算</span>
          </div>
          <div className="ag-rule-grid">
            {report.ruleBook.map((r) => (
              <div key={r.name} className={`ag-rule${r.hit > 0 ? ' is-hit' : ''}`}>
                <div className="ag-rule-top">
                  <span className="ag-rule-name">{r.name}</span>
                  <span className={`ag-rule-hit${r.hit > 0 ? ' is-on' : ''}`}>
                    {r.hit > 0 ? `${r.hit} 条` : '通过'}
                  </span>
                </div>
                <span className="ag-rule-note">{r.note}</span>
              </div>
            ))}
          </div>
          <p className="ag-foot">
            每条都由数据库里的具体记录推出，点击可直接跳到对应页面处理。草稿只引用当日考勤、课时与错题记录，查不到的部分会明确标注缺口，不做推断。
          </p>
        </div>
      </div>
    </div>
  )
}
