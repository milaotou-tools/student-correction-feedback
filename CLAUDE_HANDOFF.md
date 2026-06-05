# Claude 交接说明：课题申报小助手

## 当前状态

项目路径：`C:\Users\admin\Desktop\一周订正情况反馈`

新增工具页面：

- 本地访问：`http://localhost:3005/student-correction-feedback/proposal-helper`
- Next.js 路由：`app/proposal-helper/page.tsx`
- 主组件：`components/proposal-helper/ProposalHelperApp.tsx`
- API 路由：`app/api/proposal-helper/*`
- 提示词：`lib/prompts/*`
- AI 调用封装：`lib/ai-client.ts`
- API 公共封装：`lib/proposal-helper-route.ts`

这个工具定位是“校本研修现场演示用的轻量网页工具”，不是课题申报管理平台。不要加账号、后台、权限、材料收集、流程管理、学校检查或 KPI 相关功能。

## 已实现功能

1. “我还没有申报书”：根据课题想法生成申报书框架。
2. “我已经有草稿”：粘贴草稿后可做整体诊断、逐栏打磨、模拟专家预审。
3. 内置示例：
   - 框架生成：数学概念图、班级习惯、应用题错题。
   - 草稿打磨：完整草稿、研究内容片段、预审草稿。
4. 结果区支持整体复制和按栏目复制。
5. API 健康检查按钮：标题区右上角“演示前检查”。
6. 已删除用户不想保留的两句首页文案：
   - “只帮老师把想法理清楚，不替学校增加流程。”
   - “教师应该具有研究性思维，但不应该有研究的 KPI，所以，谢谢你用我的工具。”

## 模型配置

本地 `.env.local` 已配置 DeepSeek，不要在回复或代码中暴露密钥。

优先读取：

```env
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
```

兼容备用：

```env
OPENAI_API_KEY=
OPENAI_BASE_URL=
OPENAI_MODEL=
```

`DEEPSEEK_*` 优先级高于 `OPENAI_*`。

Vercel Production / Preview 环境变量已同步 DeepSeek 配置。Vercel 项目已连接 GitHub 仓库：

`milaotou-tools/student-correction-feedback`

生产地址：

`https://student-correction-feedback.vercel.app`

## 本地运行与验证

构建：

```bash
npm run build
```

测试：

```bash
npm test
```

当前本地演示使用 3005 端口。仓库配置了 `basePath: "/student-correction-feedback"`，所以访问路径必须带 basePath：

```text
http://localhost:3005/student-correction-feedback/proposal-helper
```

如果需要重启 3005：

1. 查端口：

```powershell
netstat -ano | findstr :3005
```

2. 停掉明确 PID：

```powershell
Stop-Process -Id <PID>
```

3. 启动：

```powershell
Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'node_modules\next\dist\bin\next','start','--port','3005' -WorkingDirectory 'C:\Users\admin\Desktop\一周订正情况反馈' -WindowStyle Hidden
```

## 最近验证结果

最后一次验证：

- `npm run build` 通过。
- `npm test` 通过，2 个测试文件，23 个测试全部通过。
- `http://localhost:3005/student-correction-feedback/proposal-helper` 返回 200。
- 已确认页面中不再包含上述两句被删除文案。

## Git 状态提醒

当前课题申报小助手相关改动尚未提交。`git status --short` 中会看到：

- `.env.example` 修改。
- `README.md` 新增。
- `app/api/proposal-helper/` 新增。
- `app/proposal-helper/` 新增。
- `components/proposal-helper/` 新增。
- `lib/ai-client.ts` 新增。
- `lib/prompts/` 新增。
- `lib/proposal-helper-route.ts` 新增。

另外有未跟踪日志文件：

- `focus-start.err`
- `prod-3003.err`

不要批量删除文件。达达的仓库规则是：禁止批量删除，只能用 `Remove-Item` 一次删除一个明确路径的文件；如果需要批量删除，必须停止并让用户手动处理。

## 建议 Claude 继续优化的优先级

1. 先不要挂到首页入口，等达达确认工具成熟后再挂。
2. 优先从用户使用角度优化流程，而不是做视觉大改：
   - 让“已有草稿”的示例入口更明显。
   - 草稿诊断、逐栏打磨、专家预审三种动作的差异再清楚一些。
   - 生成中状态可以更明确告诉用户当前在做什么。
   - 错误提示可以更口语化，说明是模型接口、网络、输入缺失还是配置问题。
3. 保持轻量，不要引入数据库、登录、权限、管理后台。
4. 提示词继续坚持：
   - 小学教育课题申报语言。
   - 不编造学校数据、研究成果或学生表现。
   - 信息不足时写“需用户补充”。
   - 保留教师真实想法，不一键整篇胡乱重写。

