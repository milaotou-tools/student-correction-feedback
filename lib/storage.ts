import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { withAppBasePath } from "./app-path";
import type { ReportData } from "./types";

const ROOT_DIR = process.cwd();
const STORAGE_ROOT = process.env.REPORT_STORAGE_ROOT
  ? path.resolve(process.env.REPORT_STORAGE_ROOT)
  : path.join(os.homedir(), ".student-correction-feedback");
const DATA_DIR = path.join(STORAGE_ROOT, "data", "reports");
const PUBLIC_REPORT_DIR = path.join(STORAGE_ROOT, "generated-reports");
const LEGACY_DATA_DIR = path.join(ROOT_DIR, "data", "reports");
const LEGACY_PUBLIC_REPORT_DIR = path.join(ROOT_DIR, "public", "generated-reports");

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
  return withAppBasePath(`/api/reports/${reportId}/image/${getClassImageFileName(className, index)}`);
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
  const dir = getReportDir(reportData.reportId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "report.json"), JSON.stringify(reportData, null, 2), "utf8");
}

export async function readReportData(reportId: string): Promise<ReportData> {
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

export async function ensurePublicReportDir(reportId: string): Promise<void> {
  await fs.mkdir(getPublicReportDir(reportId), { recursive: true });
}
