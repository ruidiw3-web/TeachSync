'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { isDemo } from '@/lib/demo-flag'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (isDemo) {
      router.push('/today')
      return
    }

    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (err) {
        setError(
          err.message === 'Invalid login credentials'
            ? '邮箱或密码不正确'
            : err.message
        )
        return
      }
      router.push('/today')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败，请重试')
    } finally {
      setLoading(false)
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
              margin: '6px 0 22px',
              fontSize: 13,
              color: 'var(--ink-48)',
            }}
          >
            账号由机构管理员开通
          </p>

          <form onSubmit={handleSubmit}>
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
              style={{ width: '100%', marginBottom: 20 }}
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
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', height: 40 }}
              disabled={loading}
            >
              {loading ? '登录中…' : isDemo ? '进入演示环境' : '登录'}
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
          {isDemo
            ? '当前为演示模式（未连接数据库），数据为样例。配置 Supabase 后自动切换。'
            : '忘记密码请联系机构管理员重置'}
        </p>
      </div>
    </div>
  )
}
