import { NextRequest, NextResponse } from "next/server";
import { getDeepTitleClinicJob } from "@/lib/title-clinic-deep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await context.params;
  const job = getDeepTitleClinicJob(jobId);
  if (!job) return NextResponse.json({ error: "没有找到这个深度优化任务，可能已过期。" }, { status: 404 });
  return NextResponse.json(job, { headers: { "Cache-Control": "no-store" } });
}
