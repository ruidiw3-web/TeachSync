import { PageHeader } from '@/components/page-header'

export default function Page() {
  return (
    <div className="page pst">

      <PageHeader />

      <div className="page-body">
      <div className="set-nav" id="set-nav">
      <div className="set-item is-on" data-set="sync"><svg className="ic" width="16" height="16"><use href="#i-refresh" /></svg>数据同步监控<span className="set-lock">教务</span></div>
      <div className="set-item" data-set="bind"><svg className="ic" width="16" height="16"><use href="#i-verify" /></svg>学生绑定认领<span className="set-lock">教务</span></div>
      <div className="set-item" data-set="kb"><svg className="ic" width="16" height="16"><use href="#i-doc" /></svg>知识库管理<span className="set-lock">教务</span></div>
      <div className="set-item" data-set="org"><svg className="ic" width="16" height="16"><use href="#i-gear" /></svg>机构配置<span className="set-lock">教务</span></div>
      <div className="set-item" data-set="perm"><svg className="ic" width="16" height="16"><use href="#i-shield" /></svg>权限与成员<span className="set-lock">教务</span></div>
      </div>

      <div className="set-pane">
      <div className="card list-card pane is-on" data-pane="sync">
      <div className="card-head"><span className="card-title">数据源状态</span><div className="tb-spacer"></div><button className="btn btn-xs btn-ghost" data-set-refresh>刷新</button></div>
      <div className="lbody">
      <div className="src-row"><span className="src-dot" style={{background: 'var(--ok)'}}></span>
      <div className="lrow-main"><span className="lrow-title">学习机习题数据</span><span className="lrow-sub">水位 09:42 · 延迟 32s · 今日入库 1,284 条</span></div>
      <span className="pill pill-ok">正常</span>
      </div>
      <div className="src-row"><span className="src-dot" style={{background: 'var(--ok)'}}></span>
      <div className="lrow-main"><span className="lrow-title">学习机进度数据</span><span className="lrow-sub">水位 09:41 · 延迟 58s · 今日入库 326 条</span></div>
      <span className="pill pill-ok">正常</span>
      </div>
      <div className="src-row"><span className="src-dot" style={{background: 'var(--err)'}}></span>
      <div className="lrow-main"><span className="lrow-title">Webhook 异常事件队列</span><span className="lrow-sub">待重放 3 条 · 最近失败 09:36（签名校验失败）</span></div>
      <span className="pill pill-err">异常</span>
      <button className="btn btn-xs btn-danger" data-replay>重放</button>
      </div>
      </div>
      </div>

      <div className="card list-card pane" data-pane="bind">
      <div className="card-head"><span className="card-title">待认领设备事件</span><div className="tb-spacer"></div><span className="count-pill">3 条</span></div>
      <div className="lbody">
      <div className="src-row"><span className="src-dot" style={{background: 'var(--warn)'}}></span>
      <div className="lrow-main"><span className="lrow-title">设备 LK-88213</span><span className="lrow-sub">首次上报于 09-17 09:12 · 学科 初三数学 · 无法匹配学生</span></div>
      <button className="btn btn-xs btn-primary" data-bind>绑定至学生</button>
      </div>
      <div className="src-row"><span className="src-dot" style={{background: 'var(--warn)'}}></span>
      <div className="lrow-main"><span className="lrow-title">设备 LK-88240</span><span className="lrow-sub">首次上报于 09-16 18:40 · 学科 高一物理 · 无法匹配学生</span></div>
      <button className="btn btn-xs btn-primary" data-bind>绑定至学生</button>
      </div>
      </div>
      </div>

      <div className="card list-card pane" data-pane="kb">
      <div className="card-head"><span className="card-title">知识库文档</span><div className="tb-spacer"></div><button className="btn btn-xs btn-ghost" data-kb-up>上传文档</button></div>
      <div className="lbody">
      <div className="src-row">
      <div className="lrow-main"><span className="lrow-title">机构排课与课时规则 V3</span><span className="lrow-sub">L1 制度层 · 更新于 09-12 · 42 个分块</span></div>
      <span className="pill pill-ok">已生效</span>
      <button className="btn btn-xs btn-ghost" data-kb-arch>下架</button>
      </div>
      <div className="src-row">
      <div className="lrow-main"><span className="lrow-title">初三数学冲刺班讲义</span><span className="lrow-sub">L2 课程层 · 更新于 09-15 · 128 个分块</span></div>
      <span className="pill pill-ok">已生效</span>
      <button className="btn btn-xs btn-ghost" data-kb-arch>下架</button>
      </div>
      <div className="src-row">
      <div className="lrow-main"><span className="lrow-title">家长沟通话术手册</span><span className="lrow-sub">L4 话术层 · 上传于 09-17 09:20 · 处理失败（PDF 解析超时）</span></div>
      <span className="pill pill-err">处理失败</span>
      <button className="btn btn-xs btn-danger" data-kb-retry>重试</button>
      </div>
      </div>
      </div>

      <div className="card list-card pane" data-pane="org">
      <div className="card-head"><span className="card-title">机构配置</span><div className="tb-spacer"></div><span className="count-pill">浦东校区</span></div>
      <div className="lbody">
      <div className="pane-pad">
      <div className="form-row"><span className="form-label">机构时区</span><input className="form-input" value="Asia/Shanghai (UTC+8)" /></div>
      <div className="form-row"><span className="form-label">迟到判定</span><input className="form-input" value="开课 15 分钟未签到" /></div>
      <div className="form-row"><span className="form-label">缺勤判定</span><input className="form-input" value="超过课程时长 1/2 未签到" /></div>
      <div className="form-row"><span className="form-label">复习基础间隔</span><input className="form-input" value="2 天（艾宾浩斯曲线基数）" /></div>
      <div className="form-row"><span className="form-label">超时升级阈值</span><input className="form-input" value="24 小时未处理升级至管理者" /></div>
      <div className="form-row"><span className="form-label"></span><button className="btn btn-sm btn-primary" style={{padding: '0 18px'}} data-org-save>保存配置</button></div>
      </div>
      </div>
      </div>

      <div className="card list-card pane" data-pane="perm">
      <div className="card-head"><span className="card-title">机构成员</span><div className="tb-spacer"></div><span className="count-pill">6 人</span></div>
      <div className="lbody">
      <div className="src-row"><span className="avatar-task" style={{background: 'var(--primary)', color: '#fff'}}>陈</span>
      <div className="lrow-main"><span className="lrow-title">陈老师</span><span className="lrow-sub">chen@teachsync.cn · 名下 24 名学生</span></div>
      <span className="pill pill-gray">授课教师</span>
      </div>
      <div className="src-row"><span className="avatar-task" style={{background: 'var(--warn-bg)', color: 'var(--warn-ink)'}}>王</span>
      <div className="lrow-main"><span className="lrow-title">王教务</span><span className="lrow-sub">wang@teachsync.cn · 可修正对账差异、配置积分规则</span></div>
      <span className="pill pill-blue">教务管理员</span>
      </div>
      <div className="src-row"><span className="avatar-task" style={{background: 'var(--ok-bg)', color: 'var(--ok-ink)'}}>李</span>
      <div className="lrow-main"><span className="lrow-title">李校长</span><span className="lrow-sub">li@teachsync.cn · 查看全校区数据与经营指标</span></div>
      <span className="pill pill-ok">机构管理者</span>
      </div>
      </div>
      </div>
      </div>
      </div>

    </div>
  )
}
