import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import { getLegacyReportImagePath, getReportImagePath } from "@/lib/storage";

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

  const candidates = [
    getReportImagePath(reportId, safeFile),
    getLegacyReportImagePath(reportId, safeFile)
  ];

  for (const imagePath of candidates) {
    try {
      const image = await fs.readFile(imagePath);
      return new NextResponse(image, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-store"
        }
      });
    } catch {
      // try next location
    }
  }

  return NextResponse.json({ error: "Image not found" }, { status: 404 });
}
