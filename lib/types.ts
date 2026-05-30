export type StandardStatus = "满分" | "已订正" | "已交" | "未交";
export type Status = StandardStatus | string;

export type AttentionLevel = "重点关注" | "待确认" | "需要巩固" | "稳定完成" | "优秀保持";

export type StudentRecord = {
  className: string;
  studentId: string;
  name: string;
  statuses: Record<string, Status>;
  attentionLevel: AttentionLevel;
};

export type ClassReport = {
  className: string;
  students: StudentRecord[];
};

export type ReportData = {
  reportId: string;
  title: "学生一周订正情况反馈";
  weekLabel: string;
  dateRange: string;
  dates: string[];
  classes: ClassReport[];
  warnings: string[];
  createdAt: string;
};

export type FollowUpStudent = {
  className: string;
  studentId: string;
  name: string;
  missingDates: string[];
  reminder: string;
};
