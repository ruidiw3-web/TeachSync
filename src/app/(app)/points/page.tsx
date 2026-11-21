import { PageHeader } from '@/components/page-header'

export default function Page() {
  return (
    <div className="page p20">

      <PageHeader />

      <div className="page-body">
      <div className="stat-row">
      <div className="stat-card"><span className="stat-bar" style={{background: 'var(--warn)'}}></span>
      <div className="stat-main"><span className="stat-label">待审批申请</span><span className="stat-value" id="pt-pending">2 条</span></div>
      </div>
      <div className="stat-card"><span className="stat-bar" style={{background: 'var(--ok)'}}></span>
      <div className="stat-main"><span className="stat-label">本月发放积分</span><span className="stat-value">3,240 分</span></div>
      </div>
      <div className="stat-card"><span className="stat-bar" style={{background: 'var(--primary)'}}></span>
      <div className="stat-main"><span className="stat-label">本月兑换</span><span className="stat-value">18 次</span></div>
      </div>
      <div className="stat-card"><span className="stat-bar" style={{background: 'var(--ink-30)'}}></span>
      <div className="stat-main"><span className="stat-label">冻结积分</span><span className="stat-value">240 分</span></div>
      </div>
      </div>

      <div className="card list-card">
      <div className="card-head">
      <span className="card-title">兑换申请</span>
      <div className="tb-spacer"></div>
      <div className="seg-tags" id="pt-filter">
      <span className="seg-tag is-on">全部 3</span>
      <span className="seg-tag is-err">待审批 2</span>
      <span className="seg-tag">已通过 1</span>
      </div>
      </div>
      <div className="lbody" id="pt-list">
      <div className="lrow" data-pt-state="pending">
      <span className="avatar-task" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}>王</span>
      <div className="lrow-main"><span className="lrow-title">王悦 · 文具礼盒</span><span className="lrow-sub">消耗 120 分 · 当前余额 320 分 · 申请于 09-16 14:20</span></div>
      <div className="lrow-right">
      <span className="pill pill-warn" data-pt-pill>待审批</span>
      <button className="btn btn-xs btn-primary" data-pt-act="ok">通过</button>
      <button className="btn btn-xs btn-ghost" data-pt-act="no">驳回</button>
      </div>
      </div>
      <div className="lrow" data-pt-state="pending">
      <span className="avatar-task" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}>张</span>
      <div className="lrow-main"><span className="lrow-title">张伟 · 错题本套装</span><span className="lrow-sub">消耗 80 分 · 当前余额 210 分 · 申请于 09-17 09:05</span></div>
      <div className="lrow-right">
      <span className="pill pill-warn" data-pt-pill>待审批</span>
      <button className="btn btn-xs btn-primary" data-pt-act="ok">通过</button>
      <button className="btn btn-xs btn-ghost" data-pt-act="no">驳回</button>
      </div>
      </div>
      <div className="lrow" data-pt-state="done">
      <span className="avatar-task" style={{background: 'var(--warn-bg)', color: 'var(--warn-ink)'}}>李</span>
      <div className="lrow-main"><span className="lrow-title">李萌 · 免作业券</span><span className="lrow-sub">消耗 60 分 · 当前余额 480 分 · 已于 09-14 发放完成</span></div>
      <div className="lrow-right"><span className="pill pill-ok" data-pt-pill>已通过</span></div>
      </div>
      </div>
      </div>
      </div>

    </div>
  )
}
