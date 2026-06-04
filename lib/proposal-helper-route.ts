import { NextResponse } from "next/server";
import { createChatCompletion } from "@/lib/ai-client";

export function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function runPrompt(system: string, user: string) {
  try {
    const text = await createChatCompletion([
      { role: "system", content: system },
      { role: "user", content: user }
    ]);

    return NextResponse.json({ text });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "生成失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
