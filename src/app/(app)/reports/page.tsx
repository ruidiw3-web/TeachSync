import { PageHeader } from '@/components/page-header'

export default function Page() {
  return (
    <div className="page p21">

      <PageHeader />

      <div className="page-body">
      {/* 左：日报列表 */}
      <div className="card report-list">
      <div className="card-head">
      <span className="rl-title">今日日报</span>
      <span className="rl-count">5 人</span>
      </div>
      <div className="rl-body">
      <div className="rl-item is-on">
      <span className="avatar-30" style={{background: 'var(--primary)', color: '#fff'}}>张</span>
      <div className="rl-main">
      <span className="rl-name">张伟</span>
      <span className="rl-sub is-on">初三数学 · 已生成草稿</span>
      </div>
      <span className="dot-unread-sm"></span>
      </div>
      <div className="rl-item">
      <span className="avatar-30" style={{background: 'var(--warn-bg)', color: 'var(--warn-ink)'}}>李</span>
      <div className="rl-main">
      <span className="rl-name">李萌</span>
      <span className="rl-sub">高一物理 · 已生成草稿</span>
      </div>
      <span className="dot-unread-sm"></span>
      </div>
      <div className="rl-item">
      <span className="avatar-30" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}>王</span>
      <div className="rl-main">
      <span className="rl-name">王悦</span>
      <span className="rl-sub">初三英语 · 已生成草稿</span>
      </div>
      <span className="dot-unread-sm"></span>
      </div>
      <div className="rl-item">
      <span className="avatar-30" style={{background: 'var(--ok-bg)', color: 'var(--ok-ink)'}}>赵</span>
      <div className="rl-main">
      <span className="rl-name">赵子轩</span>
      <span className="rl-sub">初二数学 · 家长已读</span>
      </div>
      </div>
      <div className="rl-item">
      <span className="avatar-30" style={{background: 'var(--canvas)', color: 'var(--ink-56)'}}>刘</span>
      <div className="rl-main">
      <span className="rl-name">刘思远</span>
      <span className="rl-sub">初二数学 · 家长已读</span>
      </div>
      </div>
      </div>
      </div>

      {/* 右：日报编辑器 */}
      <div className="card editor">
      <div className="editor-head">
      <span className="avatar-lg">张</span>
      <div className="editor-id">
      <span className="editor-name">张伟 · 初三数学 冲刺A班</span>
      <span className="editor-sub">2026-09-17 · 第 3 周 周三</span>
      </div>
      <span className="ai-draft-chip">
      <svg className="ic" width="12" height="12"><use href="#i-ai" /></svg>
      <span>AI 草稿</span>
      </span>
      </div>

      <div className="editor-body">
      {/* 课堂表现 */}
      <div className="section">
      <div className="section-head">
      <span className="section-title">课堂表现</span>
      <span className="src-tag">系统生成</span>
      </div>
      <div className="field">本节课专注度良好，二次函数最值问题的解题步骤已能独立完成。在第 3 组练习中主动帮助同学讲解思路，课堂参与度高。</div>
      </div>

      {/* 知识点掌握 */}
      <div className="section">
      <div className="section-head">
      <span className="section-title">知识点掌握</span>
      <span className="src-tag">系统生成</span>
      </div>
      <div className="kp-tags">
      <span className="kp-tag kp-ok"><span className="kp-dot"></span>二次函数最值</span>
      <span className="kp-tag kp-ok"><span className="kp-dot"></span>顶点式配方</span>
      <span className="kp-tag kp-warn"><span className="kp-dot"></span>区间单调性判断</span>
      <span className="kp-tag kp-err"><span className="kp-dot"></span>含参最值讨论</span>
      </div>
      </div>

      {/* 课后作业 */}
      <div className="section">
      <div className="section-head">
      <span className="section-title">课后作业</span>
      <span className="src-tag">系统生成</span>
      </div>
      <div className="field">完成《二次函数》专项练习第 12-18 题（含参最值 3 题），预计用时 25 分钟。建议家长监督练习本上的配方过程。</div>
      </div>

      {/* 复习安排 */}
      <div className="section">
      <div className="section-head">
      <span className="section-title">复习安排</span>
      <span className="src-tag is-ai">
      <svg className="ic" width="10" height="10"><use href="#i-ai" /></svg>
      <span>算法推荐</span>
      </span>
      </div>
      <div className="review-card">
      <div className="review-card-main">
      <span className="review-card-title">第 2 轮复习 · 建议 9月19日</span>
      <span className="review-card-desc">12 道错题 · 依据艾宾浩斯曲线（基础间隔 2 天 × 难度 1.2 × 掌握度 0.85）</span>
      </div>
      <button className="btn btn-xs btn-ghost" style={{background: '#fff', borderColor: 'var(--review-line)', color: 'var(--primary)', padding: '0 12px'}}>调整</button>
      </div>
      </div>

      {/* 家长提示 */}
      <div className="section">
      <div className="section-head">
      <span className="section-title">家长提示</span>
      <span className="src-tag is-todo">待填写</span>
      </div>
      <div className="field is-blank">填写给家长的个性化建议…（选填）</div>
      </div>
      </div>

      <div className="editor-foot">
      <span className="autosave">草稿已自动保存 · 用时 1分12秒</span>
      <button className="btn btn-sm btn-ghost" style={{padding: '0 18px'}}>预览家长版</button>
      <button className="btn btn-sm btn-primary" style={{padding: '0 20px'}}>确认并推送家长</button>
      </div>
      </div>
      </div>

    </div>
  )
}
