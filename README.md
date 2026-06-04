# 课题申报小助手

这是一个轻量级网页工具，用于校本研修现场演示，帮助小学教师把模糊课题想法整理成申报书基本框架，并对已有申报书草稿进行问题诊断、逐栏打磨和模拟专家预审。

它不是课题申报平台，不包含账号、后台、权限、材料收集、考核检查或长期流程管理。

## 本地运行

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:3000/student-correction-feedback/proposal-helper
```

## DeepSeek API 配置

在 `.env.local` 中配置：

```bash
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-pro
```

当前实现使用 DeepSeek 的 OpenAI-compatible `/chat/completions` 接口。也可以使用其他兼容服务，配置以下变量即可：

```bash
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://your-compatible-provider.example.com
OPENAI_MODEL=your-model
```

`DEEPSEEK_*` 优先级高于 `OPENAI_*`。

## 功能

- 从课题想法生成申报书框架。
- 对申报书草稿做问题诊断。
- 按栏目逐栏打磨文本。
- 生成模拟专家预审意见。
- 内置 3 个演示样例。
- 输出结果支持一键复制。
- 支持 `/api/proposal-helper/health` 检查模型接口配置状态，不返回密钥内容。

## 提示词文件

提示词集中放在：

- `lib/prompts/generate-framework.ts`
- `lib/prompts/review-draft.ts`
- `lib/prompts/polish-section.ts`
- `lib/prompts/expert-review.ts`

核心原则是：基于教师输入，不虚构学校数据，不编造成果，不写成高校论文腔；信息不足时标注“需用户补充”。
