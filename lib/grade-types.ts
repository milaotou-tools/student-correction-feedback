export type ScoreBand = "优秀" | "良好" | "一般" | "加油" | "后进" | "无成绩";

export type ScoreColumn = {
  label: string;
  index: number;
  isMajorExam: boolean;
};

export type ScoreBandSummary = {
  band: Exclude<ScoreBand, "无成绩">;
  count: number;
  percent: number;
};

export type GradeStudentRecord = {
  className: string;
  studentId: string;
  name: string;
  scores: Record<string, number | null>;
  currentScore: number | null;
  baselineScore: number | null;
  currentRank: number | null;
  baselineRank: number | null;
  rankChange: number | null;
  scoreChange: number | null;
  scoreBand: ScoreBand;
  rewardReasons: string[];
  attentionReasons: string[];
  parentMessage: string;
};

export type GradeClassReport = {
  className: string;
  scoreColumns: ScoreColumn[];
  currentExamLabel: string;
  baselineMajorExamLabel: string | null;
  baselineProcessExamLabel: string | null;
  baselineDescription: string;
  students: GradeStudentRecord[];
  bandSummary: ScoreBandSummary[];
  studentCount: number;
  validCurrentScoreCount: number;
  averageScore: number | null;
  excellentCount: number;
  lowScoreCount: number;
  improvedStudents: GradeStudentRecord[];
  declinedStudents: GradeStudentRecord[];
  rewardStudents: GradeStudentRecord[];
  parentMessageStudents: GradeStudentRecord[];
  warnings: string[];
};

export type GradeReportSummary = {
  totalStudents: number;
  validCurrentScoreCount: number;
  averageScore: number | null;
  excellentCount: number;
  lowScoreCount: number;
  rewardCount: number;
  parentMessageCount: number;
};

export type GradeReportData = {
  gradeReportId: string;
  title: "学生成绩分析";
  classes: GradeClassReport[];
  summary: GradeReportSummary;
  warnings: string[];
  createdAt: string;
};
