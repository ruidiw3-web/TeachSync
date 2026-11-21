import { PageHeader } from '@/components/page-header'

export default function Page() {
  return (
    <div className="page p18">

      <PageHeader />

      <div className="page-body">
      <div className="att-strip">
      <svg className="ic" width="18" height="18"><use href="#i-clock" /></svg>
      <div className="att-strip-main">
      <span className="att-strip-title">高一物理 · 力学专题 · 10:15-11:45</span>
      <span className="att-strip-desc" id="att-desc">205 教室 · 张老师 · 应到 6 人，已签到 3 人</span>
      </div>
      <button className="btn btn-sm btn-primary" id="att-all">批量签到</button>
      </div>

      <div className="card list-card">
      <div className="card-head">
      <span className="card-title">本课次学生名单</span>
      <div className="tb-spacer"></div>
      <span className="count-pill" id="att-count">已签到 2 / 6</span>
      </div>
      <div className="lbody" id="att-list">
      <div className="lrow" data-att>
      <span className="avatar-task" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}>李</span>
      <div className="lrow-main"><span className="lrow-title">李萌</span><span className="lrow-sub">高一物理 · 力学专题 · 剩余 14 课时</span></div>
      <div className="lrow-right"><span className="pill pill-gray" data-att-pill>未签到</span><button className="btn btn-xs btn-primary" data-att-act="in">签到</button></div>
      </div>
      <div className="lrow" data-att>
      <span className="avatar-task" style={{background: 'var(--canvas)', color: 'var(--ink-56)'}}>刘</span>
      <div className="lrow-main"><span className="lrow-title">刘思远</span><span className="lrow-sub">高一物理 · 力学专题 · 剩余 16 课时</span></div>
      <div className="lrow-right"><span className="pill pill-gray" data-att-pill>未签到</span><button className="btn btn-xs btn-primary" data-att-act="in">签到</button></div>
      </div>
      <div className="lrow" data-att>
      <span className="avatar-task" style={{background: 'var(--ok-bg)', color: 'var(--ok-ink)'}}>陈</span>
      <div className="lrow-main"><span className="lrow-title">陈嘉禾</span><span className="lrow-sub">高一物理 · 力学专题 · 剩余 8 课时</span></div>
      <div className="lrow-right"><span className="pill pill-gray" data-att-pill>未签到</span><button className="btn btn-xs btn-primary" data-att-act="in">签到</button></div>
      </div>
      <div className="lrow" data-att>
      <span className="avatar-task" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}>张</span>
      <div className="lrow-main"><span className="lrow-title">张伟</span><span className="lrow-sub">高一物理 · 力学专题 · 剩余 12 课时</span></div>
      <div className="lrow-right"><span className="pill pill-blue" data-att-pill>已签到</span><button className="btn btn-xs btn-ghost" data-att-act="out">签退</button></div>
      </div>
      <div className="lrow" data-att>
      <span className="avatar-task" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}>王</span>
      <div className="lrow-main"><span className="lrow-title">王悦</span><span className="lrow-sub">高一物理 · 力学专题 · 剩余 6 课时</span></div>
      <div className="lrow-right"><span className="pill pill-ok" data-att-pill>出勤</span><button className="btn btn-xs btn-ghost" data-att-act="fix">修正</button></div>
      </div>
      <div className="lrow" data-att>
      <span className="avatar-task" style={{background: 'var(--canvas)', color: 'var(--ink-56)'}}>赵</span>
      <div className="lrow-main"><span className="lrow-title">赵子轩</span><span className="lrow-sub">高一物理 · 力学专题 · 剩余 9 课时</span></div>
      <div className="lrow-right"><span className="pill pill-warn" data-att-pill>已请假</span><button className="btn btn-xs btn-ghost" data-att-act="undo">撤销请假</button></div>
      </div>
      </div>
      </div>
      </div>

    </div>
  )
}
