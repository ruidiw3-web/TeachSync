'use client'

import { useEffect } from 'react'
import { Icon } from '@/components/icons'

/** 应用内错误边界：保留侧边栏与顶栏，只替换内容区 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[TeachSync] 内容区渲染失败', error)
  }, [error])

  return (
    <div className="page">
      <header className="tb">
        <h1 className="tb-title">出错了</h1>
        <div className="tb-spacer" />
      </header>
      <div className="page-body" style={{ padding: 24 }}>
        <div
          style={{
            background: '#fff',
            border: '1px solid var(--hairline)',
            borderRadius: 8,
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            maxWidth: 560,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="alert" size={18} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>这个页面没能加载出来</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-56)', lineHeight: 1.6 }}>
            数据服务可能暂时不可用，或者这条记录已被改动。重试一次通常能恢复。
          </div>
          {error.digest && (
            <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>错误编号：{error.digest}</div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-primary btn-xs" onClick={reset}>
              重试
            </button>
            <a className="btn btn-ghost btn-xs" href="/today">
              回到工作台
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
