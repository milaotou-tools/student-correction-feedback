import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import { reanalyzeGradeReportData } from "./grade-analysis";
import type { GradeReportData } from "./grade-types";

const STORAGE_ROOT = process.env.REPORT_STORAGE_ROOT
  ? path.resolve(process.env.REPORT_STORAGE_ROOT)
  : process.env.VERCEL
    ? path.join(os.tmpdir(), "student-correction-feedback")
  : path.join(os.homedir(), ".student-correction-feedback");

const GRADE_DATA_DIR = path.join(STORAGE_ROOT, "grade-data", "grade-reports");

function shouldUseBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL && process.env.VERCEL_OIDC_TOKEN));
}

function getGradeReportBlobPath(gradeReportId: string): string {
  return `grade-data/grade-reports/${gradeReportId}/grade-report.json`;
}

async function readJsonBlob<T>(pathname: string): Promise<T | null> {
  if (!shouldUseBlobStorage()) {
    return null;
  }

  const blob = await getBlob(pathname, { access: "private", useCache: false });
  if (!blob?.stream) {
    return null;
  }

  const content = await new Response(blob.stream).text();
  return JSON.parse(content) as T;
}

export function getGradeReportDir(gradeReportId: string): string {
  return path.join(GRADE_DATA_DIR, gradeReportId);
}

export async function saveGradeReportData(reportData: GradeReportData): Promise<void> {
  if (shouldUseBlobStorage()) {
    await putBlob(getGradeReportBlobPath(reportData.gradeReportId), JSON.stringify(reportData, null, 2), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json"
    });
    return;
  }

  const dir = getGradeReportDir(reportData.gradeReportId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "grade-report.json"), JSON.stringify(reportData, null, 2), "utf8");
}

export async function readGradeReportData(gradeReportId: string): Promise<GradeReportData> {
  const blobData = await readJsonBlob<GradeReportData>(getGradeReportBlobPath(gradeReportId)).catch(() => null);
  if (blobData) {
    return reanalyzeGradeReportData(blobData);
  }

  const reportPath = path.join(getGradeReportDir(gradeReportId), "grade-report.json");
  const content = await fs.readFile(reportPath, "utf8");
  return reanalyzeGradeReportData(JSON.parse(content) as GradeReportData);
}
