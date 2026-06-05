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

### 当前：阿里云
- 服务器：116.62.220.255，BT Panel 管理
- PM2 进程名：student-correction-feedback，端口 3002
- 部署路径：/www/wwwroot/student-correction-feedback
- CI/CD：push main → GitHub Actions SSH 到服务器执行 deploy.sh
- deploy.sh 会安装 Playwright Chromium 系统依赖（dnf）

### 目标：迁移到 Vercel
- **关键障碍**：Playwright Chromium 无法在 Vercel Serverless 上运行
- 需要将图片渲染改为其他方案（如 html-to-image 客户端渲染、或外部渲染服务）
- @vercel/blob 已兼容，可直接用
- 环境变量在 Vercel Dashboard 设置

## 全局基础设施
- 用户机器 `C:\Users\admin\CLAUDE.md` 记录了服务器通用经验（Nginx 缓存、PM2 等）
- 对 Vercel 部署不适用，但对仍在阿里云的服务有参考价值

## 代码风格
- Tailwind 设计色系：背景 #FAF9F6，文字 #141413，边框 #E8E6E1
- 中文优先，面向小学教师用户
- 页面组件多为 Client Component（"use client"）
- 报告图片缓存在浏览器端（localStorage/sessionStorage）

## 环境变量
```
TEACHER_PAGE_PASSWORD=xxx          # 教师页面访问密码
DEEPSEEK_API_KEY=sk-xxx            # DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
```

## 注意事项
- `.env` 不入 git，`.env.example` 是模板
- 阿里云服务器连不上 GitHub，部署走 SSH push 模式
- BT Panel 会在项目目录放 `.user.ini`，git clean 时需排除
- Nginx 有 proxy_cache，改文案后需清缓存（见全局 CLAUDE.md）
