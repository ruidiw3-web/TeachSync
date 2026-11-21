import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 部署环境诊断：只在服务端跑，用于判断「函数区域 ↔ 数据库」的往返开销。
 * 不返回任何密钥，可以留在线上。
 */
export async function GET() {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const out: Record<string, unknown> = {
    fnRegion: process.env.AWS_REGION || process.env.NETLIFY_FUNCTION_REGION || 'unknown',
    supabaseHost: base ? new URL(base).hostname : null,
    timestamp: new Date().toISOString(),
  }

  try {
    // 1. 建客户端的开销（应接近 0）
    const t0 = Date.now()
    const supabase = await createClient()
    out.clientMs = Date.now() - t0

    // 2. 鉴权往返
    const t1 = Date.now()
    const { data: auth } = await supabase.auth.getUser()
    out.authMs = Date.now() - t1
    out.hasUser = !!auth.user

    // 3. 一次最轻量的 REST 查询（冷/热各一次，看连接复用）
    const cold = Date.now()
    await supabase.from('orgs').select('id').limit(1)
    out.queryColdMs = Date.now() - cold

    const warm = Date.now()
    await supabase.from('orgs').select('id').limit(1)
    out.queryWarmMs = Date.now() - warm

    // 4. 原样 fetch 对照，排除 supabase-js 封装影响
    if (base && key) {
      const raw = Date.now()
      await fetch(`${base}/rest/v1/orgs?select=id&limit=1`, {
        headers: { apikey: key, authorization: `Bearer ${key}` },
      })
      out.rawFetchMs = Date.now() - raw
    }
  } catch (e) {
    out.error = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json(out, { headers: { 'cache-control': 'no-store' } })
}
