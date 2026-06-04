import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { get as getBlob, put as putBlob } from "@vercel/blob";
import { withAppBasePath } from "./app-path";
import type { ReportData } from "./types";

const ROOT_DIR = process.cwd();
const STORAGE_ROOT = process.env.REPORT_STORAGE_ROOT
  ? path.resolve(process.env.REPORT_STORAGE_ROOT)
  : process.env.VERCEL
    ? path.join(os.tmpdir(), "student-correction-feedback")
    : path.join(os.homedir(), ".student-correction-feedback");
const DATA_DIR = path.join(STORAGE_ROOT, "data", "reports");
const PUBLIC_REPORT_DIR = path.join(STORAGE_ROOT, "generated-reports");
const LEGACY_DATA_DIR = path.join(ROOT_DIR, "data", "reports");
const LEGACY_PUBLIC_REPORT_DIR = path.join(ROOT_DIR, "public", "generated-reports");

function shouldUseBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL && process.env.VERCEL_OIDC_TOKEN));
}

function getReportBlobPath(reportId: string): string {
  return `data/reports/${reportId}/report.json`;
}

function getLatestReportBlobPath(): string {
  return "data/reports/latest.json";
}

function getReportImageBlobPath(reportId: string, fileName: string): string {
  return `generated-reports/${reportId}/${fileName}`;
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

export function getReportDir(reportId: string): string {
  return path.join(DATA_DIR, reportId);
}

export function getLegacyReportDir(reportId: string): string {
  return path.join(LEGACY_DATA_DIR, reportId);
}

export function getPublicReportDir(reportId: string): string {
  return path.join(PUBLIC_REPORT_DIR, reportId);
}

export function getLegacyPublicReportDir(reportId: string): string {
  return path.join(LEGACY_PUBLIC_REPORT_DIR, reportId);
}

export function getClassImageFileName(className: string, index: number): string {
  const numberMatch = className.match(/\d+/);
  return numberMatch ? `class-${numberMatch[0]}.png` : `class-${index + 1}.png`;
}

export function getClassImagePath(reportId: string, className: string, index: number): string {
  return path.join(getPublicReportDir(reportId), getClassImageFileName(className, index));
}

export function getClassImageUrl(reportId: string, className: string, index: number): string {
  return withAppBasePath(`/api/reports/${reportId}/image/${getClassImageFileName(className, index)}?v=browser-png-v6`);
}

export function getClassDownloadUrl(reportId: string, className: string, index: number): string {
  return withAppBasePath(`/api/reports/${reportId}/download/${getClassImageFileName(className, index)}`);
}

export function getReportImagePath(reportId: string, fileName: string): string {
  return path.join(getPublicReportDir(reportId), fileName);
}

export function getLegacyReportImagePath(reportId: string, fileName: string): string {
  return path.join(getLegacyPublicReportDir(reportId), fileName);
}

export async function saveReportData(reportData: ReportData): Promise<void> {
  if (shouldUseBlobStorage()) {
    await putBlob(getReportBlobPath(reportData.reportId), JSON.stringify(reportData, null, 2), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json"
    });
    return;
  }

  const dir = getReportDir(reportData.reportId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "report.json"), JSON.stringify(reportData, null, 2), "utf8");
}

export async function markLatestReport(reportData: ReportData): Promise<void> {
  const latest = {
    reportId: reportData.reportId,
    updatedAt: new Date().toISOString()
  };

  if (shouldUseBlobStorage()) {
    await putBlob(getLatestReportBlobPath(), JSON.stringify(latest, null, 2), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json"
    });
    return;
  }

  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, "latest.json"), JSON.stringify(latest, null, 2), "utf8");
}

export async function readReportData(reportId: string): Promise<ReportData> {
  const blobData = await readJsonBlob<ReportData>(getReportBlobPath(reportId)).catch(() => null);
  if (blobData) {
    return blobData;
  }

  const reportPaths = [
    path.join(getReportDir(reportId), "report.json"),
    path.join(getLegacyReportDir(reportId), "report.json")
  ];

  for (const reportPath of reportPaths) {
    try {
      const content = await fs.readFile(reportPath, "utf8");
      return JSON.parse(content) as ReportData;
    } catch {
      // try the next location
    }
  }

  throw new Error("Report data not found");
}

export async function readLatestReportData(): Promise<ReportData | null> {
  const blobLatest = await readJsonBlob<{ reportId: string }>(getLatestReportBlobPath()).catch(() => null);
  if (blobLatest?.reportId) {
    return readReportData(blobLatest.reportId).catch(() => null);
  }

  const latestPath = path.join(DATA_DIR, "latest.json");
  try {
    const latest = JSON.parse(await fs.readFile(latestPath, "utf8")) as { reportId?: string };
    if (latest.reportId) {
      return await readReportData(latest.reportId).catch(() => null);
    }
  } catch {
    // fall back to scanning local reports
  }

  try {
    const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
    const reports: ReportData[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const report = await readReportData(entry.name).catch(() => null);
      if (report) reports.push(report);
    }
    reports.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return reports[0] ?? null;
  } catch {
    return null;
  }
}

export async function ensurePublicReportDir(reportId: string): Promise<void> {
  await fs.mkdir(getPublicReportDir(reportId), { recursive: true });
}

export function getReportImageContentType(fileName: string): string {
  return fileName.toLowerCase().endsWith(".svg") ? "image/svg+xml; charset=utf-8" : "image/png";
}

export async function saveReportImage(reportId: string, fileName: string, image: Buffer): Promise<void> {
  if (shouldUseBlobStorage()) {
    await putBlob(getReportImageBlobPath(reportId, fileName), image, {
      access: "private",
      allowOverwrite: true,
      contentType: getReportImageContentType(fileName)
    });
    return;
  }

  await ensurePublicReportDir(reportId);
  await fs.writeFile(getReportImagePath(reportId, fileName), image);
}

export async function readReportImage(reportId: string, fileName: string): Promise<Buffer | null> {
  if (shouldUseBlobStorage()) {
    const blob = await getBlob(getReportImageBlobPath(reportId, fileName), {
      access: "private",
      useCache: false
    });
    if (blob?.stream) {
      return Buffer.from(await new Response(blob.stream).arrayBuffer());
    }
  }

  const candidates = [
    getReportImagePath(reportId, fileName),
    getLegacyReportImagePath(reportId, fileName)
  ];

  for (const imagePath of candidates) {
    try {
      return await fs.readFile(imagePath);
    } catch {
      // try next location
    }
  }

  return null;
}
