import { PageHeader } from '@/components/page-header'
import { getDashboard } from '@/lib/queries'

export default async function Page() {
  const d = await getDashboard()

  return (
    <div className="page p01">

      <PageHeader />

      <div className="page-body">
      {/* KPI 行 */}
      <div className="kpi-row">
      <div className="kpi">
      <span className="kpi-label">今日课时</span>
      <div className="kpi-value-row"><span className="kpi-value c-ink">{d.todayLessons}</span><span className="kpi-unit">节</span></div>
      <span className="kpi-change c-ok">按今日课表统计</span>
      </div>
      <div className="kpi">
      <span className="kpi-label">待核销课时</span>
      <div className="kpi-value-row"><span className="kpi-value c-err">{d.pendingConsumptions}</span><span className="kpi-unit">笔</span></div>
      <span className="kpi-change c-err">其中 {d.abnormalConsumptions} 笔对账异常</span>
      </div>
      <div className="kpi">
      <span className="kpi-label">待打印任务</span>
      <div className="kpi-value-row"><span className="kpi-value c-warn">{d.pendingPrints}</span><span className="kpi-unit">份</span></div>
      <span className="kpi-change c-warn">含超时升级件</span>
      </div>
      <div className="kpi">
      <span className="kpi-label">待提交日报</span>
      <div className="kpi-value-row"><span className="kpi-value c-ink">{d.pendingReports}</span><span className="kpi-unit">份</span></div>
      <span className="kpi-change c-ok">草稿已生成待确认</span>
      </div>
      </div>

      {/* 主体两栏 */}
      <div className="p01-main">
      {/* 左栏：今日课表 */}
      <div className="col-left">
      <div className="card schedule-card">
      <div className="card-head">
      <span className="card-title">今日课表</span>
      <span className="count-pill">{d.lessons.length} 节课</span>
      <div className="tb-spacer"></div>
      <svg className="ic" width="16" height="16" style={{color: 'var(--ink-56)'}}><use href="#i-more" /></svg>
      </div>
      <div className="scroll-list">
      {d.lessons.length === 0 && (
        <div className="course-row">
          <span className="course-bar"></span>
          <div className="course-main">
            <span className="course-name">今天还没有排课</span>
            <span className="course-meta">去「排课中心」新建课次</span>
          </div>
        </div>
      )}
      {d.lessons.map((l) => {
        const live = l.status === 'ONGOING'
        const consumed = l.status === 'CONSUMED'
        const finished = l.status === 'FINISHED'
        return (
          <div key={l.id} className={`course-row${live ? ' is-live' : ''}`}>
            <span className={`course-bar${live ? ' blue' : finished ? ' amber' : consumed ? '' : ''}`}></span>
            <div className="course-main">
              <span className="course-name">{l.title}</span>
              <span className="course-meta">{l.time} · {l.meta}</span>
            </div>
            {live ? (
              <span className="pill live-pill"><span className="live-dot"></span>进行中</span>
            ) : consumed ? (
              <span className="pill pill-gray">已核销</span>
            ) : finished ? (
              <span className="pill pill-warn">待核销</span>
            ) : (
              <span className="pill pill-gray">待上课</span>
            )}
          </div>
        )
      })}

      <div className="list-divider"></div>

      <div className="group-head">
      <span className="group-title">今日复习提醒</span>
      <span className="group-count">{d.reviews.length} 名学生</span>
      </div>

      {d.reviews.length === 0 && (
        <div className="review-row">
          <span className="avatar-sm" style={{background: 'var(--canvas)', color: 'var(--ink-56)'}}>—</span>
          <div className="review-main">
            <span className="review-name">今天没有到期复习</span>
            <span className="review-detail">讲解录入后系统会自动排复习周期</span>
          </div>
        </div>
      )}
      {d.reviews.map((r) => (
        <div key={r.id} className="review-row">
          <span className="avatar-sm" style={{background: r.tone === 'err' ? 'var(--err-bg)' : 'var(--canvas)', color: r.tone === 'err' ? 'var(--err-ink)' : 'var(--ink-56)'}}>{r.name.slice(0, 1)}</span>
          <div className="review-main">
            <span className="review-name">{r.name}</span>
            <span className="review-detail">{r.detail}</span>
          </div>
          <span className={`pill ${r.tone === 'err' ? 'pill-err' : 'pill-warn'} pill-review`} style={{fontWeight: '500'}}>{r.label}</span>
        </div>
      ))}
      </div>
      </div>
      </div>

      {/* 右栏：待处理 + AI + 概览 */}
      <div className="col-right">
      <div className="card" style={{flex: 'none'}}>
      <div className="card-head">
      <span className="card-title">待处理事项</span>
      <div className="tb-spacer"></div>
      <span className="link">查看全部</span>
      </div>
      <div className="todo-list">
      <div className="todo-row">
      <span className="todo-icon" style={{background: 'var(--err-bg)', color: 'var(--err)'}}>
      <svg className="ic" width="14" height="14"><use href="#i-alert" /></svg>
      </span>
      <div className="todo-main">
      <span className="todo-title">{d.abnormalConsumptions} 笔课时对账异常</span>
      <span className="todo-desc">教务核销与学习机上报课时不一致</span>
      </div>
      <svg className="ic" width="12" height="12" style={{color: 'var(--ink-30)'}}><use href="#i-chevron-right" /></svg>
      </div>
      <div className="todo-row">
      <span className="todo-icon" style={{background: 'var(--warn-bg)', color: 'var(--warn-ink)'}}>
      <svg className="ic" width="14" height="14"><use href="#i-clock" /></svg>
      </span>
      <div className="todo-main">
      <span className="todo-title">{d.pendingPrints} 份错题讲解待打印</span>
      <span className="todo-desc">最早生成于 4 小时前，建议课前完成</span>
      </div>
      <svg className="ic" width="12" height="12" style={{color: 'var(--ink-30)'}}><use href="#i-chevron-right" /></svg>
      </div>
      <div className="todo-row">
      <span className="todo-icon" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}>
      <svg className="ic" width="14" height="14"><use href="#i-report" /></svg>
      </span>
      <div className="todo-main">
      <span className="todo-title">{d.pendingReports} 份日报待提交</span>
      <span className="todo-desc">系统已生成草稿，确认后即可推送家长</span>
      </div>
      <svg className="ic" width="12" height="12" style={{color: 'var(--ink-30)'}}><use href="#i-chevron-right" /></svg>
      </div>
      <div className="todo-row">
      <span className="todo-icon" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}>
      <svg className="ic" width="14" height="14"><use href="#i-users" /></svg>
      </span>
      <div className="todo-main">
      <span className="todo-title">{d.pendingRedeems} 条积分兑换待审批</span>
      <span className="todo-desc">去「积分」页审批或驳回</span>
      </div>
      <svg className="ic" width="12" height="12" style={{color: 'var(--ink-30)'}}><use href="#i-chevron-right" /></svg>
      </div>
      </div>
      </div>

      <div className="card overview-card">
      <div className="overview-head">
      <span className="overview-title">本周教务耗时</span>
      <span className="trend-pill">↓ 38%</span>
      </div>
      <div className="progress-track"><div className="progress-fill"></div></div>
      <div className="overview-foot">
      <span className="overview-left">5.2 小时 / 目标 8.4 小时</span>
      <span className="overview-right">北极星指标</span>
      </div>
      </div>
      </div>
      </div>
      </div>

    </div>
  )
}
