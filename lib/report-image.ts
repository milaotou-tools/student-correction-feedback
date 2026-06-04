import { promises as fs } from "fs";
import path from "path";
import serverlessChromium from "@sparticuz/chromium";
import { chromium as playwrightChromium, type Browser } from "playwright";
import { getClassImageFileName, saveReportImage } from "./storage";
import { getAttentionStyle, getStatusStyle } from "./status";
import type { ClassReport, ReportData, Status } from "./types";

const REPORT_WIDTH = 1600;
const PADDING_X = 36;
const TABLE_WIDTH = REPORT_WIDTH - PADDING_X * 2;
const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 44;
const FOOTER_GAP = 14;
const FOOTER_HEIGHT = 68;
const ID_WIDTH = 118;
const NAME_WIDTH = 170;
const ATTENTION_WIDTH = 190;
const TOP_SPACE = 150;
const BOTTOM_SPACE = 34;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function getFontCss(): Promise<string> {
  const fontRoot = path.join(process.cwd(), "node_modules", "@fontsource", "noto-sans-sc");
  const fonts = [
    { weight: 400, file: "noto-sans-sc-chinese-simplified-400-normal.woff2" },
    { weight: 700, file: "noto-sans-sc-chinese-simplified-700-normal.woff2" }
  ];
  const faces = await Promise.all(
    fonts.map(async ({ weight, file }) => {
      const font = await fs.readFile(path.join(fontRoot, "files", file));
      return `@font-face {
        font-family: "Noto Sans SC";
        font-style: normal;
        font-display: block;
        font-weight: ${weight};
        src: url("data:font/woff2;base64,${font.toString("base64")}") format("woff2");
      }`;
    })
  );

  return faces.join("\n");
}

function getDateWidth(reportData: ReportData): number {
  return (TABLE_WIDTH - ID_WIDTH - NAME_WIDTH - ATTENTION_WIDTH) / reportData.dates.length;
}

function statusCell(status: Status): string {
  const style = getStatusStyle(status);
  return `<div class="cell" style="height:${ROW_HEIGHT}px;background:${style.background};color:${style.color};font-weight:${style.fontWeight ?? 600};">${escapeHtml(status)}</div>`;
}

function attentionCell(level: ClassReport["students"][number]["attentionLevel"]): string {
  const style = getAttentionStyle(level);
  return `<div class="cell attention-cell" style="height:${ROW_HEIGHT}px;background:#F3F6FA;">
    <span class="attention-badge" style="background:${style.background};color:${style.color};border-color:${style.border ?? "#C8C8C8"};font-weight:${style.fontWeight ?? 700};">${escapeHtml(level)}</span>
  </div>`;
}

function headerCell(label: string): string {
  return `<div class="cell header-cell" style="height:${HEADER_HEIGHT}px;">${escapeHtml(label)}</div>`;
}

function renderFeedbackHtml(reportData: ReportData, classReport: ClassReport, fontCss: string): { html: string; height: number } {
  const dateWidth = getDateWidth(reportData);
  const tableHeight = HEADER_HEIGHT + classReport.students.length * ROW_HEIGHT;
  const footerY = TOP_SPACE + tableHeight + FOOTER_GAP;
  const height = footerY + FOOTER_HEIGHT + BOTTOM_SPACE;
  const columnWidths = [ID_WIDTH, NAME_WIDTH, ATTENTION_WIDTH, ...reportData.dates.map(() => dateWidth)];
  const gridColumns = columnWidths.map((width) => `${width}px`).join(" ");
  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);

  const header = [
    headerCell("学号"),
    headerCell("姓名"),
    headerCell("关注等级"),
    ...reportData.dates.map((date) => headerCell(date))
  ].join("");

  const rows = classReport.students
    .map((student) =>
      [
        `<div class="cell base-cell" style="height:${ROW_HEIGHT}px;font-weight:700;">${escapeHtml(student.studentId)}</div>`,
        `<div class="cell base-cell" style="height:${ROW_HEIGHT}px;font-weight:700;">${escapeHtml(student.name)}</div>`,
        attentionCell(student.attentionLevel),
        ...reportData.dates.map((date) => statusCell(student.statuses[date] ?? ""))
      ].join("")
    )
    .join("");

  const footerText =
    "说明：“满分”表示当天完成质量较好；“已订正”表示已完成错题订正；“已交”表示已提交但仍需确认订正情况；“未交”表示需要尽快补齐。";

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <style>
    ${fontCss}
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #F7F9FC; }
    body {
      font-family: "Noto Sans SC", "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
      color: #1f2937;
    }
    #feedback-image {
      width: ${REPORT_WIDTH}px;
      min-height: ${height}px;
      background: #F7F9FC;
      padding: 0 ${PADDING_X}px ${BOTTOM_SPACE}px;
      overflow: hidden;
    }
    .title {
      margin: 0;
      padding-top: 38px;
      text-align: center;
      font-size: 34px;
      line-height: 44px;
      font-weight: 700;
      color: #203040;
    }
    .subtitle {
      margin-top: 8px;
      text-align: center;
      font-size: 19px;
      line-height: 26px;
      color: #52616f;
    }
    .table {
      display: grid;
      grid-template-columns: ${gridColumns};
      width: ${tableWidth}px;
      margin-top: 36px;
      border-top: 1px solid #D0D7DE;
      border-left: 1px solid #D0D7DE;
    }
    .cell {
      display: flex;
      align-items: center;
      justify-content: center;
      border-right: 1px solid #D0D7DE;
      border-bottom: 1px solid #D0D7DE;
      min-width: 0;
      text-align: center;
      font-size: 17px;
      line-height: 22px;
      white-space: nowrap;
      overflow: hidden;
    }
    .header-cell {
      background: #D9EAF7;
      color: #213547;
      font-weight: 700;
    }
    .base-cell {
      background: #F3F6FA;
    }
    .attention-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 96px;
      height: 28px;
      border: 1px solid;
      border-radius: 999px;
      font-size: 15px;
      line-height: 20px;
    }
    .footer {
      width: ${TABLE_WIDTH}px;
      height: ${FOOTER_HEIGHT}px;
      margin-top: ${FOOTER_GAP}px;
      display: flex;
      align-items: center;
      border: 1px solid #D0D7DE;
      background: #FFFFFF;
      padding: 0 16px;
      font-size: 16px;
      line-height: 24px;
      color: #4b5563;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div id="feedback-image">
    <h1 class="title">${escapeHtml(`${classReport.className}学生一周订正情况反馈`)}</h1>
    <div class="subtitle">${escapeHtml(`${reportData.weekLabel}计算练习订正情况｜日期范围：${reportData.dateRange}`)}</div>
    <div class="table">${header}${rows}</div>
    <div class="footer">${escapeHtml(footerText)}</div>
  </div>
</body>
</html>`;

  return { html, height };
}

async function launchBrowser(): Promise<Browser> {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  return playwrightChromium.launch({
    args: isServerless ? serverlessChromium.args : [],
    executablePath: isServerless ? await serverlessChromium.executablePath() : undefined,
    headless: true
  });
}

export async function renderFeedbackPngBuffer(reportData: ReportData, classReport: ClassReport, browser?: Browser): Promise<Buffer> {
  const fontCss = await getFontCss();
  const { html, height } = renderFeedbackHtml(reportData, classReport, fontCss);
  const ownsBrowser = !browser;
  const activeBrowser = browser ?? (await launchBrowser());
  const page = await activeBrowser.newPage({
    viewport: { width: REPORT_WIDTH, height },
    deviceScaleFactor: 1
  });

  try {
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const element = await page.$("#feedback-image");
    if (!element) {
      throw new Error("Feedback image root not found");
    }
    return Buffer.from(await element.screenshot({ type: "png" }));
  } finally {
    await page.close().catch(() => undefined);
    if (ownsBrowser) {
      await activeBrowser.close().catch(() => undefined);
    }
  }
}

export async function generateFeedbackPng(reportData: ReportData, classReport: ClassReport, index: number, browser?: Browser): Promise<void> {
  const fileName = getClassImageFileName(classReport.className, index);
  const png = await renderFeedbackPngBuffer(reportData, classReport, browser);
  await saveReportImage(reportData.reportId, fileName, png);
}

export async function generateAllFeedbackPngs(reportData: ReportData): Promise<void> {
  const browser = await launchBrowser();
  try {
    for (let index = 0; index < reportData.classes.length; index += 1) {
      await generateFeedbackPng(reportData, reportData.classes[index], index, browser);
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
}
