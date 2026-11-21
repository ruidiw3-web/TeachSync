import { PageHeader } from '@/components/page-header'

export default function Page() {
  return (
    <div className="page p15">

      <PageHeader />

      <div className="page-body">
      <div className="filter-row">
      <div className="seg-filter">
      <span className="seg-item is-on">待打印 5</span>
      <span className="seg-item">打印中 0</span>
      <span className="seg-item">已打印 38</span>
      <span className="seg-item is-err">打印失败 1</span>
      </div>
      <div className="tb-spacer"></div>
      <button className="tool-btn">
      <span>按超时时间排序</span>
      <svg className="ic" width="12" height="12"><use href="#i-chevron-down" /></svg>
      </button>
      <button className="btn btn-primary">
      <svg className="ic" width="14" height="14"><use href="#i-printer" /></svg>
      <span>全部打印</span>
      </button>
      </div>

      <div className="task-grid">
      <div className="task-card is-overdue">
      <div className="task-head">
      <span className="avatar-task" style={{background: 'var(--err-bg)', color: 'var(--err-ink)'}}>张</span>
      <div className="task-id">
      <span className="task-name">张伟</span>
      <span className="task-class">初三数学 · 冲刺A班</span>
      </div>
      <span className="pill pill-err">
      <svg className="ic" width="11" height="11"><use href="#i-clock" /></svg>
      <span>超时 4h</span>
      </span>
      </div>
      <div className="task-meta">
      <span>12 道错题</span><span>3 个知识点</span><span>生成于 05:42</span>
      </div>
      <div className="preview">
      <span className="preview-title">错题讲解 · 二次函数最值问题</span>
      <span className="preview-line">第 1 题：已知抛物线 y=x²-4x+3，求其顶点坐标与最小值…</span>
      <span className="preview-line">第 2 题：若函数在区间 [0,3] 上单调递增…</span>
      </div>
      <div className="task-actions">
      <button className="btn btn-ghost">预览</button>
      <button className="btn btn-primary" style={{padding: '0 16px 0 14px'}}>
      <svg className="ic" width="13" height="13"><use href="#i-printer" /></svg>
      <span>立即打印</span>
      </button>
      </div>
      </div>

      <div className="task-card">
      <div className="task-head">
      <span className="avatar-task" style={{background: 'var(--warn-bg)', color: 'var(--warn-ink)'}}>李</span>
      <div className="task-id">
      <span className="task-name">李萌</span>
      <span className="task-class">高一物理 · 力学专题</span>
      </div>
      <span className="pill pill-warn">
      <svg className="ic" width="11" height="11"><use href="#i-clock" /></svg>
      <span>超时 1h</span>
      </span>
      </div>
      <div className="task-meta">
      <span>8 道错题</span><span>2 个知识点</span><span>生成于 08:35</span>
      </div>
      <div className="preview">
      <span className="preview-title">错题讲解 · 受力分析综合应用</span>
      <span className="preview-line">第 1 题：质量为 2kg 的物体置于倾角 30° 的斜面上…</span>
      <span className="preview-line">第 2 题：绳的张力与摩擦力的临界条件…</span>
      </div>
      <div className="task-actions">
      <button className="btn btn-ghost">预览</button>
      <button className="btn btn-primary" style={{padding: '0 16px 0 14px'}}>
      <svg className="ic" width="13" height="13"><use href="#i-printer" /></svg>
      <span>立即打印</span>
      </button>
      </div>
      </div>

      <div className="task-card">
      <div className="task-head">
      <span className="avatar-task" style={{background: 'var(--primary-tint)', color: 'var(--primary)'}}>王</span>
      <div className="task-id">
      <span className="task-name">王悦</span>
      <span className="task-class">初三英语 · 语法精讲</span>
      </div>
      <span className="pill pill-ok">刚生成</span>
      </div>
      <div className="task-meta">
      <span>5 道错题</span><span>2 个知识点</span><span>生成于 09:38</span>
      </div>
      <div className="preview">
      <span className="preview-title">错题讲解 · 定语从句关系词辨析</span>
      <span className="preview-line">第 1 题：The book ___ I bought yesterday is…</span>
      <span className="preview-line">第 2 题：辨析 that / which / where 的用法…</span>
      </div>
      <div className="task-actions">
      <button className="btn btn-ghost">预览</button>
      <button className="btn btn-primary" style={{padding: '0 16px 0 14px'}}>
      <svg className="ic" width="13" height="13"><use href="#i-printer" /></svg>
      <span>立即打印</span>
      </button>
      </div>
      </div>

      <div className="task-card is-hug">
      <div className="task-head">
      <span className="avatar-task" style={{background: 'var(--canvas)', color: 'var(--ink-56)'}}>赵</span>
      <div className="task-id">
      <span className="task-name">赵子轩</span>
      <span className="task-class">初二数学 · 几何证明</span>
      </div>
      <span className="pill pill-err">
      <svg className="ic" width="11" height="11"><use href="#i-alert" /></svg>
      <span>打印失败</span>
      </span>
      </div>
      <div className="task-meta">
      <span>7 道错题</span><span className="is-err">打印机 301-02 离线</span>
      </div>
      <div className="preview">
      <span className="preview-title">错题讲解 · 全等三角形判定</span>
      <span className="preview-line">第 1 题：已知 AB=AC，BD=CD，求证…</span>
      <span className="preview-line">第 2 题：判定两个直角三角形全等的条件…</span>
      </div>
      <div className="task-actions">
      <button className="btn btn-ghost">预览</button>
      <button className="btn btn-primary" style={{padding: '0 16px 0 14px'}}>
      <svg className="ic" width="13" height="13"><use href="#i-refresh" /></svg>
      <span>重试打印</span>
      </button>
      </div>
      </div>
      </div>
      </div>

    </div>
  )
}
