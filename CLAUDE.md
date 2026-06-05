# 达达教学工具台 (student-correction-feedback)

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
- `basePath: "/student-correction-feedback"`（next.config.ts）
- 根路径 `/` 自动重定向到 `/student-correction-feedback`

## 部署

### 当前：Vercel
- 由 Codex 完成部署，push main 自动触发
- @vercel/blob 用于文件存储
- 环境变量在 Vercel Dashboard 设置

### 阿里云（历史备份）
- 服务器 116.62.220.255 上仍有旧部署（PM2: student-correction-feedback，端口 3002）
- 不再主动维护，但服务器通用经验见 `C:\Users\admin\CLAUDE.md`

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
