import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { normalizeOutline, type OutlineItem } from "./title-clinic-ai";

type TitleClinicPayload = {
  title?: string;
  abstract?: string;
  intro?: string;
  fullText?: string;
  outline?: OutlineItem[];
};

type AlternativeTitle = {
  type: string;
  title: string;
  reason: string;
};

type OptimizeResult = {
  profile?: Record<string, string>;
  diagnosis?: string[];
  recommendedTitle?: string;
  recommendedReason?: string;
  alternativeTitles?: AlternativeTitle[];
  outlineRevision?: Array<{
    id?: string;
    index?: number;
    level?: number;
    oldText?: string;
    newText?: string;
    reason?: string;
  }>;
  meta?: Record<string, unknown>;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>;
    };
  }>;
  error?: { message?: string };
};

type DeepJobStatus = "queued" | "running" | "completed" | "failed";

type DeepJob = {
  id: string;
  status: DeepJobStatus;
  stage: string;
  progress: number;
  createdAt: number;
  updatedAt: number;
  result?: OptimizeResult;
  error?: string;
};

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-pro";
const CALL_TIMEOUT_MS = 240000;
const MAX_FULL_TEXT = 70000;
const MAX_EXPERT_RULES = 36000;
const MAX_CASE_LIBRARY = 52000;
const JOB_TTL_MS = 45 * 60 * 1000;

const globalForJobs = globalThis as typeof globalThis & {
  __titleClinicDeepJobs?: Map<string, DeepJob>;
};

const jobs = globalForJobs.__titleClinicDeepJobs ?? new Map<string, DeepJob>();
globalForJobs.__titleClinicDeepJobs = jobs;

const DEEP_SYSTEM_PROMPT = `
你是中文教育科研论文标题打磨专家，正在执行“专家深度优化”模式。

最高优先级证据：用户提供的专家改前/改后案例方法库。讲座文字只是解释材料，真实改后标题是方法的证据。

工作边界：
- 只优化大标题和各级小标题，不改正文。
- 必须读全文和原目录，理解对象、场景、问题、方法、证据、成效。
- 不得虚构正文没有的模型、数据、研究对象、结论、成效。
- 正文支撑不足时宁可朴素准确，不强行造概念。

质量要求：
- 先判断论文结构类型：叙事案例型、评价诊断型、教研模式型、理论建构型、教师成长型、数据循证型。
- 先判断与10个专家案例的谱系关系，再提炼题眼。
- 先提炼“套系母词/词场”，再生成一级标题冒号前半句。
- 一级标题冒号前必须同场、同向、递进、呼应题眼，不能随机使用高级词。
- 冒号后必须解释正文真实内容。
- 反撞衫：不要优先套用“问题诊断/模型建构/实践探索/成效反思”这类通用骨架。
- 规则优先级：贴正文 > 呼应题眼 > 成套系 > 文采。

输出必须是合法 JSON，不要 Markdown，不要 JSON 外文字。JSON 字符串内如需引号，用中文引号“”。
`.trim();

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function getApiConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");
  return {
    apiKey,
    baseUrl: normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL),
    model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL
  };
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "专家深度优化失败。");
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***").slice(0, 800);
}

function stringOr(value: unknown, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function truncateText(value: unknown, maxLength: number) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n\n[全文过长，深度模式已截取前 ${maxLength} 字；标题优化仍以已提供目录为结构依据]`;
}

function extractText(response: ChatCompletionResponse) {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("").trim();
  return "";
}

function parseChatBody(bodyText: string) {
  if (!bodyText) return {} as ChatCompletionResponse;
  try {
    return JSON.parse(bodyText) as ChatCompletionResponse;
  } catch {
    return { error: { message: `模型接口返回了无法解析的响应：${bodyText.slice(0, 200)}` } };
  }
}

function parseJsonObject(text: string) {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("模型没有返回有效 JSON。");
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return JSON.parse(repairLooseQuotes(match[0])) as Record<string, unknown>;
    }
  }
}

function repairLooseQuotes(raw: string) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === "\\" && inString) {
      output += char;
      escaped = !escaped;
      continue;
    }
    if (char === "\"" && !escaped) {
      if (!inString) {
        inString = true;
        output += char;
      } else {
        let lookahead = index + 1;
        while (lookahead < raw.length && /\s/.test(raw[lookahead])) lookahead += 1;
        const next = raw[lookahead] || "";
        if ([":", ",", "}", "]"].includes(next)) {
          inString = false;
          output += char;
        } else {
          output += "”";
        }
      }
      escaped = false;
      continue;
    }
    output += char;
    escaped = false;
  }
  return output.replace(/,\s*([}\]])/g, "$1");
}

async function callDeepSeekJson(options: { system: string; user: unknown; temperature?: number; maxTokens?: number }) {
  const { apiKey, baseUrl, model } = getApiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: typeof options.user === "string" ? options.user : JSON.stringify(options.user) }
        ],
        temperature: options.temperature ?? 0.18,
        max_tokens: options.maxTokens ?? 12000,
        stream: false
      }),
      signal: controller.signal
    });
    const body = parseChatBody(await response.text());
    if (!response.ok) throw new Error(body.error?.message || `模型接口请求失败，状态码 ${response.status}。`);
    const text = extractText(body);
    if (!text) throw new Error("模型接口没有返回有效文本。");
    try {
      return parseJsonObject(text);
    } catch {
      return parseJsonObject(await repairModelJson({ baseUrl, apiKey, model, text }));
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("模型接口响应超时，请稍后重试。");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function repairModelJson(options: { baseUrl: string; apiKey: string; model: string; text: string }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetch(`${options.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "你是 JSON 修复器。只修复格式，不改写标题内容，不增删字段。输出合法 JSON 对象。" },
          { role: "user", content: options.text.slice(0, 70000) }
        ],
        temperature: 0,
        max_tokens: 12000,
        stream: false
      }),
      signal: controller.signal
    });
    const body = parseChatBody(await response.text());
    if (!response.ok) throw new Error(body.error?.message || `JSON 修复失败，状态码 ${response.status}。`);
    const repaired = extractText(body);
    if (!repaired) throw new Error("JSON 修复没有返回有效文本。");
    return repaired;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadTextFile(name: string, fallback: string, maxLength: number) {
  try {
    return (await fs.readFile(path.join(process.cwd(), name), "utf8")).trim().slice(0, maxLength);
  } catch {
    return fallback;
  }
}

function normalizeLevel(value: unknown) {
  const level = Number(value);
  if (!Number.isFinite(level)) return 3;
  return Math.max(0, Math.min(4, Math.trunc(level)));
}

function compactKey(value: unknown) {
  return String(value || "").replace(/\s+/g, "");
}

function fallbackTitle(input: TitleClinicPayload) {
  const outline = normalizeOutline(input.outline);
  return stringOr(input.title, outline[0]?.text || "论文标题");
}

function normalizeResult(result: Record<string, unknown>, input: TitleClinicPayload, meta: Record<string, unknown>): OptimizeResult {
  const outline = normalizeOutline(input.outline);
  const revision = Array.isArray(result.outlineRevision) ? result.outlineRevision : [];
  const byIndex = new Map<number, Record<string, unknown>>();
  const byOldText = new Map<string, Record<string, unknown>>();
  for (const item of revision) {
    if (!item || typeof item !== "object") continue;
    const source = item as Record<string, unknown>;
    const index = Number(source.index);
    if (Number.isInteger(index)) byIndex.set(index, source);
    if (source.id && /^T\d+$/.test(String(source.id))) byIndex.set(Number(String(source.id).slice(1)), source);
    if (source.oldText) byOldText.set(compactKey(source.oldText), source);
  }
  const profile = result.profile && typeof result.profile === "object" ? result.profile as Record<string, unknown> : {};
  const recommendedTitle = stringOr(result.recommendedTitle, fallbackTitle(input));
  const alternatives = Array.isArray(result.alternativeTitles) ? result.alternativeTitles : [];
  const defaultTypes = ["稳妥投稿型", "问题意识型", "学术表达型"];
  return {
    profile: {
      object: stringOr(profile.object, ""),
      scene: stringOr(profile.scene, ""),
      method: stringOr(profile.method, ""),
      academicPivot: stringOr(profile.academicPivot, "")
    },
    diagnosis: (Array.isArray(result.diagnosis) ? result.diagnosis : []).map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3),
    recommendedTitle,
    recommendedReason: stringOr(result.recommendedReason, "基于专家案例库完成深度标题重构。"),
    alternativeTitles: defaultTypes.map((type, index) => {
      const found = alternatives.find((entry) => entry && typeof entry === "object" && (entry as Record<string, unknown>).type === type);
      const source = (found || alternatives[index] || {}) as Record<string, unknown>;
      return { type, title: stringOr(source.title, recommendedTitle), reason: stringOr(source.reason, "保留正文真实对象并强化标题表达。") };
    }),
    outlineRevision: outline.map((item, index) => {
      const update = byIndex.get(index) || byOldText.get(compactKey(item.text));
      return {
        id: item.id || `T${index}`,
        index,
        level: normalizeLevel(update?.level ?? item.level),
        oldText: item.text,
        newText: stringOr(update?.newText, index === 0 ? recommendedTitle : item.text),
        reason: stringOr(update?.reason, index === 0 ? "优化大标题表达。" : "")
      };
    }),
    meta
  };
}

function serializableJob(job: DeepJob) {
  return { jobId: job.id, status: job.status, stage: job.stage, progress: job.progress, result: job.result, error: job.error, createdAt: job.createdAt, updatedAt: job.updatedAt };
}

function setJob(job: DeepJob, patch: Partial<DeepJob>) {
  Object.assign(job, patch, { updatedAt: Date.now() });
}

function cleanupJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.updatedAt > JOB_TTL_MS) jobs.delete(id);
  }
}

export function startDeepTitleClinicJob(input: TitleClinicPayload) {
  cleanupJobs();
  const id = randomUUID();
  const now = Date.now();
  const job: DeepJob = { id, status: "queued", stage: "等待进入专家深度优化", progress: 1, createdAt: now, updatedAt: now };
  jobs.set(id, job);
  void runDeepJob(job, input);
  return serializableJob(job);
}

export function getDeepTitleClinicJob(jobId: string) {
  cleanupJobs();
  const job = jobs.get(jobId);
  return job ? serializableJob(job) : null;
}

async function runDeepJob(job: DeepJob, input: TitleClinicPayload) {
  try {
    const outline = normalizeOutline(input.outline).map((item, index) => ({ id: item.id || `T${index}`, index, level: item.level, text: item.text }));
    const basePayload = { title: stringOr(input.title, ""), abstract: stringOr(input.abstract, ""), intro: stringOr(input.intro, ""), fullText: truncateText(input.fullText, MAX_FULL_TEXT), outline };
    setJob(job, { status: "running", stage: "案例方法库对齐", progress: 8 });
    const [expertRules, expertCaseLibrary] = await Promise.all([
      loadTextFile("expert-methodology.md", "仅使用内置专家规则。", MAX_EXPERT_RULES),
      loadTextFile("expert-case-methodology.md", "缺少专家案例方法库时，仍以唯一题眼、格局提升、套系标题为核心。", MAX_CASE_LIBRARY)
    ]);

    setJob(job, { stage: "通读全文并定位案例谱系", progress: 18 });
    const analysis = await callDeepSeekJson({
      system: `${DEEP_SYSTEM_PROMPT}\n\n本轮只做诊断和案例谱系对齐，不改标题。`,
      user: { task: "根据专家案例库判断论文结构类型、案例谱系、题眼候选和一级标题套系方向。不要直接输出最终标题。", expertRules, expertCaseLibrary, paper: basePayload },
      temperature: 0.08,
      maxTokens: 9000
    });

    setJob(job, { stage: "结构诊断与标题重写", progress: 42 });
    let draft = await callDeepSeekJson({
      system: `${DEEP_SYSTEM_PROMPT}\n\n本轮输出最终候选 JSON。必须把专家案例库作为改写依据。`,
      user: {
        task: "重写大标题、所有一级标题、关键二级标题。outlineRevision 必须覆盖 T0 和所有 level=1 的一级标题；若二级标题明显普通，也要修改。未修改的低层级标题可省略。",
        expertRules,
        expertCaseLibrary,
        caseAlignment: analysis,
        paper: basePayload,
        outputSchema: {
          profile: { object: "研究对象", scene: "研究场景", method: "方法线索", academicPivot: "学术支点" },
          diagnosis: ["最多3条原题关键问题"],
          recommendedTitle: "1个最推荐大标题",
          recommendedReason: "1句话理由，说明题眼与案例谱系",
          alternativeTitles: [
            { type: "稳妥投稿型", title: "标题", reason: "理由" },
            { type: "问题意识型", title: "标题", reason: "理由" },
            { type: "学术表达型", title: "标题", reason: "理由" }
          ],
          outlineRevision: [{ id: "T0", index: 0, level: 0, oldText: "原标题", newText: "新版标题", reason: "短理由" }]
        }
      },
      temperature: 0.16,
      maxTokens: 14000
    });

    setJob(job, { stage: "专家复核：检查题眼、套系、贴正文", progress: 66 });
    const review = await callDeepSeekJson({
      system: `${DEEP_SYSTEM_PROMPT}\n\n你现在扮演严苛复核专家，只评价标题方案是否像专家改后的标题。`,
      user: { task: "复核标题方案。重点检查：唯一题眼、格局提升、一级标题冒号前是否形成同一词场的递进套系、冒号后是否贴正文、是否撞衫、是否虚构。", expertCaseLibrary, caseAlignment: analysis, paper: basePayload, draft },
      temperature: 0,
      maxTokens: 7000
    });

    const score = Number(review.score);
    const pass = review.pass === true || String(review.pass).toLowerCase() === "true";
    const rewriteRequired = review.rewriteRequired === true || String(review.rewriteRequired).toLowerCase() === "true";
    const needsRewrite = !pass || rewriteRequired || (Number.isFinite(score) && score < 86);

    if (needsRewrite) {
      setJob(job, { stage: "复核未过：按专家意见再改一轮", progress: 78 });
      draft = await callDeepSeekJson({
        system: `${DEEP_SYSTEM_PROMPT}\n\n这是唯一一次自动重改。必须修复复核指出的问题，尤其是一级标题冒号前割裂、题眼不清、通用骨架和虚构。`,
        user: { task: "根据复核意见重写最终 JSON。仍然只改标题和小标题，不改正文。outlineRevision 必须覆盖 T0 和所有 level=1。", expertRules, expertCaseLibrary, caseAlignment: analysis, review, paper: basePayload, previousDraft: draft },
        temperature: 0.12,
        maxTokens: 14000
      });
    }

    setJob(job, { stage: "定稿输出", progress: 94 });
    const { model } = getApiConfig();
    const result = normalizeResult(draft, { ...input, outline }, { mode: "deep", provider: "deepseek", model, reviewScore: Number.isFinite(score) ? score : null, rewrittenAfterReview: needsRewrite, stage: "专家深度优化" });
    setJob(job, { status: "completed", stage: "专家深度优化完成", progress: 100, result });
  } catch (error) {
    setJob(job, { status: "failed", stage: "专家深度优化失败", progress: Math.max(job.progress, 1), error: sanitizeError(error) });
  }
}
