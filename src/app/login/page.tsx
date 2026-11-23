'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isDemo } from '@/lib/demo-flag'

/**
 * 演示账号：公开可用，专供分享链接 / 面试体验。
 * 输入框默认填好，也可以被 NEXT_PUBLIC_DEMO_EMAIL / _PASSWORD 覆盖。
 */
const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL || 'demo@teachsync.app'
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'TeachSyncDemo2026'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState(DEMO_EMAIL)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [loading, setLoading] = useState<'demo' | 'form' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signIn(
    withEmail: string,
    withPassword: string,
    mode: 'demo' | 'form'
  ) {
    setError(null)

    if (isDemo) {
      router.push('/today')
      return
    }

    setLoading(mode)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: err } = await supabase.auth.signInWithPassword({
        email: withEmail,
        password: withPassword,
      })
      if (err) {
        setError(
          err.message === 'Invalid login credentials'
            ? '邮箱或密码不正确'
            : err.message
        )
        setLoading(null)
        return
      }
      router.push('/today')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败，请重试')
      setLoading(null)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--canvas)',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* 品牌 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 28,
          }}
        >
          <svg className="brand-mark" viewBox="0 0 28 28" aria-label="TeachSync">
            <rect width="28" height="28" fill="#0066CC" />
            <path
              d="M9 18.6C11.4 12.9 15.2 11.2 19.2 11.2"
              fill="none"
              stroke="#fff"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <circle cx="19.6" cy="18.6" r="2.2" fill="#fff" />
          </svg>
          <span className="brand-name">TeachSync</span>
        </div>

        <div className="card" style={{ padding: '28px 26px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--ink)',
            }}
          >
            登录教师端
          </h2>
          <p
            style={{
              margin: '6px 0 20px',
              fontSize: 13,
              color: 'var(--ink-48)',
            }}
          >
            无需账号，一键进入演示环境
          </p>

          {/* 主路径：一键演示 */}
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: 42 }}
            onClick={() => signIn(DEMO_EMAIL, DEMO_PASSWORD, 'demo')}
            disabled={loading !== null}
          >
            {loading === 'demo' ? '正在进入…' : '一键进入演示环境'}
          </button>

          <p
            style={{
              margin: '10px 0 0',
              fontSize: 12,
              lineHeight: 1.6,
              color: 'var(--ink-40)',
              textAlign: 'center',
            }}
          >
            完整功能的样例数据，可自由点开任何页面
          </p>

          {/* 分隔 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              margin: '22px 0 18px',
            }}
          >
            <span style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
            <span style={{ fontSize: 12, color: 'var(--ink-40)' }}>
              或使用机构账号登录
            </span>
            <span style={{ flex: 1, height: 1, background: 'var(--hairline)' }} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              signIn(email, password, 'form')
            }}
          >
            <div className="form-label">邮箱</div>
            <input
              type="email"
              className="form-input"
              style={{ width: '100%', marginBottom: 14 }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required={!isDemo}
            />

            <div className="form-label">密码</div>
            <input
              type="password"
              className="form-input"
              style={{ width: '100%', marginBottom: 18 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required={!isDemo}
            />

            {error && (
              <div
                className="alert-bar"
                style={{
                  background: 'var(--err-bg)',
                  borderColor: 'var(--err-line)',
                  marginBottom: 14,
                }}
              >
                <div className="alert-title" style={{ color: 'var(--err-ink)' }}>
                  {error}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn"
              style={{ width: '100%', justifyContent: 'center', height: 38 }}
              disabled={loading !== null}
            >
              {loading === 'form' ? '登录中…' : isDemo ? '进入演示环境' : '登录'}
            </button>
          </form>
        </div>

        <p
          style={{
            marginTop: 16,
            fontSize: 12,
            lineHeight: 1.6,
            color: 'var(--ink-40)',
            textAlign: 'center',
          }}
        >
          演示账号已自动填好，直接登录也可以
        </p>
      </div>
    </div>
  )
}
