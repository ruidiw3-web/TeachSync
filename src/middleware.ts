import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  msUntilExpiry,
  projectRefOf,
  readLocalSession,
} from '@/lib/session-cookie'

/** 剩余有效期低于这个值才真正联网刷新，避免每个请求都多跑一次 auth 请求 */
const REFRESH_THRESHOLD_MS = 120_000

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 未配置 Supabase 时（demo 模式）直接放行，避免死循环
  if (!url || !key || url.includes('xxxxxxxx')) {
    return NextResponse.next({ request })
  }

  const pathname = request.nextUrl.pathname
  const isLogin = pathname.startsWith('/login')
  const isPublic = pathname.startsWith('/p/')
  // API 自行做鉴权并返回 JSON 错误，不能重定向成 HTML
  const isApi = pathname.startsWith('/api/')
  const isStatic = pathname.startsWith('/_next/')

  const allCookies = request.cookies.getAll()
  const local = readLocalSession(allCookies, projectRefOf(url))
  const hasSession = !!local
  const needsRefresh = hasSession && msUntilExpiry(local) < REFRESH_THRESHOLD_MS

  // ---- 快路径：有会话且离过期还早，不联网 ----
  if (hasSession && !needsRefresh) {
    if (isLogin) {
      const redirect = request.nextUrl.clone()
      redirect.pathname = '/today'
      return NextResponse.redirect(redirect)
    }
    return NextResponse.next({ request })
  }

  // ---- 慢路径：没有会话，或令牌即将过期，需要走一次 auth 刷新 ----
  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // 刷新会话（勿在 getUser 前插入逻辑）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isLogin && !isPublic && !isApi && !isStatic) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/login'
    return NextResponse.redirect(redirect)
  }

  if (user && isLogin) {
    const redirect = request.nextUrl.clone()
    redirect.pathname = '/today'
    return NextResponse.redirect(redirect)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
