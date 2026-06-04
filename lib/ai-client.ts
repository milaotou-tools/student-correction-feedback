type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string; type?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-pro";

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function extractText(response: ChatCompletionResponse) {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part.text ?? "")
      .join("")
      .trim();
  }

  return "";
}

export async function createChatCompletion(messages: ChatMessage[]) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("尚未配置 DEEPSEEK_API_KEY，请先在 .env.local 中填写 DeepSeek API Key。");
  }

  const baseUrl = normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL);
  const model = process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.35,
        stream: false
      }),
      signal: controller.signal
    });

    const bodyText = await response.text();
    const body = bodyText ? (JSON.parse(bodyText) as ChatCompletionResponse) : {};

    if (!response.ok) {
      throw new Error(body.error?.message || `模型接口请求失败，状态码 ${response.status}。`);
    }

    const text = extractText(body);
    if (!text) {
      throw new Error("模型接口没有返回有效文本，请稍后重试或检查模型配置。");
    }

    return text;
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") {
      throw new Error("模型接口响应超时，请稍后重试或换用更快的模型。");
    }

    if (caught instanceof SyntaxError) {
      throw new Error("模型接口返回内容不是有效 JSON，请检查 DEEPSEEK_BASE_URL 是否为兼容接口地址。");
    }

    throw caught;
  } finally {
    clearTimeout(timeout);
  }
}
