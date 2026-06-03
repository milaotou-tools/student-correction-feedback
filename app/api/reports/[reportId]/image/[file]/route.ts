import { NextResponse } from "next/server";
import sharp from "sharp";
import { renderFeedbackSvg } from "@/lib/report-image";
import { getClassImageFileName, getReportImageContentType, readReportData, readReportImage } from "@/lib/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ reportId: string; file: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { reportId, file } = await context.params;
  const safeFile = file.split("/").pop();

  if (!safeFile) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  if (safeFile.toLowerCase().endsWith(".svg")) {
    const reportData = await readReportData(reportId).catch(() => null);
    const classReport = reportData?.classes.find((item, index) => getClassImageFileName(item.className, index) === safeFile);

    if (reportData && classReport) {
      return new NextResponse(renderFeedbackSvg(reportData, classReport), {
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });
    }
  }

  let image = await readReportImage(reportId, safeFile);
  if (!image && safeFile.toLowerCase().endsWith(".png")) {
    const legacySvg = await readReportImage(reportId, safeFile.replace(/\.png$/i, ".svg"));
    image = legacySvg ? await sharp(legacySvg).png().toBuffer() : null;
  }

  if (image) {
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": getReportImageContentType(safeFile),
        "Cache-Control": "no-store"
      }
    });
  }

  return NextResponse.json({ error: "Image not found" }, { status: 404 });
}
