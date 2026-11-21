# TeachSync · 教师端教务协同平台

基于 v0.1 设计稿（`03-历史版本-v0.1-教师端/`）实现，补充后端与部署。

## 本地运行

```bash
npm install
npm run dev          # http://localhost:3000
```

未配置 Supabase 时进入**演示模式**，可直接查看全部页面。

## 页面

| 路由 | 页面 | 说明 |
|---|---|---|
| `/today` | 工作台 | KPI、今日课表、待办、预警 |
| `/schedule` | 排课中心 | 三维课表网格 |
| `/verify` | 核销中心 | 待核销 / 记录 / 对账 |
| `/students` | 学生管理 | 学生卡片列表 |
| `/mistakes` | 错题与复习 | 待打印 / 讲解 / 复习日历 |
| `/attendance` | 考勤 | 签到签退 |
| `/points` | 积分 | 规则 / 流水 / 兑换审批 |
| `/reports` | 日报中心 | 草稿 / 批量发送 |
| `/tasks` | 任务中心 | 全局待办聚合 |
| `/settings` | 设置 | 同步监控 / 绑定 / 知识库 / 成员 |

## 接入 Supabase（4 步）

### 1. 建项目

https://supabase.com → `New Project` → 名称 `teachsync` → 地区 **Singapore** → 记下数据库密码。

### 2. 建表

`SQL Editor` → `New query`：

1. 粘贴 `supabase/migrations/0001_init.sql` 全文 → Run
2. 粘贴 `supabase/migrations/0002_seed.sql` → Run（可选，演示数据）

### 3. 拿 Key

`Project Settings` → `API`：

| 字段 | 环境变量 |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY`（仅服务端，**不可**进前端） |

```bash
cp .env.local.example .env.local
```

### 4. 建第一个账号

`Authentication` → `Users` → `Add user` → 填邮箱密码 → **勾选 Auto Confirm User** → 复制 UID：

```sql
insert into public.teachers (org_id, auth_user_id, name, email, role)
values (
  '00000000-0000-4000-8000-000000000001',
  '<粘贴 auth user uid>',
  '陈老师',
  '<你的邮箱>',
  'ADMIN'
);
```

重启后演示模式自动关闭。

## 部署到 Vercel

1. 推 GitHub
2. vercel.com → `Add New` → `Project` → 导入仓库
3. `Environment Variables` 添加同样的三个变量
4. `Deploy`

> Vercel 文件系统临时，必须用 Supabase（Postgres），不能用 SQLite。

## 数据模型

21 张表，核心状态机对齐 v0.1 的 `05-原型说明`：

- `lessons.status`：SCHEDULED → ONGOING → FINISHED → CONSUMED（CONSUMED 为终态）
- `consumptions.status`：PENDING → VERIFIED / REVIEW_NEEDED → IN_REVIEW → RESOLVED
- `print_tasks.status`：PENDING → PRINTED_UNTAUGHT → TAUGHT（超时转 ESCALATED）
- `sync_events` 以 `(device_id, event_id)` 为幂等键

## 目录

```
src/app/(app)/        10 个业务页面
src/components/       shell（侧边栏）/ page-header / icons（29 个 SVG）
src/lib/permissions   角色与权限点
supabase/migrations   schema + seed
FRONTEND_SPEC.md      设计与结构规范
```
