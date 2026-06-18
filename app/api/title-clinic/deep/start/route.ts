import { NextRequest, NextResponse } from "next/server";
import { normalizeOutline } from "@/lib/title-clinic-ai";
import { startDeepTitleClinicJob } from "@/lib/title-clinic-deep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validatePayload(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const outline = normalizeOutline(body.outline);
  const fullText = typeof body.fullText === "string" ? body.fullText.trim() : "";
  const abstract = typeof body.abstract === "string" ? body.abstract.trim() : "";
  const intro = typeof body.intro === "string" ? body.intro.trim() : "";

  if (!title && !outline.length) return "请先上传 Word，或手动填写原标题和目录。";
  if ((fullText + abstract + intro).length < 80) return "请上传完整 Word，或补充摘要、引言、正文内容。";
  return "";
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "专家深度优化启动失败。");
  return message.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***").slice(0, 500);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const validation = validatePayload(body);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });
    const job = startDeepTitleClinicJob(body);
    return NextResponse.json(job, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
