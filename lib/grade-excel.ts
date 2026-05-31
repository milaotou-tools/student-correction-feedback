import * as XLSX from "xlsx";
import { analyzeGradeClass, isMajorExamLabel, parseScore, summarizeGradeReports } from "./grade-analysis";
import type { GradeClassReport, GradeReportData, ScoreColumn } from "./grade-types";

type HeaderInfo = {
  rowIndex: number;
  studentIdIndex: number;
  nameIndex: number;
  scoreColumns: ScoreColumn[];
};

function cleanCell(value: unknown): string {
  return String(value ?? "").trim();
}

function generateGradeReportId(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const suffix = Math.random().toString(36).slice(2, 6);
  return `grade-${stamp}-${suffix}`;
}

function findHeader(rows: string[][]): HeaderInfo | null {
  const searchLimit = Math.min(rows.length, 10);

  for (let rowIndex = 0; rowIndex < searchLimit; rowIndex += 1) {
    const row = rows[rowIndex];
    const studentIdIndex = row.findIndex((cell) => cell.includes("学号"));
    const nameIndex = row.findIndex((cell) => cell.includes("姓名"));

    if (studentIdIndex < 0 || nameIndex < 0) continue;

    const scoreColumns = row
      .map((cell, index) => ({ cell, index }))
      .filter(({ cell, index }) => index > nameIndex && cell !== "")
      .map(({ cell, index }) => ({
        label: cell,
        index,
        isMajorExam: isMajorExamLabel(cell)
      }));

    if (scoreColumns.length > 0) {
      return { rowIndex, studentIdIndex, nameIndex, scoreColumns };
    }
  }

  return null;
}

export async function parseGradeExcel(buffer: Buffer): Promise<GradeReportData> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const classes: GradeClassReport[] = [];
  const warnings: string[] = [];

  for (const sheetName of workbook.SheetNames) {
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
      warnings.push(`${sheetName} 未找到包含“学号、姓名、成绩列”的表头，已跳过。`);
      continue;
    }

    const studentWarnings: string[] = [];
    const rawStudents = rows.slice(header.rowIndex + 1).flatMap((row) => {
      const studentId = cleanCell(row[header.studentIdIndex]);
      const name = cleanCell(row[header.nameIndex]);
      if (!studentId && !name) return [];
      if (!name) return [];

      const scores = Object.fromEntries(
        header.scoreColumns.map((column) => {
          const rawValue = row[column.index];
          const score = parseScore(rawValue);
          if (cleanCell(rawValue) !== "" && score === null) {
            studentWarnings.push(`${sheetName} ${name} ${column.label} 不是有效数字，已按无成绩处理。`);
          }
          return [column.label, score];
        })
      );

      return [{ studentId, name, scores }];
    });

    if (rawStudents.length === 0) {
      warnings.push(`${sheetName} 未识别到学生成绩，已跳过。`);
      continue;
    }

    const classReport = analyzeGradeClass(sheetName.trim(), header.scoreColumns, rawStudents);
    classes.push({
      ...classReport,
      warnings: [...classReport.warnings, ...studentWarnings]
    });
  }

  if (classes.length === 0) {
    throw new Error("未识别到成绩数据。请确认工作表表头包含“学号”“姓名”，且姓名右侧为成绩列。");
  }

  const allWarnings = Array.from(new Set([...warnings, ...classes.flatMap((classReport) => classReport.warnings)]));

  return {
    gradeReportId: generateGradeReportId(),
    title: "学生成绩分析",
    classes,
    summary: summarizeGradeReports(classes),
    warnings: allWarnings,
    createdAt: new Date().toISOString()
  };
}
