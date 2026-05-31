import type { GradeClassReport, GradeStudentRecord } from "./grade-types";
import { formatRankChange } from "./grade-rewards";

export type FocusTargetType = "冲及格" | "补基础" | "冲优秀" | "防下滑" | "兜底关注";
export type FocusLevel = "重点盯" | "顺手关注" | "候补关注";
export type FocusClassStrategy = "保及格优先" | "防下滑优先" | "冲优秀补充";

export type FocusStudent = {
  student: GradeStudentRecord;
  targetType: FocusTargetType;
  level: FocusLevel;
  evidenceTags: string[];
  valueScore: number;
  reason: string;
  action: string;
};

export type FocusClassReport = {
  className: string;
  strategy: FocusClassStrategy;
  strategyReason: string;
  students: FocusStudent[];
  watchStudents: FocusStudent[];
  lightStudents: FocusStudent[];
  backupStudents: FocusStudent[];
  passCount: number;
  excellentCount: number;
  declineCount: number;
  fallbackCount: number;
  isShort: boolean;
};

const PRIMARY_FOCUS_LIMIT = 5;
const BACKUP_FOCUS_LIMIT = 5;
const WATCH_FOCUS_LIMIT = 3;

function gapTo(target: number, score: number): number {
  return Math.max(0, Math.round((target - score) * 10) / 10);
}

function isClearlyDeclined(student: GradeStudentRecord): boolean {
  return student.rankChange !== null && student.rankChange <= -5;
}

function isStableOrNotDeclined(student: GradeStudentRecord): boolean {
  return student.rankChange === null || student.rankChange >= -2;
}

function baselineCanReachPass(student: GradeStudentRecord): boolean {
  return student.baselineScore !== null && student.baselineScore >= 55;
}

function baselinePassBonus(student: GradeStudentRecord): number {
  if (student.baselineScore === null) return 0;
  if (student.baselineScore >= 60) return 24;
  if (student.baselineScore >= 55) return 12;
  return 0;
}

function rankStateBonus(student: GradeStudentRecord): number {
  if (student.rankChange === null) return 8;
  if (student.rankChange >= 3) return 22;
  if (student.rankChange >= 0) return 14;
  if (student.rankChange >= -2) return 8;
  return 0;
}

function getEvidenceTags(student: GradeStudentRecord, targetType: FocusTargetType): string[] {
  const tags: string[] = [];

  if (targetType === "冲及格") tags.push("近及格线");
  if (targetType === "补基础") tags.push("补基础");
  if (targetType === "防下滑") tags.push("防掉线");
  if (targetType === "冲优秀") tags.push("冲优秀");
  if (targetType === "兜底关注") tags.push("优秀提醒");
  if (student.baselineScore !== null && student.baselineScore >= 55 && (targetType === "冲及格" || targetType === "补基础")) {
    tags.push("基准可达");
  }
  if (student.rankChange !== null && student.rankChange <= -3) tags.push("排名下滑");
  if (student.rankChange !== null && student.rankChange >= 3) tags.push("状态回升");
  if (targetType === "冲优秀" && student.currentScore !== null && student.currentScore >= 80) tags.push("近优秀线");

  return tags;
}

type FocusCandidate = Omit<FocusStudent, "level">;

function getFocusCandidate(student: GradeStudentRecord): FocusCandidate | null {
  const score = student.currentScore;
  if (score === null) return null;

  if (score >= 85 && !isClearlyDeclined(student)) return null;

  if (score >= 50 && score < 60) {
    const gap = gapTo(60, score);
    return {
      student,
      targetType: "冲及格",
      evidenceTags: getEvidenceTags(student, "冲及格"),
      valueScore: 1000 - gap * 30 + baselinePassBonus(student) + rankStateBonus(student),
      reason: `离及格线差 ${gap} 分，结合基准和排名判断有冲及格价值`,
      action: "先抓基础题和订正质量，目标是稳定过 60 分。"
    };
  }

  if (score < 50 && (baselineCanReachPass(student) || (score >= 45 && isClearlyDeclined(student)))) {
    return {
      student,
      targetType: "补基础",
      evidenceTags: getEvidenceTags(student, "补基础"),
      valueScore: 850 - gapTo(50, score) * 14 + baselinePassBonus(student) + Math.abs(student.rankChange ?? 0) * 3,
      reason: `当前低于 50 分，但基准或排名显示有恢复空间，先补到 50+`,
      action: "降低短期目标，先补基础计算和典型题，减少空白和低级失误。"
    };
  }

  if (score >= 60 && score < 75 && isClearlyDeclined(student)) {
    return {
      student,
      targetType: "防下滑",
      evidenceTags: getEvidenceTags(student, "防下滑"),
      valueScore: 780 + Math.abs(student.rankChange ?? 0) * 8 - Math.max(0, score - 60) * 5,
      reason: `60-75 分段且${formatRankChange(student.rankChange)}，先防止掉到不及格风险区`,
      action: "先排查近期作业、听课和订正落实情况，稳住及格线以上表现。"
    };
  }

  if (score >= 80 && score < 85) {
    const gap = gapTo(85, score);
    return {
      student,
      targetType: "冲优秀",
      evidenceTags: getEvidenceTags(student, "冲优秀"),
      valueScore: 700 - gap * 14 + (isStableOrNotDeclined(student) ? 24 : 0),
      reason: `离优秀线差 ${gap} 分，及格压力较小后适合冲优秀`,
      action: "重点抓易错题和规范表达，目标是把临界分推到 85 分以上。"
    };
  }

  if (score >= 75 && score < 80 && isStableOrNotDeclined(student)) {
    const gap = gapTo(85, score);
    return {
      student,
      targetType: "冲优秀",
      evidenceTags: getEvidenceTags(student, "冲优秀"),
      valueScore: 610 - gap * 8 + (student.scoreChange !== null && student.scoreChange > 0 ? 18 : 0),
      reason: `处在良好段，离优秀线差 ${gap} 分，适合稳定后冲优秀`,
      action: "先稳住会做题准确率，再补薄弱题型，逐步向优秀线推进。"
    };
  }

  if (score >= 85 && isClearlyDeclined(student)) {
    return {
      student,
      targetType: "兜底关注",
      evidenceTags: getEvidenceTags(student, "兜底关注"),
      valueScore: 260 + Math.abs(student.rankChange ?? 0),
      reason: `已达优秀但${formatRankChange(student.rankChange)}，作为名单不足时的兜底关注`,
      action: "不需要高频干预，重点提醒保持状态，避免继续下滑。"
    };
  }

  return null;
}

function getClassStrategy(students: GradeStudentRecord[]): { strategy: FocusClassStrategy; strategyReason: string } {
  const validStudents = students.filter((student) => student.currentScore !== null);
  const validCount = validStudents.length;
  const passCandidateCount = validStudents.filter((student) => {
    const score = student.currentScore ?? 0;
    return score >= 50 && score < 60;
  }).length;
  const lowScoreCount = validStudents.filter((student) => (student.currentScore ?? 0) < 60).length;
  const declineRiskCount = validStudents.filter((student) => {
    const score = student.currentScore ?? 0;
    return score >= 60 && score < 75 && isClearlyDeclined(student);
  }).length;

  if (passCandidateCount >= 2 || lowScoreCount >= Math.max(3, Math.ceil(validCount * 0.18))) {
    return {
      strategy: "保及格优先",
      strategyReason: `本班有 ${passCandidateCount} 名 50-59 分临界学生、${lowScoreCount} 名未及格学生，先把可拉过线的学生稳住。`
    };
  }

  if (declineRiskCount >= 2) {
    return {
      strategy: "防下滑优先",
      strategyReason: `本班有 ${declineRiskCount} 名 60-75 分段明显退步学生，先防止继续掉线。`
    };
  }

  return {
    strategy: "冲优秀补充",
    strategyReason: "本班及格压力相对较小，可以在保底关注之外补充冲优秀对象。"
  };
}

function getTargetPriority(strategy: FocusClassStrategy, targetType: FocusTargetType): number {
  const passFirst: Record<FocusTargetType, number> = {
    冲及格: 0,
    防下滑: 1,
    补基础: 2,
    冲优秀: 3,
    兜底关注: 4
  };
  const declineFirst: Record<FocusTargetType, number> = {
    防下滑: 0,
    冲及格: 1,
    补基础: 2,
    冲优秀: 3,
    兜底关注: 4
  };
  const excellentSupplement: Record<FocusTargetType, number> = {
    冲及格: 0,
    防下滑: 1,
    冲优秀: 2,
    补基础: 3,
    兜底关注: 4
  };

  if (strategy === "防下滑优先") return declineFirst[targetType];
  if (strategy === "冲优秀补充") return excellentSupplement[targetType];
  return passFirst[targetType];
}

function sortFocusStudents(strategy: FocusClassStrategy) {
  return (a: FocusCandidate, b: FocusCandidate): number => (
    getTargetPriority(strategy, a.targetType) - getTargetPriority(strategy, b.targetType) ||
    b.valueScore - a.valueScore ||
    Math.abs((a.student.currentScore ?? 0) - 60) - Math.abs((b.student.currentScore ?? 0) - 60) ||
    (a.student.studentId || a.student.name).localeCompare(b.student.studentId || b.student.name, "zh-CN")
  );
}

function withFocusLevel(student: FocusCandidate, index: number, isBackup = false): FocusStudent {
  return {
    ...student,
    level: isBackup ? "候补关注" : index < WATCH_FOCUS_LIMIT ? "重点盯" : "顺手关注"
  };
}

function countByTarget(students: FocusStudent[], targetTypes: FocusTargetType[]): number {
  return students.filter((item) => targetTypes.includes(item.targetType)).length;
}

export function buildFocusClassReport(classReport: GradeClassReport): FocusClassReport {
  const { strategy, strategyReason } = getClassStrategy(classReport.students);
  const candidates = classReport.students
    .map(getFocusCandidate)
    .filter((student): student is FocusCandidate => student !== null)
    .sort(sortFocusStudents(strategy));
  const primaryCandidates = candidates.filter((item) => item.targetType !== "兜底关注");
  const selected = primaryCandidates.slice(0, PRIMARY_FOCUS_LIMIT).map((item, index) => withFocusLevel(item, index));
  const backupCandidates = [
    ...primaryCandidates.slice(PRIMARY_FOCUS_LIMIT),
    ...candidates.filter((item) => item.targetType === "兜底关注")
  ];
  const backupStudents = backupCandidates.slice(0, BACKUP_FOCUS_LIMIT).map((item, index) => withFocusLevel(item, index, true));
  const watchStudents = selected.filter((item) => item.level === "重点盯");
  const lightStudents = selected.filter((item) => item.level === "顺手关注");

  return {
    className: classReport.className,
    strategy,
    strategyReason,
    students: selected,
    watchStudents,
    lightStudents,
    backupStudents,
    passCount: countByTarget(selected, ["冲及格", "补基础"]),
    excellentCount: countByTarget(selected, ["冲优秀"]),
    declineCount: countByTarget(selected, ["防下滑"]),
    fallbackCount: countByTarget(selected, ["兜底关注"]),
    isShort: selected.length < PRIMARY_FOCUS_LIMIT
  };
}

export function buildFocusReports(classes: GradeClassReport[]): FocusClassReport[] {
  return classes.map(buildFocusClassReport);
}

export function formatFocusLine(item: FocusStudent): string {
  const score = item.student.currentScore === null ? "-" : `${item.student.currentScore}分`;
  const baseline = item.student.baselineScore === null ? "无基准" : `基准${item.student.baselineScore}分`;
  return `${item.level}｜${item.student.className} ${item.student.name}：${item.targetType}（本次${score}，${baseline}，${formatRankChange(item.student.rankChange)}，${item.evidenceTags.join("、")}）-${item.reason}`;
}
