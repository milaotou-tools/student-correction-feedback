# 项目共享上下文

这份文件是 Codex、Claude 和其他开发 Agent 的项目级单一事实源。

开始工作前必须先读取本文件。涉及域名、服务器或部署时，还必须读取 `DOMAIN_SETUP_HANDOFF.md`。如果聊天记录、旧交接文档或全局 Skill 与本文件冲突，以本文件和仓库当前代码为准。

全局跨项目规则位于：

```text
C:\Users\admin\AGENT_SHARED_CONTEXT.md
```

所有普通用户 Skill 的共享目录位于：

```text
C:\Users\admin\.agent-shared\skills
```

Codex 和 Claude 的用户 Skill 目录已通过目录联接指向该共享目录。修改已有 Skill 时两边会立即同步。

安装新 Skill 后必须运行：

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\admin\.agent-shared\Sync-AgentSkills.ps1"
```

Codex 的 `.system` 内置 Skill 和平台插件专属 Skill 不参与共享，因为它们依赖各自平台能力。

## 项目负责人

- 用户称呼：达达
- 工作目录：`C:\Users\admin\Desktop\一周订正情况反馈`
- Git 仓库：`milaotou-tools/student-correction-feedback`

## 项目范围

当前仓库主要维护：

- 订正情况反馈
- 成绩分析报告
- 教育工具首页
- 论文标题优化门诊

课题申报助手已经拆分为独立项目。本仓库保留的相关页面和 API 仅作历史兼容，除非达达明确要求，否则不要继续在本仓库开发该功能。

## 当前生产环境

服务器：

```text
116.62.220.255
```

生产映射：

```text
feedback.we-teach.cn -> 127.0.0.1:3002
proposal.we-teach.cn -> 127.0.0.1:3005
```

当前状态：

- `feedback.we-teach.cn` 已切换为站点根路径访问。
- `proposal.we-teach.cn` 继续作为独立项目入口。
- `we-teach.cn` 和 `toolou.cn` 的首页代码已按 Host 做了区分，但生产接线还需要 BT Panel 配置。

## 长期架构决策

- 独立工具使用独立子域名。
- 子路径仅用于同一应用内部页面。
- 新项目默认采用：子域名 DNS -> BT Panel 建站 -> 整站反代 -> SSL -> 强制 HTTPS。
- 不为独立应用默认增加 `/proposal/`、`/feedback/` 之类的跨应用路径代理。
- 优先在代码层解决重定向问题，不叠加无必要的 Nginx 兼容规则。

## 当前应用约束

本仓库已移除 `basePath`，生产入口直接使用站点根路径 `/`。

## 标题优化门诊

- 页面入口：`/title-clinic`
- API：
  - `GET /api/title-clinic/health`
  - `POST /api/title-clinic/optimize`
- 专家规则文件：`expert-methodology.md`
- 后端通过 `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL` 调用模型，不在前端暴露密钥。

## 已知状态

`.github/workflows/deploy-aliyun.yml` 已收敛为只部署当前仓库对应的服务，并使用 PM2 正常重启。

GitHub Actions 最近一次主分支部署已成功。

部署过程中遇到的坑点已记录在 `DOMAIN_SETUP_HANDOFF.md` 的”踩坑记录”里。

### 2026-06-07 安全修复（commit d29cd45）

- **Workflow 硬编码密钥已移除**：`deploy-aliyun.yml` 中的 `DEEPSEEK_API_KEY` 和 `TEACHER_PAGE_PASSWORD` 从明文改为 `${{ secrets.* }}` 引用。
- **弱密码后备已移除**：`app/api/reports/[reportId]/follow-up/route.ts` 中的 `?? “123456”` 已删除，未配置密码时直接拒绝服务。
- **⚠️ 仓库级 GitHub Secrets 为空**：本仓库 (`student-correction-feedback`) 未配置任何仓库级 Secrets。部署依赖组织级 Secrets (`milaotou-tools`)。如果组织级也没配 `DEEPSEEK_API_KEY` 和 `TEACHER_PAGE_PASSWORD`，阿里云部署会失败。

### 双部署现状

| | Vercel（达达教学工具台） | 阿里云 (feedback.we-teach.cn) |
|---|---|---|
| 环境变量 | Vercel 后台配置 | deploy workflow 写入 .env |
| API Key | 已换新 key，正常 | 上次 deploy 写入的是已删除的旧 key，**可能已挂** |
| 恢复方式 | 无需操作 | 确认 GitHub Secrets → 重新 deploy |

## 待办

- 完成 `we-teach.cn` 和 `toolou.cn` 的 BT Panel 生产接线。
- 完成 ICP 备案。
- 确认组织级 GitHub Secrets 包含 `DEEPSEEK_API_KEY`，触发阿里云重新部署。

## Agent 协作规则

1. 开始工作先读 `PROJECT_CONTEXT.md`。
2. 部署相关工作再读 `DOMAIN_SETUP_HANDOFF.md`。
3. 完成会改变项目状态、生产地址、端口或下一步的工作后，同步更新本文件。
4. 详细操作记录放入对应文档，不要把所有细节重复写入多个入口文件。
5. 不在文档、代码或回复中暴露真实密钥。
6. 禁止批量删除文件。只能用 `Remove-Item` 一次删除一个明确路径的文件；需要批量删除时停止并让达达手动处理。
