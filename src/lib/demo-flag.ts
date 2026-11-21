/**
 * 演示模式判断（客户端可用）
 * 服务端的同一判断放在 lib/session.ts
 */
export const isDemo = !(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('xxxxxxxx')
)
