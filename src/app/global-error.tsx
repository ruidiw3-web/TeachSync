'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[TeachSync] 页面渲染失败', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--canvas, #F5F5F7)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#fff',
          border: '1px solid #E0E0E0',
          borderRadius: 12,
          padding: '28px 26px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F' }}>页面加载出错了</div>
        <div style={{ fontSize: 13, color: '#6E6E73', lineHeight: 1.6 }}>
          可能是数据服务暂时不可用。可以先重试；如果一直失败，检查 Supabase 项目状态或网络。
        </div>
        {error.digest && (
          <div style={{ fontSize: 11, color: '#A1A1A6' }}>错误编号：{error.digest}</div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button
            onClick={reset}
            style={{
              height: 34,
              padding: '0 16px',
              borderRadius: 17,
              background: '#0066CC',
              color: '#fff',
              fontSize: 13,
            }}
          >
            重试
          </button>
          <button
            onClick={() => {
              window.location.href = '/today'
            }}
            style={{
              height: 34,
              padding: '0 16px',
              borderRadius: 17,
              border: '1px solid #E0E0E0',
              background: '#fff',
              color: '#1D1D1F',
              fontSize: 13,
            }}
          >
            回到工作台
          </button>
        </div>
      </div>
    </div>
  )
}
