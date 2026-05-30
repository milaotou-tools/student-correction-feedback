import { NextResponse } from "next/server";
import { parseExcel } from "@/lib/excel";
import { generateAllFeedbackPngs } from "@/lib/report-image";
import { saveReportData } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileValue = formData.get("file");
    const weekLabel = String(formData.get("weekLabel") ?? "").trim();

    if (!fileValue || typeof fileValue === "string") {
      return NextResponse.json({ error: "请上传 Excel 文件。" }, { status: 400 });
    }

    const fileName = fileValue.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return NextResponse.json({ error: "仅支持 .xlsx 或 .xls 文件。" }, { status: 400 });
    }

    const buffer = Buffer.from(await fileValue.arrayBuffer());
    const reportData = await parseExcel(buffer, weekLabel);
    await saveReportData(reportData);
    await generateAllFeedbackPngs(reportData);

    return NextResponse.json({ reportId: reportData.reportId, warnings: reportData.warnings });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "生成失败，请检查 Excel 格式。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
