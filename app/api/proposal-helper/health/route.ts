import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-v4-pro";

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export async function GET() {
  const keyConfigured = Boolean(process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY);
  const baseUrl = normalizeBaseUrl(process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL);
  const model = process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || DEFAULT_MODEL;

  return NextResponse.json({
    ok: keyConfigured,
    provider: baseUrl.includes("deepseek") ? "DeepSeek" : "OpenAI-compatible",
    model,
    baseUrl,
    keyConfigured
  });
}
