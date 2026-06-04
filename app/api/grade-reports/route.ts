import { NextResponse } from "next/server";
import { parseGradeExcel } from "@/lib/grade-excel";
import { markLatestGradeReport, saveGradeReportData } from "@/lib/grade-storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const fileValue = formData.get("file");

    if (!fileValue || typeof fileValue === "string") {
      return NextResponse.json({ error: "请上传成绩 Excel 文件。" }, { status: 400 });
    }

    const fileName = fileValue.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return NextResponse.json({ error: "仅支持 .xlsx 或 .xls 文件。" }, { status: 400 });
    }

    const buffer = Buffer.from(await fileValue.arrayBuffer());
    const reportData = await parseGradeExcel(buffer);
    await saveGradeReportData(reportData);
    await markLatestGradeReport(reportData);

    return NextResponse.json({ gradeReportId: reportData.gradeReportId, warnings: reportData.warnings });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "生成失败，请检查成绩单格式。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
