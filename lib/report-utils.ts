import type { FollowUpStudent, ReportData } from "./types";
import { generateReminder, getMissingDates } from "./status";

export function generateReportId(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${stamp}-${suffix}`;
}

export function getFollowUpStudents(reportData: ReportData): FollowUpStudent[] {
  return reportData.classes.flatMap((classReport) =>
    classReport.students
      .filter((student) => student.attentionLevel === "重点关注")
      .map((student) => ({
        className: classReport.className,
        studentId: student.studentId,
        name: student.name,
        missingDates: getMissingDates(student),
        reminder: generateReminder(student)
      }))
  );
}

export function getGroupMessage(): string {
  return "各位家长好，本周计算练习订正情况已整理，见下图。请重点关注孩子是否有“未交”或“待确认”的记录，帮助孩子及时补齐并完成订正。谢谢配合。";
}
