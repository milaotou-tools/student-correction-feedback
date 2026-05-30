import { promises as fs } from "fs";
import path from "path";
import type { ReportData } from "./types";

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, "data", "reports");
const PUBLIC_REPORT_DIR = path.join(ROOT_DIR, "public", "generated-reports");

export function getReportDir(reportId: string): string {
  return path.join(DATA_DIR, reportId);
}

export function getPublicReportDir(reportId: string): string {
  return path.join(PUBLIC_REPORT_DIR, reportId);
}

export function getClassImageFileName(className: string, index: number): string {
  const numberMatch = className.match(/\d+/);
  return numberMatch ? `class-${numberMatch[0]}.png` : `class-${index + 1}.png`;
}

export function getClassImagePath(reportId: string, className: string, index: number): string {
  return path.join(getPublicReportDir(reportId), getClassImageFileName(className, index));
}

export function getClassImageUrl(reportId: string, className: string, index: number): string {
  return `/generated-reports/${reportId}/${getClassImageFileName(className, index)}`;
}

export async function saveReportData(reportData: ReportData): Promise<void> {
  const dir = getReportDir(reportData.reportId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "report.json"), JSON.stringify(reportData, null, 2), "utf8");
}

export async function readReportData(reportId: string): Promise<ReportData> {
  const reportPath = path.join(getReportDir(reportId), "report.json");
  const content = await fs.readFile(reportPath, "utf8");
  return JSON.parse(content) as ReportData;
}

export async function ensurePublicReportDir(reportId: string): Promise<void> {
  await fs.mkdir(getPublicReportDir(reportId), { recursive: true });
}
