# FRONTEND_SPEC.md — TeachSync 前端规范

> 每次开新对话时把本文件贴给 AI，可保证风格与结构一致。

## 1. 设计系统

### 颜色（定义在 `src/app/globals.css` 的 `@theme`）

| Token | 值 | 用途 |
|---|---|---|
| `--color-ink` | `#1a1a1a` | 主文字 |
| `--color-ink-2` | `#6b6b6b` | 次级文字 |
| `--color-ink-3` | `#9a9a9a` | 辅助/占位 |
| `--color-line` | `#e8e6e3` | 主边框 |
| `--color-line-2` | `#f2f0ed` | 次级分隔线 |
| `--color-paper` | `#ffffff` | 主背景 |
| `--color-paper-2` | `#faf9f7` | 次级背景/表头 |
| `--color-accent` | `#1e3a5f` | 唯一强调色（深墨蓝） |
| `--color-accent-soft` | `#eff3f8` | 强调色浅底 |
| `--color-ok` / `--color-ok-soft` | `#1f6f4a` / `#edf6f1` | 正常/完成 |
| `--color-warn` / `--color-warn-soft` | `#9a5b12` / `#fdf6ec` | 待办/提醒 |
| `--color-danger` / `--color-danger-soft` | `#a3271b` / `#fdf0ee` | 异常/缺席 |

**硬约束**：全站只有一个强调色（深墨蓝）。不用渐变、不用彩色图标、不用阴影堆叠。

### 字号

| 用途 | 尺寸 | 类 |
|---|---|---|
| 页面标题 | 20px / medium | `text-[20px] font-medium tracking-tight` |
| 区块标题 | 13px / medium | `text-[13px] font-medium` |
| 正文 | 13px | `text-[13px]` |
| 表格/按钮 | 12px | `text-[12px]` |
| 辅助说明 | 11px | `text-[11px] text-ink-3` |
| 小字页眉 | 10px / 字距 0.14em | `.eyebrow` |

数字统一加 `.tnum`（等宽数字，保证列对齐）。

### 间距与圆角

- 卡片内边距：`px-5 py-4`
- 页面区块间距：`space-y-8` ~ `space-y-10`
- 圆角：`rounded-md`（输入/按钮）、`rounded-lg`（卡片/表格容器）、`rounded-full`（标签）
- 页面内容最大宽度：`max-w-[1080px]`

## 2. 目录结构

```
src/
├─ app/
│  ├─ layout.tsx            根布局（字体、metadata）
│  ├─ globals.css           设计系统（唯一色彩来源）
│  ├─ page.tsx              → 重定向 /today
│  ├─ login/page.tsx        登录（未配置 Supabase 时为演示入口）
│  └─ (app)/                受保护区域
│     ├─ layout.tsx         鉴权 + Shell
│     ├─ today/             工作台（按角色渲染）
│     ├─ students/          学生主档
│     ├─ schedule/          排程与核销
│     ├─ process/           晚辅 / 督学记录
│     ├─ feedback/          家校反馈队列
│     └─ mine/              我的课时 + 经营（仅 OWNER）
├─ components/
│  ├─ shell.tsx             侧边栏 + 顶栏 + 角色切换（client）
│  └─ wanfu-board.tsx       晚辅记录表（client，交互核心）
├─ lib/
│  ├─ permissions.ts        RBAC-lite：角色→权限点→导航
│  ├─ session.ts            服务端取当前用户（含 demo 降级）
│  ├─ demo-flag.ts          客户端演示模式判断
│  ├─ demo-data.ts          演示数据
│  └─ supabase/
│     ├─ client.ts          浏览器客户端
│     └─ server.ts          服务端客户端 + service_role
└─ middleware.ts            会话刷新 + 未登录跳转
```

## 3. 已实现

- 6 个一级导航（从 v1.0 的 14 个收敛），按角色过滤
- 多角色切换（负责人 / 授课 / 督导），切换即重算导航
- 工作台：场次、关键数字、待办、经营摘要（仅负责人）
- 晚辅记录：签到三态、作业二态打勾、学习机时长、扫码放行计数、反馈草稿
- 学生主档、排程、家校队列、我的课时
- 数据库 schema + RLS（`supabase/migrations/0001_init.sql`）

## 4. 未实现（下一步）

- 真实 Supabase 连接（当前为演示数据）
- Server Actions 写入（当前交互只在前端内存）
- 家长 H5（`/p/[token]`）
- 排课拖拽、座位图
- 错题与复习

## 5. 技术约束

- Next.js 16 App Router + React 19 + Tailwind 4
- 内部管理系统全部动态渲染：`(app)/layout.tsx` 设 `export const instant = false`
- 任何页面若用 `new Date()`，需先 `await connection()`
- 权限判断必须同时存在于：① `lib/permissions.ts`（UI）② RLS（数据库）③ Server Action（写入前）
- 不引入 UI 组件库，全部用 Tailwind 手写，保持风格统一

## 6. 文案规范

- 用动词开头的短句，不用「赋能」「闭环」「抓手」等词
- 数字优先，能写「12 人」就不写「部分学生」
- 错误提示说人话：「邮箱或密码不正确」，不显示原始报错
