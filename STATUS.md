# 当前状态

更新时间：2026-06-18

## 已完成

- `feedback.we-teach.cn/title-clinic/` 已集成论文标题优化门诊。
- 后端通过 `DEEPSEEK_API_KEY` 调用 DeepSeek，不在前端暴露密钥。
- 已修复 GitHub Actions 到阿里云服务器的 Secret 传递问题。
- 已修复标题优化页面遇到 HTML 错误页时报 `Unexpected token '<'` 的前端解析问题。
- 已优化标题优化提示词：模型只返回需要修改的标题项，服务端按原顺序回填未修改项，减少长目录响应体和超时概率。
- 已在阿里云 Nginx 中为 `/api/title-clinic/` 写入 300 秒长超时反向代理配置。

## 最近验证

- 本地 `cmd /c npm run build` 通过。
- GitHub Actions 部署 `27757371191` 成功。
- 线上页面 `https://feedback.we-teach.cn/title-clinic/` 返回 200。
- 线上健康检查 `https://feedback.we-teach.cn/api/title-clinic/health/` 返回 JSON 且 key 已配置。
- 线上标题优化接口用较长正文实测返回 `Status 200`、`Content-Type: application/json`、`Mode: api`。

## 当前阻塞

- 无。

## 下一步

- 让达达在浏览器刷新页面后重试真实 Word。
- 如果仍遇到失败，优先记录页面显示的 HTTP 状态和可读错误文本，再查 PM2/Nginx 日志。