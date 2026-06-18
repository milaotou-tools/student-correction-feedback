import { promises as fs } from "node:fs";
import path from "node:path";

export type OutlineItem = {
  id?: string;
  index?: number;
  level: number;
  text: string;
};

type TitleClinicPayload = {
  title?: string;
  abstract?: string;
  intro?: string;
  fullText?: string;
  outline?: OutlineItem[];
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>;
    };
    delta?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-pro";
const TIMEOUT_MS = 240000;

const SYSTEM_PROMPT = `
你是中文教育/社科论文“投稿前标题门诊”专家。

产品边界：
- 只优化已经成稿论文的标题和各级小标题。
- 不选题、不写论文、不润色全文、不做期刊匹配、不查重、不生成英文标题。
- 必须通读用户提供的 fullText，理解研究对象、问题、方法、场景和贡献，但输出仍限于标题诊断与标题层级优化。
- 不得虚构论文没有的对象、方法、结论、数据和模型。

专家方法论必须贯彻：
1. 先找唯一“题眼”。标题不能没有中心概念，也不能同时有多个中心概念。
2. 判断标题格局：工作格局最低，方法/范式格局较好，能落到“人的成长/教师发展/儿童理解/学生素养”的标题更高。
3. 避免“构建与实践”“路径与思考”“实践探索”“以某某为例”等低辨识度做法词，除非正文确实需要。
4. 可以使用冒号。冒号前应是特征、载体、亮点、隐喻、理论张力；冒号后应是对象、场景、实践或研究内容。
5. 小标题不是普通目录，要形成“题眼派生的专属套系”。一级标题冒号前负责同场、同向、递进、呼应题眼；冒号后负责解释正文真实内容。
6. 不优先套用“问题诊断、模型建构、实践探索、成效反思”等通用骨架；正文支撑不足时宁可朴素准确，不强行造概念。
7. 新版标题层级要尽量保留原文真实内容，只改标题表达，不新增原文没有的章节或事实。

输出要求：
- 只返回 JSON，不要 Markdown，不要解释 JSON 之外的内容。
- JSON 字符串内部如果需要强调概念，只能使用中文引号“”，绝不能使用英文半角双引号 "，避免破坏 JSON。
- diagnosis 最多 3 条。
- recommendedTitle 只给 1 个。
- alternativeTitles 固定 3 个：稳妥投稿型、问题意识型、学术表达型。
- outlineRevision 优先返回需要修改的标题项；未修改项可以省略，系统会按 id/index 自动回填。若一级标题形成套系需要整体调整，应覆盖所有一级标题。
- 如果 outlineRevision 中包含某一项，必须带回同一个 id；id 只用于前端回填，不要写进标题文本。

JSON 结构必须是：
{
  "profile": {
    "object": "研究对象",
    "scene": "研究场景",
    "method": "方法线索，没有则为空字符串",
    "academicPivot": "机制/困境/路径/逻辑/治理/范式/素养等学术支点"
  },
  "diagnosis": ["最多3条原题关键问题"],
  "recommendedTitle": "1个最推荐大标题",
  "recommendedReason": "1句话理由",
  "alternativeTitles": [
    {"type": "稳妥投稿型", "title": "标题", "reason": "1句话理由"},
    {"type": "问题意识型", "title": "标题", "reason": "1句话理由"},
    {"type": "学术表达型", "title": "标题", "reason": "1句话理由"}
  ],
  "outlineRevision": [
    {"id": "T0", "index": 0, "level": 0, "oldText": "原标题", "newText": "新版标题", "reason": "短理由"}
  ]
}
`.trim();

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function extractText(response: ChatCompletionResponse) {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content.map((part) => part.text ?? "").join("").trim();
  }

  return "";
}

function parseJsonObject(text: string) {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("模型没有返回有效 JSON。");
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      const repaired = repairLooseQuotes(match[0]);
      try {
        return JSON.parse(repaired);
      } catch (secondError) {
        throw secondError;
      }
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
        while (lookahead < raw.length && /\s/.test(raw[lookahead])) {
          lookahead += 1;
        }

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

function parseChatBody(bodyText: string) {
  if (!bodyText) {
    return {} as ChatCompletionResponse;
  }

  try {
    return JSON.parse(bodyText) as ChatCompletionResponse;
  } catch {
    return {
      error: {
        message: `模型接口返回了无法解析的响应：${bodyText.slice(0, 200)}`
      }
    };
  }
}

function truncateText(value: unknown, maxLength: number) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}\n\n[全文过长，已截断到前 ${maxLength} 字用于标题优化]`;
}

function normalizeLevel(value: unknown) {
  const level = Number(value);
  if (!Number.isFinite(level)) {
    return 3;
  }
  return Math.max(0, Math.min(4, Math.trunc(level)));
}

export function normalizeOutline(value: unknown): OutlineItem[] {
  return (Array.isArray(value) ? value : [])
    .map((item, index) => {
      const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        id: typeof source.id === "string" ? source.id : `T${index}`,
        index,
        level: normalizeLevel(source.level),
        text: String(source.text || "").trim()
      };
    })
    .filter((item) => item.text)
    .slice(0, 160);
}

async function loadExpertRules() {
  try {
    return (await fs.readFile(path.join(process.cwd(), "expert-methodology.md"), "utf8")).trim().slice(0, 32000);
  } catch {
    return "仅使用内置规则：唯一题眼、提升格局、避免做法化标题、标题层级形成题眼派生的专属套系。";
  }
}

function sanitizeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "标题优化失败。");
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***").slice(0, 500);
}

function stringOr(value: unknown, fallback: string) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function compactKey(value: unknown) {
  return String(value || "").replace(/\s+/g, "");
}

function fallbackOptimize(input: TitleClinicPayload) {
  const outline = normalizeOutline(input.outline);
  const title = stringOr(input.title, outline[0]?.text || "论文标题");
  const recommendedTitle = title
    .replace(/AI赋能/g, "AI数智")
    .replace(/构建与实践/g, "转型实践")
    .replace(/路径与思考/g, "转型实践")
    .replace(/实践探索/g, "循证实践")
    .replace(/(?:——|—|-)?[（(]?\s*以["“『《]?[^"”』》]+["”』》]?\s*为例\s*[)）]?$/g, "")
    .trim();

  return {
    profile: { object: "教育/社科论文", scene: "投稿前标题优化", method: "", academicPivot: "问题意识" },
    diagnosis: [
      "原标题需要进一步明确唯一题眼，避免多个概念并列导致主从关系不清。",
      "若标题停留在“构建与实践”“路径与思考”，容易显得工作化，缺少方法论和理论张力。",
      "一级标题冒号前应形成由题眼派生的专属套系，避免只是普通目录。"
    ],
    recommendedTitle,
    recommendedReason: "本地规则优先保留原题核心信息，并替换低辨识度做法词。",
    alternativeTitles: [
      { type: "稳妥投稿型", title: recommendedTitle, reason: "表达稳妥，保留研究对象和核心问题。" },
      { type: "问题意识型", title: `从问题呈现到结构转化：${recommendedTitle.replace(/[：:].+$/, "")}的标题优化`, reason: "突出问题意识和转化方向。" },
      { type: "学术表达型", title: `${recommendedTitle.replace(/[：:].+$/, "")}的结构化诊断与表达转化`, reason: "强化结构化诊断和学术表达。" }
    ],
    outlineRevision: outline.map((item, index) => ({
      id: item.id || `T${index}`,
      index,
      level: item.level,
      oldText: item.text,
      newText: index === 0 ? recommendedTitle : item.text,
      reason: index === 0 ? "优化大标题表达。" : ""
    }))
  };
}

async function repairModelJson(options: {
  baseUrl: string;
  apiKey: string;
  model: string;
  text: string;
  signal: AbortSignal;
}) {
  const response = await fetch(`${options.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: options.model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是 JSON 格式修复器。只修复用户给出的 JSON 文本格式，不改写标题内容，不增删字段。输出必须是一个合法 JSON 对象。字符串内部如有英文半角双引号，请改为中文引号“”或正确转义。不要输出 Markdown。"
        },
        {
          role: "user",
          content: options.text.slice(0, 60000)
        }
      ],
      temperature: 0,
      max_tokens: 12000,
      stream: false
    }),
    signal: options.signal
  });

  const body = parseChatBody(await response.text());
  if (!response.ok) {
    throw new Error(body.error?.message || `JSON 修复请求失败，状态码 ${response.status}。`);
  }

  const repaired = extractText(body);
  if (!repaired) {
    throw new Error("JSON 修复没有返回有效文本。");
  }

  return repaired;
}

function normalizeModelResult(result: Record<string, unknown>, input: TitleClinicPayload) {
  const fallback = fallbackOptimize(input);
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

  const recommendedTitle = stringOr(result.recommendedTitle, fallback.recommendedTitle);
  const alternatives = Array.isArray(result.alternativeTitles) ? result.alternativeTitles : [];
  const profile = result.profile && typeof result.profile === "object" ? result.profile as Record<string, unknown> : {};

  return {
    profile: {
      object: stringOr(profile.object, fallback.profile.object),
      scene: stringOr(profile.scene, fallback.profile.scene),
      method: stringOr(profile.method, ""),
      academicPivot: stringOr(profile.academicPivot, fallback.profile.academicPivot)
    },
    diagnosis: (Array.isArray(result.diagnosis) ? result.diagnosis : fallback.diagnosis)
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 3),
    recommendedTitle,
    recommendedReason: stringOr(result.recommendedReason, fallback.recommendedReason),
    alternativeTitles: ["稳妥投稿型", "问题意识型", "学术表达型"].map((type, index) => {
      const found = alternatives.find((entry) => entry && typeof entry === "object" && (entry as Record<string, unknown>).type === type);
      const source = (found || alternatives[index] || {}) as Record<string, unknown>;
      return {
        type,
        title: stringOr(source.title, fallback.alternativeTitles[index].title),
        reason: stringOr(source.reason, fallback.alternativeTitles[index].reason)
      };
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
    meta: { mode: "api", provider: "deepseek", model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL }
  };
}

export async function optimizeTitleClinic(input: TitleClinicPayload) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ...fallbackOptimize(input), meta: { mode: "fallback", reason: "DEEPSEEK_API_KEY is not configured" } };
  }

  const baseUrl = normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL);
  const model = process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const outline = normalizeOutline(input.outline).map((item, index) => ({
      id: item.id || `T${index}`,
      index,
      level: item.level,
      text: item.text
    }));
    const expertRules = await loadExpertRules();
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              expertRules,
              title: stringOr(input.title, ""),
              abstract: stringOr(input.abstract, ""),
              intro: stringOr(input.intro, ""),
              fullText: truncateText(input.fullText, 65000),
              outline,
              instruction:
                "请严格依据专家规则完成标题诊断和标题层级优化。必须通读 fullText。outlineRevision 只返回需要修改的项，必须带回同一 id、index、level、oldText、newText、reason；未修改项不要返回，系统会按原顺序回填。不要把 id 写进标题文本。"
            })
          }
        ],
        temperature: 0.25,
        max_tokens: 12000,
        stream: false
      }),
      signal: controller.signal
    });

    const bodyText = await response.text();
    const body = parseChatBody(bodyText);

    if (!response.ok) {
      throw new Error(body.error?.message || `模型接口请求失败，状态码 ${response.status}。`);
    }

    const text = extractText(body);
    if (!text) {
      throw new Error("模型接口没有返回有效文本。");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonObject(text);
    } catch {
      parsed = parseJsonObject(await repairModelJson({ baseUrl, apiKey, model, text, signal: controller.signal }));
    }

    return normalizeModelResult(parsed, input);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("模型接口响应超时，请稍后重试。");
    }
    throw new Error(sanitizeErrorMessage(error));
  } finally {
    clearTimeout(timeout);
  }
}

export function titleClinicHealth() {
  return {
    ok: true,
    provider: "deepseek",
    model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL,
    keyConfigured: Boolean(process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY),
    version: "integrated-title-clinic-v1"
  };
}
