import type { AttentionLevel, StandardStatus, Status, StudentRecord } from "./types";

export const STANDARD_STATUSES: StandardStatus[] = ["满分", "已订正", "已交", "未交"];

export type CellStyle = {
  background: string;
  color: string;
  border?: string;
  fontWeight?: number;
};

export function normalizeStatus(value: unknown): Status {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const compact = raw.replace(/\s+/g, "");

  if (compact === "满分") return "满分";
  if (compact === "已订正" || compact === "已订" || compact === "订正") return "已订正";
  if (compact === "已交" || compact === "提交" || compact === "已提交") return "已交";
  if (compact === "未交" || compact === "未完成" || compact === "未交作业") return "未交";

  return raw;
}

export function getAttentionLevel(statuses: Status[]): AttentionLevel {
  if (statuses.includes("未交")) return "重点关注";
  if (statuses.includes("已交")) return "待确认";

  const fullScoreCount = statuses.filter((status) => status === "满分").length;

  if (fullScoreCount >= 4) return "优秀保持";
  if (fullScoreCount >= 2) return "稳定完成";
  return "需要巩固";
}

export function getStatusStyle(status: Status): CellStyle {
  switch (status) {
    case "满分":
      return { background: "#E8F1D4", color: "#3F5F2A" };
    case "已订正":
      return { background: "#DCE6F2", color: "#2F4F68" };
    case "已交":
      return { background: "#FFF2CC", color: "#7A5C00" };
    case "未交":
      return { background: "#F4D6D6", color: "#9C0006", fontWeight: 700 };
    default:
      return { background: "#F3F6FA", color: "#374151" };
  }
}

export function getAttentionStyle(level: AttentionLevel): CellStyle {
  switch (level) {
    case "重点关注":
      return { background: "#FCE4D6", color: "#9C0006", border: "#F4B183", fontWeight: 700 };
    case "待确认":
      return { background: "#FFF2CC", color: "#7A5C00", border: "#E3C15B", fontWeight: 700 };
    case "需要巩固":
      return { background: "#EDEDED", color: "#555555", border: "#C8C8C8", fontWeight: 700 };
    case "稳定完成":
      return { background: "#DDEBF7", color: "#2F4F68", border: "#9DC3E6", fontWeight: 700 };
    case "优秀保持":
      return { background: "#E2F0D9", color: "#3F5F2A", border: "#A9D18E", fontWeight: 700 };
  }
}

export function getMissingDates(student: StudentRecord): string[] {
  return Object.entries(student.statuses)
    .filter(([, status]) => status === "未交")
    .map(([date]) => date);
}

export function generateReminder(student: StudentRecord): string {
  const missingDates = getMissingDates(student);
  const dateText = missingDates.join("、");
  const count = missingDates.length;

  if (count <= 1) {
    return "家长您好，孩子本周出现1次“未交”。请您提醒孩子尽快补齐并完成订正，带到学校后我会继续关注。";
  }

  return `家长您好，孩子本周出现${count}次“未交”。请您重点提醒孩子尽快补齐并完成订正，也请帮助孩子检查作业落实情况，我会继续关注。`;
}
