import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim()]}))
const U=env.NEXT_PUBLIC_SUPABASE_URL, A=env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP=process.env.APP_BASE || 'http://localhost:3000'
const r=await fetch(`${U}/auth/v1/token?grant_type=password`,{method:'POST',headers:{'content-type':'application/json',apikey:A},body:JSON.stringify({email:'demo@teachsync.app',password:'TeachSyncDemo2026'})})
const s=await r.json(); if(!r.ok) throw new Error(JSON.stringify(s))
const cookie=`sb-${new URL(U).hostname.split('.')[0]}-auth-token=base64-`+Buffer.from(JSON.stringify(s),'utf8').toString('base64url')

const t=Date.now()
const res=await fetch(APP+'/api/agent',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({action:'scan'})})
const rep=await res.json()
console.log(`scan ${res.status} ${Date.now()-t}ms`)
if(!res.ok){ console.log(rep); process.exit(1) }
console.log('总命中', rep.counts.total, '| 高危', rep.counts.high, '| 待办', rep.counts.todo, '| 草稿', rep.counts.draft)
console.log('规则命中:', rep.ruleBook.filter(r=>r.hit>0).map(r=>`${r.name}=${r.hit}`).join('  '))
for (const sg of rep.signals.slice(0,6)) console.log(`  [${sg.severity}] ${sg.kind} ${sg.title}  → ${sg.href}`)

const draftSig = rep.signals.find(x=>x.kind==='DRAFT')
if (draftSig) {
  const t2=Date.now()
  const d=await fetch(APP+'/api/agent',{method:'POST',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({action:'draft',studentId:draftSig.studentId,date:draftSig.refDate})})
  const dj=await d.json()
  console.log(`\ndraft ${d.status} ${Date.now()-t2}ms`)
  if(!d.ok) { console.log(dj); process.exit(1) }
  console.log('---- 草稿 ----')
  console.log(dj.draft.text)
  console.log('---- 依据 ----')
  console.log(dj.draft.facts.join(' | '))
  console.log('---- 缺口 ----')
  console.log(dj.draft.gaps.join(' | ') || '无')
}

const page=await fetch(APP+'/tasks',{headers:{cookie}})
const html=await page.text()
console.log(`\n/tasks ${page.status} ${(Date.now()-t)}ms  含巡检结果=${html.includes('Agent 巡检结果')} 含规则面板=${html.includes('巡检规则')}`)
