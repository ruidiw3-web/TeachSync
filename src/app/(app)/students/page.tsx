import { PageHeader } from '@/components/page-header'

export default function Page() {
  return (
    <div className="page p13">

      <PageHeader />

      <div className="page-body">
      <div className="filter-row">
      <div className="seg-filter" id="stu-filter">
      <span className="seg-item is-on">全部 24</span>
      <span className="seg-item">进度正常 19</span>
      <span className="seg-item is-err">有异常 5</span>
      </div>
      <div className="tb-spacer"></div>
      <button className="tool-btn"><svg className="ic" width="15" height="15"><use href="#i-filter" /></svg><span>按班级筛选</span></button>
      <button className="tool-btn" id="stu-sort"><span>按进度排序</span><svg className="ic" width="12" height="12"><use href="#i-chevron-down" /></svg></button>
      </div>

      <div className="stu-grid" id="stu-grid">
      <div className="stu-card" data-stu-name="张伟" data-stu-className="初三数学 · 冲刺A班" data-stu-bad="1" data-stu-progress="72">
      <div className="stu-head">
      <span className="avatar-task" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}>张</span>
      <div className="stu-main"><span className="stu-name">张伟</span><span className="stu-class">初三数学 · 冲刺A班</span></div>
      <span className="pill pill-err">待办 2</span>
      </div>
      <div className="stu-bar"><div className="progress-track"><div className="progress-fill" style={{width: '72%'}}></div></div><span className="stu-bar-label">72%</span></div>
      <div className="stu-meta"><span>剩余 12 课时</span><span>错题 12 道</span><span>出勤 96%</span></div>
      </div>

      <div className="stu-card" data-stu-name="李萌" data-stu-className="高一物理 · 力学专题" data-stu-progress="88">
      <div className="stu-head">
      <span className="avatar-task" style={{background: 'var(--warn-bg)', color: 'var(--warn-ink)'}}>李</span>
      <div className="stu-main"><span className="stu-name">李萌</span><span className="stu-class">高一物理 · 力学专题</span></div>
      <span className="pill pill-ok">进度正常</span>
      </div>
      <div className="stu-bar"><div className="progress-track"><div className="progress-fill" style={{width: '88%'}}></div></div><span className="stu-bar-label">88%</span></div>
      <div className="stu-meta"><span>剩余 14 课时</span><span>错题 8 道</span><span>出勤 100%</span></div>
      </div>

      <div className="stu-card" data-stu-name="王悦" data-stu-className="初三英语 · 语法精讲" data-stu-bad="1" data-stu-progress="45">
      <div className="stu-head">
      <span className="avatar-task" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}>王</span>
      <div className="stu-main"><span className="stu-name">王悦</span><span className="stu-class">初三英语 · 语法精讲</span></div>
      <span className="pill pill-err">进度停滞 14 天</span>
      </div>
      <div className="stu-bar"><div className="progress-track"><div className="progress-fill" style={{width: '45%'}}></div></div><span className="stu-bar-label">45%</span></div>
      <div className="stu-meta"><span>剩余 6 课时</span><span>错题 5 道</span><span>出勤 92%</span></div>
      </div>

      <div className="stu-card" data-stu-name="赵子轩" data-stu-className="初二数学 · 几何证明" data-stu-bad="1" data-stu-progress="63">
      <div className="stu-head">
      <span className="avatar-task" style={{background: 'var(--canvas)', color: 'var(--ink-56)'}}>赵</span>
      <div className="stu-main"><span className="stu-name">赵子轩</span><span className="stu-class">初二数学 · 几何证明</span></div>
      <span className="pill pill-warn">待办 1</span>
      </div>
      <div className="stu-bar"><div className="progress-track"><div className="progress-fill" style={{width: '63%'}}></div></div><span className="stu-bar-label">63%</span></div>
      <div className="stu-meta"><span>剩余 9 课时</span><span>错题 7 道</span><span>出勤 88%</span></div>
      </div>

      <div className="stu-card" data-stu-name="刘思远" data-stu-className="初二数学 · 几何证明" data-stu-progress="91">
      <div className="stu-head">
      <span className="avatar-task" style={{background: 'var(--canvas)', color: 'var(--ink-56)'}}>刘</span>
      <div className="stu-main"><span className="stu-name">刘思远</span><span className="stu-class">初二数学 · 几何证明</span></div>
      <span className="pill pill-ok">进度正常</span>
      </div>
      <div className="stu-bar"><div className="progress-track"><div className="progress-fill" style={{width: '91%'}}></div></div><span className="stu-bar-label">91%</span></div>
      <div className="stu-meta"><span>剩余 16 课时</span><span>错题 3 道</span><span>出勤 100%</span></div>
      </div>

      <div className="stu-card" data-stu-name="陈嘉禾" data-stu-className="初三数学 · 冲刺B班" data-stu-bad="1" data-stu-progress="54">
      <div className="stu-head">
      <span className="avatar-task" style={{background: 'var(--ok-bg)', color: 'var(--ok-ink)'}}>陈</span>
      <div className="stu-main"><span className="stu-name">陈嘉禾</span><span className="stu-class">初三数学 · 冲刺B班</span></div>
      <span className="pill pill-err">连续缺勤 2 次</span>
      </div>
      <div className="stu-bar"><div className="progress-track"><div className="progress-fill" style={{width: '54%'}}></div></div><span className="stu-bar-label">54%</span></div>
      <div className="stu-meta"><span>剩余 8 课时</span><span>错题 9 道</span><span>出勤 83%</span></div>
      </div>
      </div>
      </div>

    </div>
  )
}
