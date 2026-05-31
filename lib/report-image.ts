import { getClassImageFileName, saveReportImage } from "./storage";
import { getAttentionStyle, getStatusStyle } from "./status";
import type { ClassReport, ReportData, Status } from "./types";

const REPORT_WIDTH = 1600;
const PADDING_X = 36;
const TABLE_X = 36;
const TABLE_Y = 150;
const TABLE_WIDTH = REPORT_WIDTH - PADDING_X * 2;
const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 44;
const FOOTER_GAP = 14;
const FOOTER_HEIGHT = 68;
const ID_WIDTH = 118;
const NAME_WIDTH = 170;
const ATTENTION_WIDTH = 190;
const FONT_FAMILY = "Noto Sans SC, Microsoft YaHei, PingFang SC, Arial, sans-serif";

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function text(x: number, y: number, value: unknown, options: { size: number; weight?: number; fill?: string; anchor?: string }):
string {
  const weight = options.weight ?? 400;
  const fill = options.fill ?? "#1f2937";
  const anchor = options.anchor ?? "middle";
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${FONT_FAMILY}" font-size="${options.size}" font-weight="${weight}" fill="${fill}">${escapeXml(value)}</text>`;
}

function rect(x: number, y: number, width: number, height: number, fill: string, stroke = "#D0D7DE", rx = 0): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="1"${rx ? ` rx="${rx}" ry="${rx}"` : ""}/>`;
}

function renderStatusCell(status: Status, x: number, y: number, width: number): string {
  const style = getStatusStyle(status);
  return [
    rect(x, y, width, ROW_HEIGHT, style.background),
    text(x + width / 2, y + 28, status, {
      size: 17,
      weight: style.fontWeight ?? 600,
      fill: style.color
    })
  ].join("");
}

function renderAttentionBadge(level: ClassReport["students"][number]["attentionLevel"], x: number, y: number): string {
  const style = getAttentionStyle(level);
  const badgeWidth = 96;
  const badgeHeight = 28;
  const badgeX = x + (ATTENTION_WIDTH - badgeWidth) / 2;
  const badgeY = y + (ROW_HEIGHT - badgeHeight) / 2;

  return [
    rect(badgeX, badgeY, badgeWidth, badgeHeight, style.background, style.border ?? "#C8C8C8", 14),
    text(badgeX + badgeWidth / 2, badgeY + 20, level, {
      size: 15,
      weight: style.fontWeight ?? 700,
      fill: style.color
    })
  ].join("");
}

function renderHeaderCell(label: string, x: number, y: number, width: number): string {
  return [
    rect(x, y, width, HEADER_HEIGHT, "#D9EAF7"),
    text(x + width / 2, y + 29, label, { size: 17, weight: 800, fill: "#213547" })
  ].join("");
}

export function renderFeedbackSvg(reportData: ReportData, classReport: ClassReport): string {
  const dateWidth = (TABLE_WIDTH - ID_WIDTH - NAME_WIDTH - ATTENTION_WIDTH) / reportData.dates.length;
  const tableHeight = HEADER_HEIGHT + classReport.students.length * ROW_HEIGHT;
  const footerY = TABLE_Y + tableHeight + FOOTER_GAP;
  const reportHeight = footerY + FOOTER_HEIGHT + 34;
  const titleCenterX = REPORT_WIDTH / 2;
  const footerText = "说明：“满分”表示当天完成质量较好；“已订正”表示已完成错题订正；“已交”表示已提交但仍需确认订正情况；“未交”表示需要尽快补齐。";

  const header = [
    renderHeaderCell("学号", TABLE_X, TABLE_Y, ID_WIDTH),
    renderHeaderCell("姓名", TABLE_X + ID_WIDTH, TABLE_Y, NAME_WIDTH),
    renderHeaderCell("关注等级", TABLE_X + ID_WIDTH + NAME_WIDTH, TABLE_Y, ATTENTION_WIDTH),
    ...reportData.dates.map((date, index) =>
      renderHeaderCell(date, TABLE_X + ID_WIDTH + NAME_WIDTH + ATTENTION_WIDTH + dateWidth * index, TABLE_Y, dateWidth)
    )
  ].join("");

  const rows = classReport.students
    .map((student, index) => {
      const rowY = TABLE_Y + HEADER_HEIGHT + ROW_HEIGHT * index;
      const statusStartX = TABLE_X + ID_WIDTH + NAME_WIDTH + ATTENTION_WIDTH;
      return [
        rect(TABLE_X, rowY, ID_WIDTH, ROW_HEIGHT, "#F3F6FA"),
        text(TABLE_X + ID_WIDTH / 2, rowY + 28, student.studentId, { size: 17, weight: 600 }),
        rect(TABLE_X + ID_WIDTH, rowY, NAME_WIDTH, ROW_HEIGHT, "#F3F6FA"),
        text(TABLE_X + ID_WIDTH + NAME_WIDTH / 2, rowY + 28, student.name, { size: 17, weight: 600 }),
        rect(TABLE_X + ID_WIDTH + NAME_WIDTH, rowY, ATTENTION_WIDTH, ROW_HEIGHT, "#F3F6FA"),
        renderAttentionBadge(student.attentionLevel, TABLE_X + ID_WIDTH + NAME_WIDTH, rowY),
        ...reportData.dates.map((date, dateIndex) =>
          renderStatusCell(student.statuses[date] ?? "", statusStartX + dateWidth * dateIndex, rowY, dateWidth)
        )
      ].join("");
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${REPORT_WIDTH}" height="${reportHeight}" viewBox="0 0 ${REPORT_WIDTH} ${reportHeight}">
  <rect width="100%" height="100%" fill="#F7F9FC"/>
  ${text(titleCenterX, 64, `${classReport.className}学生一周订正情况反馈`, { size: 34, weight: 800, fill: "#203040" })}
  ${text(titleCenterX, 104, `${reportData.weekLabel}计算练习订正情况 | 日期范围：${reportData.dateRange}`, { size: 19, fill: "#52616f" })}
  ${header}
  ${rows}
  ${rect(TABLE_X, footerY, TABLE_WIDTH, FOOTER_HEIGHT, "#FFFFFF")}
  ${text(TABLE_X + 16, footerY + 38, footerText, { size: 16, fill: "#4b5563", anchor: "start" })}
</svg>`;
}

export async function generateFeedbackPng(reportData: ReportData, classReport: ClassReport, index: number): Promise<void> {
  const fileName = getClassImageFileName(classReport.className, index);
  await saveReportImage(reportData.reportId, fileName, Buffer.from(renderFeedbackSvg(reportData, classReport), "utf8"));
}

export async function generateAllFeedbackPngs(reportData: ReportData): Promise<void> {
  for (let index = 0; index < reportData.classes.length; index += 1) {
    await generateFeedbackPng(reportData, reportData.classes[index], index);
  }
}
