import { NextResponse } from "next/server";
import { getClassImageUrl, readReportData } from "@/lib/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ reportId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { reportId } = await context.params;
  try {
    const reportData = await readReportData(reportId);
    return NextResponse.json({
      ...reportData,
      imageUrls: reportData.classes.map((classReport, index) => ({
        className: classReport.className,
        url: getClassImageUrl(reportId, classReport.className, index)
      }))
    });
  } catch {
    return NextResponse.json({ error: "未找到报告。" }, { status: 404 });
  }
}
