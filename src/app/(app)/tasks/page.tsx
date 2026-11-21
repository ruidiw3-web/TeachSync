import { PageHeader } from '@/components/page-header'

export default function Page() {
  return (
    <div className="page pnt">

      <PageHeader />

      <div className="page-body">
      <div className="sum-row">
      <div className="sum-chip" data-go="p02"><span className="stat-bar" style={{background: 'var(--primary)'}}></span>
      <div className="sum-main"><span className="sum-label">今日课时</span><span className="sum-value">18 节</span></div>
      </div>
      <div className="sum-chip" data-go="p07"><span className="stat-bar" style={{background: 'var(--err)'}}></span>
      <div className="sum-main"><span className="sum-label">待核销</span><span className="sum-value">12 笔</span></div>
      </div>
      <div className="sum-chip" data-go="p15"><span className="stat-bar" style={{background: 'var(--warn)'}}></span>
      <div className="sum-main"><span className="sum-label">待打印</span><span className="sum-value">5 份</span></div>
      </div>
      <div className="sum-chip" data-go="p21"><span className="stat-bar" style={{background: 'var(--ai-violet)'}}></span>
      <div className="sum-main"><span className="sum-label">待提交日报</span><span className="sum-value">3 份</span></div>
      </div>
      </div>

      <div className="card list-card">
      <div className="lbody">
      <div className="grp-head">核销与对账 · 3 项</div>
      <div className="lrow" data-go="p07">
      <span className="todo-icon" style={{background: 'var(--err-bg)', color: 'var(--err)'}}><svg className="ic" width="14" height="14"><use href="#i-alert" /></svg></span>
      <div className="lrow-main"><span className="lrow-title">3 笔课时对账异常待复核</span><span className="lrow-sub">教务核销与学习机上报课时不一致，已冻结对应课时</span></div>
      <span className="pill pill-err">优先处理</span><svg className="ic" width="12" height="12" style={{color: 'var(--ink-30)'}}><use href="#i-chevron-right" /></svg>
      </div>
      <div className="lrow" data-go="p07">
      <span className="todo-icon" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}><svg className="ic" width="14" height="14"><use href="#i-verify" /></svg></span>
      <div className="lrow-main"><span className="lrow-title">9 笔课时可直接核销</span><span className="lrow-sub">两侧数据一致，支持批量核销</span></div>
      <span className="pill pill-blue">一键处理</span><svg className="ic" width="12" height="12" style={{color: 'var(--ink-30)'}}><use href="#i-chevron-right" /></svg>
      </div>

      <div className="grp-head">错题与复习 · 7 项</div>
      <div className="lrow" data-go="p15">
      <span className="todo-icon" style={{background: 'var(--warn-bg)', color: 'var(--warn-ink)'}}><svg className="ic" width="14" height="14"><use href="#i-printer" /></svg></span>
      <div className="lrow-main"><span className="lrow-title">5 份错题讲解待打印</span><span className="lrow-sub">最早生成于 4 小时前，建议课前完成</span></div>
      <span className="pill pill-warn">超时 4h</span><svg className="ic" width="12" height="12" style={{color: 'var(--ink-30)'}}><use href="#i-chevron-right" /></svg>
      </div>
      <div className="lrow" data-go="p15">
      <span className="todo-icon" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}><svg className="ic" width="14" height="14"><use href="#i-mistake" /></svg></span>
      <div className="lrow-main"><span className="lrow-title">今日 4 名学生复习提醒到期</span><span className="lrow-sub">张伟已逾期，李萌今日到期</span></div>
      <span className="pill pill-err">1 项逾期</span><svg className="ic" width="12" height="12" style={{color: 'var(--ink-30)'}}><use href="#i-chevron-right" /></svg>
      </div>

      <div className="grp-head">日报与家长 · 3 项</div>
      <div className="lrow" data-go="p21">
      <span className="todo-icon" style={{background: 'var(--ai-violet-bg)', color: 'var(--ai-violet)'}}><svg className="ic" width="14" height="14"><use href="#i-report" /></svg></span>
      <div className="lrow-main"><span className="lrow-title">3 份日报待提交</span><span className="lrow-sub">AI 草稿已生成，补充家长提示后即可推送</span></div>
      <span className="pill pill-blue">待确认</span><svg className="ic" width="12" height="12" style={{color: 'var(--ink-30)'}}><use href="#i-chevron-right" /></svg>
      </div>

      <div className="grp-head">审批与考勤 · 2 项</div>
      <div className="lrow" data-go="p20">
      <span className="todo-icon" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}><svg className="ic" width="14" height="14"><use href="#i-gift" /></svg></span>
      <div className="lrow-main"><span className="lrow-title">2 条积分兑换待审批</span><span className="lrow-sub">王悦申请文具礼盒（120 分）</span></div>
      <span className="pill pill-warn">待审批</span><svg className="ic" width="12" height="12" style={{color: 'var(--ink-30)'}}><use href="#i-chevron-right" /></svg>
      </div>
      <div className="lrow" data-go="p18">
      <span className="todo-icon" style={{background: 'var(--ok-bg)', color: 'var(--ok-ink)'}}><svg className="ic" width="14" height="14"><use href="#i-clock" /></svg></span>
      <div className="lrow-main"><span className="lrow-title">高一物理 6 人考勤待确认</span><span className="lrow-sub">已签到 2 人，其余 4 人待处理</span></div>
      <span className="pill pill-gray">进行中</span><svg className="ic" width="12" height="12" style={{color: 'var(--ink-30)'}}><use href="#i-chevron-right" /></svg>
      </div>
      </div>
      </div>
      </div>

    </div>
  )
}
