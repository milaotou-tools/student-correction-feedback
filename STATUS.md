# 当前状态

更新时间：2026-06-18

## 已完成

- `feedback.we-teach.cn/title-clinic/` 已集成论文标题优化门诊。
- 后端通过 `DEEPSEEK_API_KEY` 调用 DeepSeek，不在前端暴露密钥。
- 最近修复了 GitHub Actions 到阿里云服务器的 Secret 传递问题。

## 本次处理中

- 用户反馈标题优化页面出现 `Unexpected token '<'`，判断为线上 API 收到 HTML 错误页后前端按 JSON 解析。
- 已在前端增加非 JSON 响应的可读错误处理。
- 已优化标题优化提示词，模型只返回需要修改的标题项，服务端按原顺序回填未修改项，减少长目录响应体和超时概率。
- 已在部署 workflow 中为 `/api/title-clinic/` 增加长超时反向代理配置，部署时执行 `nginx -t` 后 reload。

## 最近验证

- 本地 `cmd /c npm run build` 通过。

## 当前阻塞

- 无。等待提交、推送、部署并验证线上长请求。

## 下一步

1. 提交本次修复。
2. 推送 `main` 触发阿里云部署。
3. 验证页面、健康检查和标题优化接口。