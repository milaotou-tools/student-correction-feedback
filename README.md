# 达达教学工具台

这是一个面向小学教师的 Next.js 工具项目，包含：

- 订正情况反馈：上传 Excel，生成家长反馈报告和教师跟进清单。
- 成绩分析报告：分析考试成绩，生成关注名单、奖励名单和家长沟通模板。

课题申报助手已经拆分为独立项目，本仓库中的旧页面和 API 仅作历史兼容，不再作为主要维护入口。

Agent 开发前先读取 `PROJECT_CONTEXT.md`。部署细节见 `DOMAIN_SETUP_HANDOFF.md`。

## 生产地址

- 订正反馈与成绩分析：`https://feedback.we-teach.cn`
- 课题申报助手：`https://proposal.we-teach.cn`
- 教育工具入口：`https://we-teach.cn`
- 个人工具入口：`https://toolou.cn`

独立工具统一使用子域名。不要为新项目默认新增 `/proposal/`、`/feedback/` 之类的跨应用子路径代理。

## 本地运行

```bash
npm install
npm run dev
```

项目配置了：

```text
basePath: 已移除
```

本地默认入口：

```text
http://localhost:3000/
```

## 构建与测试

```bash
npm run build
npm test
```

## 技术栈

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Playwright 与 `@sparticuz/chromium`
- xlsx
- sharp
- `@vercel/blob`

## 环境变量

复制 `.env.example` 中的配置到本地环境文件，并填写真实值：

```env
TEACHER_PAGE_PASSWORD=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
```

也支持其他 OpenAI-compatible 服务：

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=
```

`DEEPSEEK_*` 优先于 `OPENAI_*`。不要提交真实密钥。

## 部署

服务器：

```text
116.62.220.255
```

当前生产映射：

```text
feedback.we-teach.cn -> 127.0.0.1:3002
we-teach.cn -> 127.0.0.1:3002
toolou.cn -> 127.0.0.1:3002
proposal.we-teach.cn -> 127.0.0.1:3005
```

完整的 DNS、BT Panel、反向代理、SSL 和运维说明见 `DOMAIN_SETUP_HANDOFF.md`。

注意：现有 `.github/workflows/deploy-aliyun.yml` 已改为只部署当前仓库对应的服务，不再自动改写服务器 Nginx。
