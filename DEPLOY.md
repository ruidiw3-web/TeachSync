# TeachSync 教师端 · 部署手册

面向：本地已跑通，要上线到 Vercel。

---

## 0. 前置：数据库

Supabase 项目里按顺序跑过这三个 SQL（SQL Editor → New query → 粘贴 → Run）：

| 文件 | 作用 |
| --- | --- |
| `supabase/migrations/0001_init.sql` | 23 张表、状态约束、RLS 策略 |
| `supabase/migrations/0002_seed.sql` | 机构 / 课程 / 教室 / 积分规则基础数据 |
| `supabase/0003_grants.sql` | 给 anon / authenticated / service_role 授权（漏了会报 42501） |
| `supabase/migrations/0004_rpc.sql` | **可选但推荐**：核销、复核、调课的原子事务函数 |

不跑 `0004_rpc.sql` 也能用——应用会自动降级为「补偿式写入」（状态翻转带守卫 + 失败回滚），
只是少了数据库层的强原子性。跑了之后写入会走 `fn_verify_consumption` 等函数。

---

## 1. 环境变量

部署平台必须配置这三项（本地在 `.env.local`，已被 `.gitignore` 排除，不会进仓库）：

```
NEXT_PUBLIC_SUPABASE_URL=https://<项目ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxxxx
```

取值位置：Supabase → Settings → **Data API**（URL）、**API Keys**（Publishable / Secret）。

> 新版控制台已经没有 `anon public` / `service_role` 这两个名字了，对应的是
> Publishable key 和 Secret key。

---

## 2. 路线 A：Vercel CLI 直接部署（最快）

```bash
cd app
npx vercel link                      # 首次会要求登录 + 选 scope
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel --prod
```

带 token 的非交互写法：

```bash
npx vercel --prod --yes --token=<VERCEL_TOKEN> \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=...
```

Token 位置：Vercel → Account Settings → **Tokens** → Create。

---

## 3. 路线 B：GitHub 仓库 + Vercel 网页导入

### 3.1 建仓库并推送

在 github.com/new 建一个**空仓库**（不要勾 README），然后：

```bash
cd app
git remote add origin https://github.com/<user>/<repo>.git
git branch -M main
git push -u origin main
```

用 PAT 推送（账号密码方式 GitHub 已不支持）：

```bash
git remote set-url origin https://<PAT>@github.com/<user>/<repo>.git
git push -u origin main
```

PAT 位置：GitHub → Settings → Developer settings → Personal access tokens →
Tokens (classic) → Generate new token → 勾 `repo`。

### 3.2 Vercel 导入

1. vercel.com → Add New → **Project**
2. 选 `Import Git Repository` → 授权 GitHub → 选刚才的仓库
3. Framework 自动识别为 **Next.js**，Root Directory 保持 `app/`（若仓库根就是 app 则不用改）
4. 展开 **Environment Variables**，把上面三个变量逐个粘进去
5. Deploy

---

## 4. 上线后必须验证的四件事

1. 打开线上地址 → 应跳转 `/login`
2. 用 `15732002612@163.com` / `TeachSync2026` 登录 → 进工作台，KPI 有真实数字
3. 排课中心 → 拖一张蓝色课卡到空格 → 出现「可放置/需确认/时段冲突」提示 → 松手后时间变了
4. 核销中心 → 勾一笔 → 批量核销 → 提示「已核销 N 笔」，学生课时余额同步减少

如任一步失败，先看 Vercel → Deployments → 最新一次 → **Functions / Logs**，
最常见原因是环境变量漏配或值带了引号。

---

## 5. 本地自检脚本

```bash
node scripts/smoke.mjs        # 登录 + 10 个页面 + AI 接口
node scripts/test-writes.mjs  # 核销扣课时 / 调课写库（自动还原，不留脏数据）
node scripts/seed-week.mjs    # 补齐本周与下周课次（幂等）
node scripts/verify-db.mjs    # 23 张表连通性
```
