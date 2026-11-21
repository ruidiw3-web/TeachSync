/**
 * 从 cookie 里本地解析登录会话，不产生任何网络请求。
 *
 * @supabase/ssr 写入的 cookie 形如：
 *   sb-<ref>-auth-token = base64-<base64url(JSON session)>
 * session 过大时会被拆成 sb-<ref>-auth-token.0 / .1 / .2 ...
 *
 * 这里只做「解码 + 读 exp」，不做签名校验。
 * 签名校验交给 PostgREST —— 伪造的 token 查 teachers 会返回空，
 * 拿不到用户即视为未登录，安全边界不依赖本文件。
 */

export type LocalSession = {
  userId: string
  accessToken: string
  /** 毫秒时间戳 */
  expiresAt: number
}

type CookieLike = { name: string; value: string }

function b64urlDecode(input: string): string {
  const b = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b + '='.repeat((4 - (b.length % 4)) % 4)
  const bin = atob(padded)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function parseSessionValue(raw: string): LocalSession | null {
  try {
    const v = raw.startsWith('base64-') ? raw.slice(7) : raw
    const json = JSON.parse(b64urlDecode(v)) as {
      access_token?: string
      expires_at?: number
      user?: { id?: string }
    }
    const access = json.access_token
    if (!access) return null

    const payload = JSON.parse(b64urlDecode(access.split('.')[1] ?? '')) as {
      sub?: string
      exp?: number
    }
    const userId = String(payload.sub ?? json.user?.id ?? '')
    if (!userId) return null

    const seconds = Number(json.expires_at ?? payload.exp ?? 0)
    return {
      userId,
      accessToken: access,
      expiresAt: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0,
    }
  } catch {
    return null
  }
}

export function projectRefOf(supabaseUrl: string | undefined): string {
  if (!supabaseUrl) return ''
  try {
    return new URL(supabaseUrl).hostname.split('.')[0]
  } catch {
    return ''
  }
}

export function readLocalSession(
  cookies: CookieLike[],
  projectRef: string
): LocalSession | null {
  if (!projectRef) return null
  const key = `sb-${projectRef}-auth-token`

  const single = cookies.find((c) => c.name === key)
  if (single) return parseSessionValue(single.value)

  const chunks = cookies
    .filter((c) => c.name.startsWith(`${key}.`))
    .sort(
      (a, b) =>
        Number(a.name.slice(key.length + 1)) - Number(b.name.slice(key.length + 1))
    )
  if (chunks.length === 0) return null

  return parseSessionValue(chunks.map((c) => c.value).join(''))
}

/** 距离过期还有多久（毫秒）。0 表示已过期或解析失败。 */
export function msUntilExpiry(session: LocalSession | null): number {
  if (!session || !session.expiresAt) return 0
  return session.expiresAt - Date.now()
}
