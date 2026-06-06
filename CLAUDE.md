# 达达教学工具台 (student-correction-feedback)

## 共享上下文

开始任何任务前先读取 `PROJECT_CONTEXT.md`。涉及部署、域名或服务器时，再读取 `DOMAIN_SETUP_HANDOFF.md`。

`PROJECT_CONTEXT.md` 是 Claude 与 Codex 共享的项目事实源。如果旧聊天记录、全局 Skill 或历史交接与它冲突，以仓库当前代码和 `PROJECT_CONTEXT.md` 为准。

完成会改变项目范围、生产地址、端口、部署方式或后续步骤的工作后，必须更新 `PROJECT_CONTEXT.md`；部署细节同时更新 `DOMAIN_SETUP_HANDOFF.md`。

## 项目概述
Next.js 15 单体应用，包含三个小学教学工具：
1. **订正情况反馈** — 上传 Excel 生成家长反馈报告（PNG 图片）
2. **成绩分析报告** — 考试成绩分析、关注名单、奖励名单、家长沟通模板
3. **课题申报助手** — 已提取为独立项目 [proposal-helper](https://github.com/milaotou-tools/proposal-helper)，本仓库中的版本不再维护

## 技术栈
- Next.js 15.3 App Router + React 19 + TypeScript 5.8
- Tailwind CSS 3.4
- Playwright + @sparticuz/chromium — 服务端渲染报告图片
- xlsx — Excel 解析
- sharp — 图片处理
- @fontsource/noto-sans-sc — 中文字体
- @vercel/blob — 云端文件存储
- 无数据库，无 ORM

## 项目结构
```
app/
  page.tsx                          # 首页（三个工具入口）
  upload/                           # Excel 上传
  reports/[reportId]/               # 订正反馈报告
  teacher/[reportId]/follow-up/     # 教师跟进清单
  grade-upload/                     # 成绩上传
  grade-reports/[gradeReportId]/    # 成绩报告主页
    focus/                          # 关注名单
    parent-messages/                # 家长沟通模板
    rewards/                        # 奖励名单
  proposal-helper/                  # 课题助手（已废弃，见独立项目）
  api/
    reports/                        # 报告 CRUD
    grade-reports/                  # 成绩报告
    proposal-helper/                # AI API（已废弃）
lib/
  ai-client.ts                      # DeepSeek API 客户端
  excel-parser.ts                   # Excel 解析
  report-generator.ts               # 报告生成核心逻辑
  prompts/                          # AI Prompt 模板
```

## Base Path
- `basePath` 已移除，根路径 `/` 直接作为生产入口

## 部署

### 当前生产环境：阿里云

- 服务器：`116.62.220.255`
- 管理：BT Panel + Nginx + PM2
- 订正反馈与成绩分析：`https://feedback.we-teach.cn`
- 当前反向代理：`feedback.we-teach.cn` → `http://127.0.0.1:3002`
- 教育工具入口：`https://we-teach.cn`
- 个人工具入口：`https://toolou.cn`
- 课题申报助手是独立项目：`https://proposal.we-teach.cn`
- 独立工具统一使用子域名，不再新增跨应用子路径代理
- SSL 使用 Let's Encrypt，并开启强制 HTTPS

完整部署说明见 `DOMAIN_SETUP_HANDOFF.md`。

### 部署注意

- 当前应用已取消 `basePath`，所以生产入口直接落到站点根路径。
- `we-teach.cn` 和 `toolou.cn` 共用当前后端，页面内容按 Host 区分。
- `.github/workflows/deploy-aliyun.yml` 已收敛为只部署当前仓库对应服务，不再批量修改服务器 Nginx。
- Vercel 可作为历史部署或备用环境，不是当前域名方案的主要入口。

## 代码风格
- Tailwind 设计色系：背景 #FAF9F6，文字 #141413，边框 #E8E6E1
- 中文优先，面向小学教师用户
- 页面组件多为 Client Component（"use client"）
- 报告图片可能缓存在浏览器端（localStorage/sessionStorage）

## 环境变量
```
TEACHER_PAGE_PASSWORD=xxx          # 教师页面访问密码
DEEPSEEK_API_KEY=sk-xxx            # DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
```
- `.env` 不入 git，`.env.example` 是模板

## 文件删除规则

禁止批量删除，包括通配符、递归、循环和批量清理命令。只能使用 `Remove-Item` 一次删除一个明确路径的文件；需要批量删除时停止并让达达手动处理。
