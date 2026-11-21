'use client'

import { useEffect, useState } from 'react'
import { Icon } from './icons'

export type ToastTone = 'ok' | 'warn' | 'err'
export type ToastState = { text: string; tone?: ToastTone } | null

/** 受控 Toast：state 变化即重新计时 */
export function Toast({ state }: { state: ToastState }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!state) {
      setVisible(false)
      return
    }
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 3200)
    return () => clearTimeout(t)
  }, [state])

  const tone = state?.tone ?? 'ok'
  const icon = tone === 'err' ? 'alert' : tone === 'warn' ? 'clock' : 'check'

  return (
    <div className={`ts-toast is-${tone}${visible ? ' is-on' : ''}`} role="status" aria-live="polite">
      <Icon name={icon} size={15} />
      <span>{state?.text ?? ''}</span>
    </div>
  )
}

/** 统一的 toast 状态管理 */
export function useToast() {
  const [toast, setToast] = useState<ToastState>(null)
  // 每次调用都换一个新对象，保证同样的文案也能重新弹出
  const show = (text: string, tone: ToastTone = 'ok') => setToast({ text, tone })
  return { toast, show }
}
