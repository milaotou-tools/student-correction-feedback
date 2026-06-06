# 域名部署交接文档

## 当前状态

- 服务器：`116.62.220.255`
- 管理工具：BT Panel + Nginx + PM2
- 当前站点：
  - `https://feedback.we-teach.cn` -> `http://127.0.0.1:3002`
  - `https://proposal.we-teach.cn` -> `http://127.0.0.1:3005`
  - `https://we-teach.cn` -> 首页代码已准备，待 BT Panel 接线
  - `https://toolou.cn` -> 首页代码已准备，待 BT Panel 接线

## 代码现状

- `basePath` 已从 `next.config.ts` 移除
- 站点根路径 `/` 直接作为生产入口
- `feedback.we-teach.cn` 不再依赖 `/student-correction-feedback`
- `we-teach.cn` 与 `toolou.cn` 的首页代码已按 Host 区分，但生产接线仍待完成
- `proposal-helper` 仍是独立项目，不在本仓库中维护

## 部署原则

1. DNS 只负责把域名指向服务器 IP。
2. BT Panel 只负责反向代理、SSL 和站点级配置。
3. GitHub Actions 只负责部署当前仓库对应的服务，不再批量修改服务器 Nginx。
4. 部署后如果页面没有刷新，优先清理 Nginx proxy cache，再重载 Nginx。
5. AI 接口响应慢时，保留较长超时，建议 `proxy_read_timeout 180s`。

## PM2 约定

- `student-correction-feedback` -> `3002`
- `proposal-helper` -> `3005`

重启顺序：

1. `pm2 delete <name>`
2. `pm2 save --force`
3. `fuser -k <port>/tcp`
4. 重新启动对应进程
5. `pm2 save`

## 备注

- `feedback.we-teach.cn` 现在应直接打开站点根路径。
- 不要再把 `basePath` 加回来，除非明确要恢复子路径方案。
- `toolou.cn` 仍待补齐首页内容。
