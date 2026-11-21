'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV, ROLE_LABEL } from '@/lib/permissions'
import { Icon } from './icons'
import { useUser } from './user-provider'

type Counts = Record<string, number>

/** 侧边栏徽标与数据源对应关系 */
const BADGE_SOURCE: Record<string, { key: string; tone?: 'err' | 'blue' | 'warn' }> = {
  '/verify': { key: 'verify', tone: 'err' },
  '/mistakes': { key: 'mistakes', tone: 'warn' },
  '/points': { key: 'points', tone: 'blue' },
  '/reports': { key: 'reports', tone: 'warn' },
  '/tasks': { key: 'tasks', tone: 'blue' },
}

export function Shell({
  children,
  counts,
}: {
  children: React.ReactNode
  counts: Counts
}) {
  const pathname = usePathname()
  const user = useUser()

  return (
    <div className="app-shell">
      <aside className="sb">
        <div className="sb-brand">
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

        <nav className="sb-nav">
          {NAV.map((n) => {
            const active =
              pathname === n.href || pathname.startsWith(n.href + '/')
            const src = BADGE_SOURCE[n.href]
            const n2 = src ? counts[src.key] ?? 0 : 0
            const tone = src?.tone ?? 'blue'

            return (
              <Link
                key={n.id}
                href={n.href}
                className={`nav-item${active ? ' is-active' : ''}`}
              >
                <Icon name={n.icon} size={18} />
                <span className="nav-label">{n.label}</span>
                {n2 > 0 && (
                  <span
                    className={`badge${
                      tone === 'blue' ? ' is-blue' : tone === 'warn' ? ' is-warn' : ''
                    }`}
                  >
                    {n2 > 99 ? '99+' : n2}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="sb-spacer" />

        <div className="sb-sync">
          <div className="sync-row">
            <span className="sync-dot" />
            <span className="sync-title">学习机数据已同步</span>
          </div>
          <div className="sync-time">
            {user ? `${user.orgName} · ${ROLE_LABEL[user.primaryRole]}` : '未绑定机构'}
          </div>
        </div>
      </aside>

      <div className="main">{children}</div>
    </div>
  )
}
