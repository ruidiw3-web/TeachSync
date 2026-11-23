'use client'

import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/icons'
import { Toast, useToast } from '@/components/toast'
import { saveDraftToReport } from './actions'

type Draft = {
  studentName: string
  guardianName: string | null
  date: string
  text: string
  facts: string[]
  gaps: string[]
  sections: Array<{ heading: string; body: string }>
}

export function DraftRow({
  studentId,
  refDate,
  title,
  detail,
  autoOpen = false,
}: {
  studentId: string
  refDate: string
  title: string
  detail: string
  autoOpen?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [text, setText] = useState('')
  const { toast, show } = useToast()
  const autoRef = useRef(false)

  // 从深链 /tasks?draft=xxx 进来时自动生成一次
  useEffect(() => {
    if (!autoOpen || autoRef.current) return
    autoRef.current = true
    void generate()
    // generate 依赖的都是 props，这里只需要在挂载后跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen])

  async function generate() {
    if (!studentId || !refDate) {
      show('这条记录缺少学生或日期，无法生成', 'err')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'draft', studentId, date: refDate }),
      })
      const j = (await res.json()) as { draft?: Draft; error?: string }
      if (!res.ok || !j.draft) {
        show(j.error || '生成失败，请稍后重试', 'err')
        return
      }
      setDraft(j.draft)
      setText(j.draft.text)
      setOpen(true)
    } catch {
      show('网络异常，草稿没生成成功', 'err')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    const r = await saveDraftToReport(studentId, refDate, text)
    setSaving(false)
    if (r.ok) {
      show('已存为日报草稿，去日报中心确认后即可发送')
      setOpen(false)
    } else {
      show(r.error, 'err')
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      show('草稿已复制，可直接粘贴到微信')
    } catch {
      show('浏览器不允许读取剪贴板，请手动选中复制', 'warn')
    }
  }

  return (
    <>
      <div className="lrow ag-row">
        <span
          className="todo-icon"
          style={{ background: 'var(--ai-violet-bg)', color: 'var(--ai-violet)' }}
        >
          <Icon name="doc" size={14} />
        </span>
        <div className="lrow-main">
          <span className="lrow-title">{title}</span>
          <span className="lrow-sub">{detail}</span>
        </div>
        <button className="btn btn-sm" onClick={generate} disabled={busy}>
          {busy ? '生成中…' : '生成草稿'}
        </button>
      </div>

      {open && draft && (
        <div className="ov-fixed">
          <div className="ov-mask" onClick={() => setOpen(false)} />
          <div className="ag-drawer" role="dialog" aria-label="家长反馈草稿">
            <div className="ag-drawer-head">
              <div>
                <span className="ag-drawer-title">
                  {draft.studentName} · {refDate}
                </span>
                <span className="ag-drawer-sub">
                  {draft.guardianName ? `家长：${draft.guardianName}` : '家长信息未登记'}
                </span>
              </div>
              <button className="icon-btn" onClick={() => setOpen(false)} aria-label="关闭">
                <Icon name="close" size={14} />
              </button>
            </div>

            <div className="ag-drawer-body">
              <div className="ag-evidence">
                <span className="ag-evidence-label">草稿依据</span>
                <div className="ag-chips">
                  {draft.facts.length === 0 ? (
                    <span className="ag-chip is-muted">没有取到可用数据</span>
                  ) : (
                    draft.facts.map((f, i) => (
                      <span key={i} className="ag-chip">
                        {f}
                      </span>
                    ))
                  )}
                </div>
                {draft.gaps.length > 0 && (
                  <ul className="ag-gaps">
                    {draft.gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="form-label">草稿内容（可直接编辑）</label>
              <textarea
                className="form-input ag-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={16}
              />
            </div>

            <div className="ag-drawer-foot">
              <button className="btn" onClick={copy}>
                复制文本
              </button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !text.trim()}>
                {saving ? '保存中…' : '存为日报草稿'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast state={toast} />
    </>
  )
}
