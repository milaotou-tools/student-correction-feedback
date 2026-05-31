import type {
  GradeClassReport,
  GradeReportData,
  GradeReportSummary,
  GradeStudentRecord,
  ScoreBand,
  ScoreBandSummary,
  ScoreColumn
} from "./grade-types";
import { needsParentCommunication } from "./grade-parent-messages";
import { isExcellentButDeclined } from "./grade-rewards";

const SCORE_BANDS: Exclude<ScoreBand, "无成绩">[] = ["优秀", "良好", "一般", "加油", "后进"];

export function isMajorExamLabel(label: string): boolean {
  return label.includes("期中") || label.includes("期末");
}

export function parseScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/[，,]/g, "");
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const score = Number(normalized);
  return Number.isFinite(score) ? score : null;
}

export function getScoreBand(score: number | null): ScoreBand {
  if (score === null) return "无成绩";
  if (score >= 85) return "优秀";
  if (score >= 75) return "良好";
  if (score >= 60) return "一般";
  if (score >= 50) return "加油";
  return "后进";
}

export function calculateCompetitionRanks(items: { key: string; score: number | null }[]): Map<string, number> {
  const sorted = items
    .filter((item): item is { key: string; score: number } => item.score !== null)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key, "zh-CN"));

  const ranks = new Map<string, number>();
  let lastScore: number | null = null;
  let lastRank = 0;

  sorted.forEach((item, index) => {
    const rank = lastScore === item.score ? lastRank : index + 1;
    ranks.set(item.key, rank);
    lastScore = item.score;
    lastRank = rank;
  });

  return ranks;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function getBandSummary(students: GradeStudentRecord[]): ScoreBandSummary[] {
  const validCount = students.filter((student) => student.currentScore !== null).length;
  return SCORE_BANDS.map((band) => {
    const count = students.filter((student) => student.scoreBand === band).length;
    return {
      band,
      count,
      percent: validCount > 0 ? Math.round((count / validCount) * 1000) / 10 : 0
    };
  });
}

function buildRewardReasons(student: Pick<GradeStudentRecord, "currentScore" | "rankChange" | "scoreChange">): string[] {
  const reasons: string[] = [];
  if (student.currentScore !== null && student.currentScore >= 85 && !isExcellentButDeclined(student)) reasons.push("优秀");
  if (student.rankChange !== null && student.rankChange >= 5) reasons.push("进步");
  if (student.scoreChange !== null && student.scoreChange >= 10) reasons.push("努力");
  return reasons;
}

function buildAttentionReasons(student: Pick<GradeStudentRecord, "currentScore" | "rankChange">): string[] {
  const reasons: string[] = [];
  if (student.currentScore !== null && student.currentScore < 60) reasons.push("低分关注");
  if (student.rankChange !== null && student.rankChange <= -5) reasons.push("明显退步");
  if (
    student.currentScore !== null &&
    student.currentScore >= 60 &&
    student.currentScore < 75 &&
    student.rankChange !== null &&
    student.rankChange <= -3
  ) {
    reasons.push("边缘下滑");
  }
  return reasons;
}

function formatChange(value: number | null, suffix: string): string {
  if (value === null) return "暂无可比数据";
  if (value > 0) return `提升${roundOne(value)}${suffix}`;
  if (value < 0) return `下降${roundOne(Math.abs(value))}${suffix}`;
  return `持平`;
}

export function buildParentMessage(student: Pick<
  GradeStudentRecord,
  "name" | "currentScore" | "baselineScore" | "rankChange" | "scoreChange" | "attentionReasons"
>): string {
  if (student.attentionReasons.length === 0) return "";

  const scoreText = student.currentScore === null ? "本次成绩暂无有效记录" : `本次成绩为${roundOne(student.currentScore)}分`;
  const baselineText = student.baselineScore === null ? "" : `，和前期基准相比${formatChange(student.scoreChange, "分")}`;
  const rankText = student.rankChange === null ? "" : `，班内排名${formatChange(student.rankChange, "名")}`;
  const intro = `家长您好，${student.name}${scoreText}${baselineText}${rankText}。`;

  if (student.attentionReasons.includes("低分关注") && student.attentionReasons.includes("明显退步")) {
    return `${intro}这次既有基础分偏低，也有排名下滑的情况。建议这两天先帮助孩子把试卷中的基础题和失分较多的题型重新整理一遍，我也会在课堂和订正中继续重点关注。`;
  }

  if (student.attentionReasons.includes("低分关注")) {
    return `${intro}目前基础掌握还不够稳。建议家里先不追求刷很多题，重点把错题原因说清楚、把基础计算和典型题补牢，我会继续跟进孩子的订正情况。`;
  }

  if (student.attentionReasons.includes("明显退步")) {
    return `${intro}这次相比前期状态有比较明显的回落。建议和孩子一起复盘近期听课、作业和订正是否落实，先找出退步原因，再把薄弱题型补回来。`;
  }

  return `${intro}孩子处在容易波动的分数段，这次排名也有下滑。建议近期多关注作业订正质量和基础题稳定性，帮助孩子把会做的题稳稳拿住。`;
}

function getAverage(students: GradeStudentRecord[]): number | null {
  const scores = students
    .map((student) => student.currentScore)
    .filter((score): score is number => score !== null);
  if (scores.length === 0) return null;
  return roundOne(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

export type RawGradeStudent = {
  studentId: string;
  name: string;
  scores: Record<string, number | null>;
};

export function analyzeGradeClass(className: string, scoreColumns: ScoreColumn[], rawStudents: RawGradeStudent[]): GradeClassReport {
  const warnings: string[] = [];
  const currentColumn = scoreColumns.at(-1);

  if (!currentColumn) {
    throw new Error(`${className} 未找到成绩列。`);
  }

  const previousColumns = scoreColumns.slice(0, -1);
  const baselineMajorColumn = [...previousColumns].reverse().find((column) => column.isMajorExam) ?? null;
  const baselineProcessColumn = [...previousColumns].reverse().find((column) => !column.isMajorExam) ?? null;

  if (!baselineMajorColumn) {
    warnings.push(`${className} 未找到本次之前的期中/期末成绩，进退步和奖励中的排名变化暂不计算。`);
  }

  const baseStudents = rawStudents.map((student) => {
    const currentScore = student.scores[currentColumn.label] ?? null;
    const majorScore = baselineMajorColumn ? student.scores[baselineMajorColumn.label] ?? null : null;
    const processScore = baselineProcessColumn ? student.scores[baselineProcessColumn.label] ?? null : null;
    const baselineScore = majorScore === null
      ? null
      : processScore === null
        ? majorScore
        : roundOne(majorScore * 0.5 + processScore * 0.5);

    return {
      className,
      studentId: student.studentId,
      name: student.name,
      scores: student.scores,
      currentScore,
      baselineScore,
      currentRank: null,
      baselineRank: null,
      rankChange: null,
      scoreChange: baselineScore === null || currentScore === null ? null : roundOne(currentScore - baselineScore),
      scoreBand: getScoreBand(currentScore),
      rewardReasons: [],
      attentionReasons: [],
      parentMessage: ""
    } satisfies GradeStudentRecord;
  });

  const currentRanks = calculateCompetitionRanks(
    baseStudents.map((student) => ({ key: `${student.studentId}-${student.name}`, score: student.currentScore }))
  );
  const baselineRanks = calculateCompetitionRanks(
    baseStudents.map((student) => ({ key: `${student.studentId}-${student.name}`, score: student.baselineScore }))
  );

  const students = baseStudents.map((student) => {
    const key = `${student.studentId}-${student.name}`;
    const currentRank = currentRanks.get(key) ?? null;
    const baselineRank = baselineRanks.get(key) ?? null;
    const rankChange = currentRank === null || baselineRank === null ? null : baselineRank - currentRank;
    const withRanks: GradeStudentRecord = {
      ...student,
      currentRank,
      baselineRank,
      rankChange
    };
    const rewardReasons = buildRewardReasons(withRanks);
    const attentionReasons = buildAttentionReasons(withRanks);
    const withReasons = {
      ...withRanks,
      rewardReasons,
      attentionReasons
    };
    return {
      ...withReasons,
      parentMessage: buildParentMessage(withReasons)
    };
  });

  const validCurrentScoreCount = students.filter((student) => student.currentScore !== null).length;
  const baselineDescription = baselineMajorColumn
    ? baselineProcessColumn
      ? `${baselineMajorColumn.label} 50% + ${baselineProcessColumn.label} 50%`
      : baselineMajorColumn.label
    : "暂无可用大考基准";

  return {
    className,
    scoreColumns,
    currentExamLabel: currentColumn.label,
    baselineMajorExamLabel: baselineMajorColumn?.label ?? null,
    baselineProcessExamLabel: baselineProcessColumn?.label ?? null,
    baselineDescription,
    students,
    bandSummary: getBandSummary(students),
    studentCount: students.length,
    validCurrentScoreCount,
    averageScore: getAverage(students),
    excellentCount: students.filter((student) => student.scoreBand === "优秀").length,
    lowScoreCount: students.filter((student) => student.currentScore !== null && student.currentScore < 60).length,
    improvedStudents: students
      .filter((student) => student.rankChange !== null && student.rankChange >= 5)
      .sort((a, b) => (b.rankChange ?? 0) - (a.rankChange ?? 0)),
    declinedStudents: students
      .filter((student) => student.rankChange !== null && student.rankChange <= -5)
      .sort((a, b) => (a.rankChange ?? 0) - (b.rankChange ?? 0)),
    rewardStudents: students.filter((student) => student.rewardReasons.length > 0),
    parentMessageStudents: students.filter(needsParentCommunication),
    warnings
  };
}

export function summarizeGradeReports(classes: GradeClassReport[]): GradeReportSummary {
  const allStudents = classes.flatMap((classReport) => classReport.students);
  const validScores = allStudents
    .map((student) => student.currentScore)
    .filter((score): score is number => score !== null);

  return {
    totalStudents: allStudents.length,
    validCurrentScoreCount: validScores.length,
    averageScore: validScores.length > 0 ? roundOne(validScores.reduce((sum, score) => sum + score, 0) / validScores.length) : null,
    excellentCount: allStudents.filter((student) => student.scoreBand === "优秀").length,
    lowScoreCount: allStudents.filter((student) => student.currentScore !== null && student.currentScore < 60).length,
    rewardCount: allStudents.filter((student) => student.rewardReasons.length > 0).length,
    parentMessageCount: allStudents.filter(needsParentCommunication).length
  };
}

export function reanalyzeGradeReportData(reportData: GradeReportData): GradeReportData {
  const classes = reportData.classes.map((classReport) =>
    analyzeGradeClass(
      classReport.className,
      classReport.scoreColumns,
      classReport.students.map((student) => ({
        studentId: student.studentId,
        name: student.name,
        scores: student.scores
      }))
    )
  );

  return {
    ...reportData,
    classes,
    summary: summarizeGradeReports(classes),
    warnings: Array.from(new Set([...reportData.warnings, ...classes.flatMap((classReport) => classReport.warnings)]))
  };
}
