import { existsSync } from "fs";
import { ensurePublicReportDir, getClassImagePath } from "./storage";
import { getAttentionStyle, getStatusStyle } from "./status";
import type { ClassReport, ReportData, Status } from "./types";

const WINDOWS_BROWSER_CANDIDATES = [
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
];

function getBrowserExecutablePath(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE && existsSync(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE)) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  }

  return WINDOWS_BROWSER_CANDIDATES.find((candidate) => existsSync(candidate));
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function styleText(style: Record<string, string | number | undefined>): string {
  return Object.entries(style)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
}

function renderAttentionBadge(level: ClassReport["students"][number]["attentionLevel"]): string {
  const style = getAttentionStyle(level);
  return `<span class="attention-badge" style="${styleText({
    "background-color": style.background,
    color: style.color,
    border: `2px solid ${style.border}`,
    "font-weight": style.fontWeight
  })}">${escapeHtml(level)}</span>`;
}

function renderStatusCell(status: Status): string {
  const style = getStatusStyle(status);
  return `<td class="status-cell" style="${styleText({
    "background-color": style.background,
    color: style.color,
    "font-weight": style.fontWeight
  })}">${escapeHtml(status)}</td>`;
}

export function renderFeedbackHtml(reportData: ReportData, classReport: ClassReport): string {
  const rows = classReport.students
    .map(
      (student) => `<tr>
        <td class="id-cell">${escapeHtml(student.studentId)}</td>
        <td class="name-cell">${escapeHtml(student.name)}</td>
        <td class="attention-cell">${renderAttentionBadge(student.attentionLevel)}</td>
        ${reportData.dates.map((date) => renderStatusCell(student.statuses[date] ?? "")).join("")}
      </tr>`
    )
    .join("");

  return `<!doctype html>
  <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #F7F9FC;
          color: #1f2937;
          font-family: Arial, "Microsoft YaHei", "PingFang SC", sans-serif;
        }
        #report-root {
          width: 1600px;
          padding: 28px 36px 34px;
          background: #F7F9FC;
        }
        .title {
          text-align: center;
          color: #203040;
          margin-bottom: 14px;
        }
        .title h1 {
          margin: 0 0 8px;
          font-size: 34px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: 0;
        }
        .subtitle {
          font-size: 19px;
          color: #52616f;
          line-height: 1.4;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          background: #fff;
          border: 1px solid #D0D7DE;
        }
        col.id { width: 118px; }
        col.name { width: 170px; }
        col.attention { width: 190px; }
        col.date { width: auto; }
        th, td {
          border: 1px solid #D0D7DE;
          height: 44px;
          padding: 6px 9px;
          font-size: 17px;
          line-height: 1.25;
          text-align: center;
          vertical-align: middle;
          overflow: hidden;
          white-space: nowrap;
        }
        th {
          background: #D9EAF7;
          color: #213547;
          font-weight: 800;
        }
        .id-cell, .name-cell {
          background: #F3F6FA;
          font-weight: 600;
        }
        .attention-cell {
          background: #fff;
          padding: 4px 8px;
        }
        .attention-badge {
          display: inline-flex;
          min-width: 96px;
          height: 28px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0 14px;
          font-size: 15px;
          line-height: 1;
        }
        .status-cell {
          font-weight: 600;
        }
        .footer {
          margin-top: 14px;
          border: 1px solid #D0D7DE;
          background: #FFFFFF;
          padding: 12px 16px;
          color: #4b5563;
          font-size: 16px;
          line-height: 1.7;
        }
      </style>
    </head>
    <body>
      <main id="report-root">
        <section class="title">
          <h1>${escapeHtml(classReport.className)}学生一周订正情况反馈</h1>
          <div class="subtitle">${escapeHtml(reportData.weekLabel)}计算练习订正情况｜日期范围：${escapeHtml(reportData.dateRange)}</div>
        </section>
        <table>
          <colgroup>
            <col class="id" />
            <col class="name" />
            <col class="attention" />
            ${reportData.dates.map(() => '<col class="date" />').join("")}
          </colgroup>
          <thead>
            <tr>
              <th>学号</th>
              <th>姓名</th>
              <th>关注等级</th>
              ${reportData.dates.map((date) => `<th>${escapeHtml(date)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <footer class="footer">
          说明：“满分”表示当天完成质量较好；“已订正”表示已完成错题订正；“已交”表示已提交但仍需确认订正情况；“未交”表示需要尽快补齐。
        </footer>
      </main>
    </body>
  </html>`;
}

export async function generateFeedbackPng(reportData: ReportData, classReport: ClassReport, index: number): Promise<void> {
  await ensurePublicReportDir(reportData.reportId);
  const imagePath = getClassImagePath(reportData.reportId, classReport.className, index);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    executablePath: getBrowserExecutablePath()
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1200 },
      deviceScaleFactor: 2
    });
    await page.setContent(renderFeedbackHtml(reportData, classReport), { waitUntil: "networkidle" });
    await page.locator("#report-root").screenshot({ path: imagePath });
  } finally {
    await browser.close();
  }
}

export async function generateAllFeedbackPngs(reportData: ReportData): Promise<void> {
  for (let index = 0; index < reportData.classes.length; index += 1) {
    await generateFeedbackPng(reportData, reportData.classes[index], index);
  }
}
