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

function getLatestGradeReportBlobPath(): string {
  return "grade-data/grade-reports/latest.json";
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

export async function markLatestGradeReport(reportData: GradeReportData): Promise<void> {
  const latest = {
    gradeReportId: reportData.gradeReportId,
    updatedAt: new Date().toISOString()
  };

  if (shouldUseBlobStorage()) {
    await putBlob(getLatestGradeReportBlobPath(), JSON.stringify(latest, null, 2), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json"
    });
    return;
  }

  await fs.mkdir(GRADE_DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(GRADE_DATA_DIR, "latest.json"), JSON.stringify(latest, null, 2), "utf8");
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

export async function readLatestGradeReportData(): Promise<GradeReportData | null> {
  const blobLatest = await readJsonBlob<{ gradeReportId: string }>(getLatestGradeReportBlobPath()).catch(() => null);
  if (blobLatest?.gradeReportId) {
    return readGradeReportData(blobLatest.gradeReportId).catch(() => null);
  }

  try {
    const latest = JSON.parse(await fs.readFile(path.join(GRADE_DATA_DIR, "latest.json"), "utf8")) as {
      gradeReportId?: string;
    };
    if (latest.gradeReportId) {
      return await readGradeReportData(latest.gradeReportId).catch(() => null);
    }
  } catch {
    // fall back to scanning local grade reports
  }

  try {
    const entries = await fs.readdir(GRADE_DATA_DIR, { withFileTypes: true });
    const reports: GradeReportData[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const report = await readGradeReportData(entry.name).catch(() => null);
      if (report) reports.push(report);
    }
    reports.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return reports[0] ?? null;
  } catch {
    return null;
  }
}
