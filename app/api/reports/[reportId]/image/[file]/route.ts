import { NextResponse } from "next/server";
import { renderFeedbackPngBuffer } from "@/lib/report-image";
import { getClassImageFileName, getReportImageContentType, readReportData, readReportImage, saveReportImage } from "@/lib/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ reportId: string; file: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { reportId, file } = await context.params;
  const safeFile = file.split("/").pop();
  const version = new URL(request.url).searchParams.get("v");
  const shouldRegenerate = version === "browser-png-v5";

  if (!safeFile) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  let image = shouldRegenerate ? null : await readReportImage(reportId, safeFile);
  if (!image && safeFile.toLowerCase().endsWith(".png")) {
    const reportData = await readReportData(reportId).catch(() => null);
    const classReport = reportData?.classes.find((item, index) => getClassImageFileName(item.className, index) === safeFile);
    if (reportData && classReport) {
      image = await renderFeedbackPngBuffer(reportData, classReport);
      await saveReportImage(reportId, safeFile, image).catch(() => undefined);
    }
  }

  if (image) {
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": getReportImageContentType(safeFile),
        "Content-Length": String(image.byteLength),
        "Content-Disposition": `inline; filename="${safeFile}"`,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  }

  return NextResponse.json({ error: "Image not found" }, { status: 404 });
}
