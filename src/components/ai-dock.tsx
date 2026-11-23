'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Icon } from './icons'
import { useUser } from './user-provider'

type Msg = { role: 'user' | 'bot'; text: string; href?: string; actionLabel?: string }

const SUGGEST = ['跑一次体检', '今天还有几节课', '还有多少笔待核销', '本周排课有冲突吗']

export function AiDock() {
  const user = useUser()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'bot',
      text: '我是教务助手。可以帮你查课时、看排课冲突、汇总待办，或起草日报。直接问就行。',
    },
  ])
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function ask(text: string) {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setBusy(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: q }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as { answer?: string }
      setMsgs((m) => [...m, { role: 'bot', text: data.answer || '我没查到相关数据。' }])
    } catch {
      setMsgs((m) => [
        ...m,
        { role: 'bot', text: '网络或服务异常，这条没答上来。稍后再试一次，或直接在对应页面查看数据。' },
      ])
    } finally {
      setBusy(false)
    }
  }

  /** Agent 巡检：跑一套规则，把命中项汇总成一条可跳转的结论 */
  async function checkup() {
    if (busy) return
    setMsgs((m) => [...m, { role: 'user', text: '跑一次体检，看看今天有什么要处理的' }])
    setBusy(true)
    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'scan' }),
      })
      const r = (await res.json()) as {
        error?: string
        signals?: Array<{ severity: string; title: string }>
        counts?: { high: number; todo: number; draft: number; total: number }
        ruleBook?: unknown[]
      }
      if (!res.ok || !r.counts) throw new Error(r.error || `HTTP ${res.status}`)

      const counts = r.counts
      const ruleCount = r.ruleBook?.length ?? 0
      const head =
        counts.total === 0
          ? `巡检了 ${ruleCount} 条规则，全部通过，今天没有需要处理的异常。`
          : `巡检 ${ruleCount} 条规则，命中 ${counts.total} 条：高危 ${counts.high}、待办 ${counts.todo}、待生成草稿 ${counts.draft} 份。`
      const lines = (r.signals ?? [])
        .slice(0, 4)
        .map((s) => `${s.severity === 'high' ? '●' : '○'} ${s.title}`)
      const more = counts.total > 4 ? `\n……还有 ${counts.total - 4} 条` : ''

      setMsgs((m) => [
        ...m,
        {
          role: 'bot',
          text: lines.length > 0 ? `${head}\n${lines.join('\n')}${more}` : head,
          href: counts.total > 0 ? '/tasks' : undefined,
          actionLabel: '打开任务中心',
        },
      ])
    } catch {
      setMsgs((m) => [
        ...m,
        { role: 'bot', text: '体检没跑起来，可能是网络或服务临时异常，稍后再试一次。' },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ai-dock">
      {open && (
        <div className="ai-panel" role="dialog" aria-label="AI 教务助手">
          <div className="ai-panel-head">
            <Icon name="ai" size={16} />
            <span className="ai-panel-title">AI 教务助手</span>
            <span className="ai-panel-sub">{user?.orgName ?? ''}</span>
            <button className="ai-panel-close" onClick={() => setOpen(false)} aria-label="关闭">
              <Icon name="close" size={14} />
            </button>
          </div>

          <div className="ai-panel-body" ref={bodyRef}>
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`ai-msg ${m.role === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}`}
              >
                {m.role === 'bot' && <Icon name="ai" size={18} />}
                <div className={m.role === 'bot' ? 'ai-bot-col' : ''}>
                  <div className="ai-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                    {m.text}
                  </div>
                  {m.href && (
                    <Link href={m.href} className="ai-msg-link" onClick={() => setOpen(false)}>
                      {m.actionLabel ?? '查看详情'}
                      <Icon name="chevron-right" size={11} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="ai-thinking">正在查询数据…</div>}
          </div>

          <div className="ai-panel-foot">
            <div className="ai-suggest">
              {SUGGEST.map((s) => (
                <button
                  key={s}
                  className={`ai-suggest-chip${s === '跑一次体检' ? ' is-agent' : ''}`}
                  onClick={() => (s === '跑一次体检' ? checkup() : ask(s))}
                  disabled={busy}
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              className="ai-input"
              onSubmit={(e) => {
                e.preventDefault()
                ask(input)
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="问点什么，比如「张伟还剩多少课时」"
                disabled={busy}
              />
              <button
                type="submit"
                className="icon-btn"
                aria-label="发送"
                disabled={busy || !input.trim()}
                style={{ color: input.trim() ? 'var(--primary)' : 'var(--ink-30)' }}
              >
                <Icon name="send" size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        className={`ai-dock-fab${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? '收起 AI 助手' : '打开 AI 助手'}
      >
        <Icon name={open ? 'close' : 'ai'} size={22} />
      </button>
    </div>
  )
}
