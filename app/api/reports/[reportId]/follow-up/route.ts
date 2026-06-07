import { NextResponse } from "next/server";
import { getFollowUpStudents } from "@/lib/report-utils";
import { readReportData } from "@/lib/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ reportId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const configuredPassword = process.env.TEACHER_PAGE_PASSWORD;
  if (!configuredPassword) {
    return NextResponse.json({ error: "服务未配置密码" }, { status: 500 });
  }

  const { reportId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { password?: string };
  if (body.password !== configuredPassword) {
    return NextResponse.json({ error: "密码错误，请重试" }, { status: 401 });
  }

  try {
    const reportData = await readReportData(reportId);
    return NextResponse.json({ students: getFollowUpStudents(reportData) });
  } catch {
    return NextResponse.json({ error: "未找到报告。" }, { status: 404 });
  }
}
