'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { Icon } from './icons'
import { useUser } from './user-provider'
import { ROLE_LABEL } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

const TITLES: Record<string, string> = {
  '/today': '工作台',
  '/schedule': '排课中心',
  '/verify': '核销中心',
  '/students': '学生管理',
  '/mistakes': '错题与复习',
  '/attendance': '考勤',
  '/points': '积分',
  '/reports': '日报中心',
  '/tasks': '任务中心',
  '/settings': '设置',
}

export function PageHeader({ title: override }: { title?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useUser()
  const title = override ?? TITLES[pathname] ?? 'TeachSync'

  const [dateText, setDateText] = useState('')
  const [menu, setMenu] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 客户端计算，避免服务端/客户端时间不一致导致 hydration 警告
  useEffect(() => {
    setDateText(
      new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      }).format(new Date())
    )
  }, [])

  useEffect(() => {
    if (!menu) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menu])

  async function signOut() {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // 忽略：即使 signOut 请求失败也回登录页，中间件会重新校验
    }
    router.replace('/login')
    router.refresh()
  }

  const initial = user?.name?.slice(0, 1) ?? '—'

  return (
    <header className="tb">
      <h1 className="tb-title">{title}</h1>

      <div className="chip-date">
        <Icon name="calendar-check" size={16} />
        <span suppressHydrationWarning>{dateText || '今天'}</span>
      </div>

      <div className="tb-spacer" />

      <div className="search w260">
        <Icon name="search" size={16} />
        <input type="text" placeholder="搜索学生、班级、课程…" />
      </div>

      <button className="icon-btn" aria-label="通知">
        <Icon name="bell" size={18} />
        <span className="dot-unread" />
      </button>

      <div className="tb-divider" />

      <div style={{ position: 'relative' }} ref={menuRef}>
        <button className="user" onClick={() => setMenu((v) => !v)}>
          <span className="avatar-md">{initial}</span>
          <span className="user-name">{user?.name ?? '未登录'}</span>
          <Icon name="chevron-down" size={12} />
        </button>

        {menu && (
          <div
            className="ov-dd is-open"
            style={{ position: 'absolute', right: 0, top: 46, width: 236 }}
          >
            <div className="dd-head">
              {user?.name ?? '未登录'}
              {user && ` · ${ROLE_LABEL[user.primaryRole]}`}
            </div>
            <div className="dd-head" style={{ paddingTop: 0, color: 'var(--ink-30)' }}>
              {user?.orgName ?? ''}
            </div>
            <div className="dd-sep" />
            <button className="dd-item" onClick={() => router.push('/settings')}>
              <Icon name="gear" size={14} />
              <span>机构设置</span>
            </button>
            <button className="dd-item" onClick={signOut} disabled={signingOut}>
              <Icon name="close" size={14} />
              <span>{signingOut ? '正在退出…' : '退出登录'}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
