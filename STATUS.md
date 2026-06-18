# 当前状态

更新时间：2026-06-18

## 已完成

- `feedback.we-teach.cn/title-clinic/` 已集成论文标题优化门诊。
- 后端通过 `DEEPSEEK_API_KEY` 调用 DeepSeek，不在前端暴露密钥。
- 已修复 GitHub Actions 到阿里云服务器的 Secret 传递问题。
- 已修复标题优化页面遇到 HTML 错误页时报 `Unexpected token '<'` 的前端解析问题。
- 已优化标题优化提示词：模型只返回需要修改的标题项，服务端按原顺序回填未修改项，减少长目录响应体和超时概率。
- 已在阿里云 Nginx 中为 `/api/title-clinic/` 写入 300 秒长超时反向代理配置。
- 已新增“专家深度优化”模式：基于专家改前/改后案例库，后台任务轮询，多轮执行“案例方法库对齐 → 通读全文 → 结构诊断 → 标题重写 → 专家复核 → 必要时再改一轮 → 定稿输出”。
- 已新增 `expert-case-methodology.md`，把 10 个专家真实改前/改后案例整理为最高优先级方法证据。
- 已新增深度模式 API：`POST /api/title-clinic/deep/start`、`GET /api/title-clinic/deep/jobs/[jobId]`。

## 最近验证

- 本地 `cmd /c npm run build` 通过。
- Next.js 构建已识别新增动态路由：`/api/title-clinic/deep/start` 与 `/api/title-clinic/deep/jobs/[jobId]`。
- GitHub Actions 部署 `27757371191` 成功（深度模式新增后尚未重新部署）。
- 线上页面 `https://feedback.we-teach.cn/title-clinic/` 返回 200。
- 线上健康检查 `https://feedback.we-teach.cn/api/title-clinic/health/` 返回 JSON 且 key 已配置。

## 当前阻塞

- 深度模式已通过本地生产构建，但尚未部署到阿里云生产环境。
- 深度模式质量还需要用真实 Word 样本做端到端验证。

## 下一步

- 达达确认后，把深度模式相关文件提交并推送，触发阿里云部署。
- 部署后验证 `/title-clinic` 页面是否出现“专家深度优化”按钮，并用真实文章跑一轮深度任务。
- 如果深度输出仍不够像专家，需要继续扩充 `expert-case-methodology.md` 的案例证据卡，而不是先调页面样式。
