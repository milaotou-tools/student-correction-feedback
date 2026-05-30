import * as XLSX from "xlsx";
import { generateReportId } from "./report-utils";
import { getAttentionLevel, normalizeStatus, STANDARD_STATUSES } from "./status";
import type { ClassReport, ReportData, Status } from "./types";

type HeaderInfo = {
  rowIndex: number;
  studentIdIndex: number;
  nameIndex: number;
  dateColumns: { label: string; index: number }[];
};

const CLASS_NAME_RE = /([一二三四五六七八九十\d]+班)/;
const DATE_RE = /(\d{1,2})\s*月\s*(\d{1,2})\s*日/;
const COMPACT_DATE_RE = /(?:^|[^\d])(\d{1,2})(\d{2})(?:[^\d]|$)/;

function cleanCell(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeDateLabel(value: unknown): string {
  const raw = cleanCell(value).replace(/\s+/g, "");
  const match = raw.match(DATE_RE);
  if (match) return `${Number(match[1])}月${Number(match[2])}日`;

  const compactMatch = raw.match(COMPACT_DATE_RE);
  if (!compactMatch) return "";
  const month = Number(compactMatch[1]);
  const day = Number(compactMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${month}月${day}日`;
}

function getDateSortValue(label: string): number {
  const match = label.match(DATE_RE);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 100 + Number(match[2]);
}

function inferClassName(sheetName: string): string {
  const match = sheetName.match(CLASS_NAME_RE);
  return match?.[1] ?? sheetName.trim();
}

function findHeader(rows: string[][]): HeaderInfo | null {
  const searchLimit = Math.min(rows.length, 12);

  for (let rowIndex = 0; rowIndex < searchLimit; rowIndex += 1) {
    const row = rows[rowIndex];
    const studentIdIndex = row.findIndex((cell) => cell.includes("学号"));
    const nameIndex = row.findIndex((cell) => cell.includes("姓名"));
    const dateColumns = row
      .map((cell, index) => ({ label: normalizeDateLabel(cell), index }))
      .filter((item) => item.label)
      .sort((a, b) => getDateSortValue(a.label) - getDateSortValue(b.label));

    if (studentIdIndex >= 0 && nameIndex >= 0 && dateColumns.length > 0) {
      return { rowIndex, studentIdIndex, nameIndex, dateColumns };
    }
  }

  return null;
}

function isKnownStatus(status: Status): boolean {
  return status === "" || STANDARD_STATUSES.includes(status as never);
}

export async function parseExcel(buffer: Buffer, weekLabel: string): Promise<ReportData> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const warnings: string[] = [];
  const classes: ClassReport[] = [];
  let dates: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    if (!CLASS_NAME_RE.test(sheetName)) continue;

    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false
    });
    const rows = rawRows
      .map((row) => row.map(cleanCell))
      .filter((row) => row.some((cell) => cell !== ""));

    const header = findHeader(rows);
    if (!header) {
      warnings.push(`${sheetName} 未找到包含“学号、姓名、日期”的表头，已跳过。`);
      continue;
    }

    const className = inferClassName(sheetName);
    const sheetDates = header.dateColumns.map((column) => column.label);
    if (dates.length === 0) {
      dates = sheetDates;
    }

    const students = rows.slice(header.rowIndex + 1).flatMap((row) => {
      const studentId = cleanCell(row[header.studentIdIndex]);
      const name = cleanCell(row[header.nameIndex]);
      if (!studentId && !name) return [];
      if (!name) return [];

      const statuses = Object.fromEntries(
        dates.map((date) => {
          const matchingColumn = header.dateColumns.find((column) => column.label === date);
          const normalized = normalizeStatus(matchingColumn ? row[matchingColumn.index] : "");
          if (!isKnownStatus(normalized)) {
            warnings.push(`${className} ${name} ${date} 发现未知状态：“${normalized}”。`);
          }
          return [date, normalized];
        })
      );

      return [
        {
          className,
          studentId,
          name,
          statuses,
          attentionLevel: getAttentionLevel(dates.map((date) => statuses[date]))
        }
      ];
    });

    if (students.length > 0) {
      classes.push({ className, students });
    }
  }

  if (classes.length === 0) {
    throw new Error("未识别到班级数据。请确认工作表名称包含“1班”“2班”，且表头包含学号、姓名和日期列。");
  }

  if (classes.length < 2) {
    warnings.push("本次只识别到一个班级。如 Excel 中有两个班，请确认两个工作表名称包含“1班”“2班”。");
  }

  const reportId = generateReportId();
  const dateRange = dates.length > 0 ? `${dates[0]}—${dates[dates.length - 1]}` : "";

  return {
    reportId,
    title: "学生一周订正情况反馈",
    weekLabel: weekLabel.trim() || "本周",
    dateRange,
    dates,
    classes,
    warnings: Array.from(new Set(warnings)),
    createdAt: new Date().toISOString()
  };
}
