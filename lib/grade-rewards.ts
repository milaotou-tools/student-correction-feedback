import type { GradeClassReport, GradeStudentRecord } from "./grade-types";

export type RewardGroupId = "multi" | "excellent" | "improved" | "effort";

export type RewardGroup = {
  id: RewardGroupId;
  title: string;
  description: string;
  students: GradeStudentRecord[];
};

const REWARD_GROUP_CONTENT: Record<RewardGroupId, Omit<RewardGroup, "students">> = {
  multi: {
    id: "multi",
    title: "双项达成",
    description: "同时满足优秀、进步、努力中的两项及以上。"
  },
  excellent: {
    id: "excellent",
    title: "优秀表现",
    description: "最新成绩达到 85 分及以上。"
  },
  improved: {
    id: "improved",
    title: "进步明显",
    description: "相对折合基准排名进步 5 名及以上。"
  },
  effort: {
    id: "effort",
    title: "努力提升",
    description: "最新成绩比折合基准分提高 10 分及以上。"
  }
};

const REWARD_GROUP_ORDER: RewardGroupId[] = ["multi", "excellent", "improved", "effort"];

export function formatRankChange(value: number | null): string {
  if (value === null) return "无可比排名";
  if (value > 0) return `进步 ${value} 名`;
  if (value < 0) return `退步 ${Math.abs(value)} 名`;
  return "持平";
}

export function hasDeclinedWhileRewarded(student: GradeStudentRecord): boolean {
  return student.rewardReasons.length > 0 && student.rankChange !== null && student.rankChange < 0;
}

export function isExcellentButDeclined(student: Pick<GradeStudentRecord, "currentScore" | "rankChange">): boolean {
  return student.currentScore !== null && student.currentScore >= 85 && student.rankChange !== null && student.rankChange <= -5;
}

function getRewardGroupId(student: GradeStudentRecord): RewardGroupId | null {
  if (student.rewardReasons.length === 0) return null;
  if (student.rewardReasons.length >= 2) return "multi";
  if (student.rewardReasons.includes("优秀")) return "excellent";
  if (student.rewardReasons.includes("进步")) return "improved";
  if (student.rewardReasons.includes("努力")) return "effort";
  return null;
}

export function buildRewardGroups(classes: GradeClassReport[]): RewardGroup[] {
  const groups = new Map<RewardGroupId, GradeStudentRecord[]>();

  for (const classReport of classes) {
    for (const student of classReport.rewardStudents) {
      const groupId = getRewardGroupId(student);
      if (!groupId) continue;
      groups.set(groupId, [...(groups.get(groupId) ?? []), student]);
    }
  }

  return REWARD_GROUP_ORDER.flatMap((groupId) => {
    const students = groups.get(groupId) ?? [];
    if (students.length === 0) return [];
    return [{ ...REWARD_GROUP_CONTENT[groupId], students }];
  });
}

export function getExcellentButDeclinedStudents(classes: GradeClassReport[]): GradeStudentRecord[] {
  return classes
    .flatMap((classReport) => classReport.students)
    .filter(isExcellentButDeclined)
    .sort((a, b) => (a.rankChange ?? 0) - (b.rankChange ?? 0));
}

export function formatRewardStudentLine(student: GradeStudentRecord): string {
  const scoreText = student.currentScore === null ? "-" : `${student.currentScore}分`;
  const statusText = hasDeclinedWhileRewarded(student) ? "，状态下滑" : "";
  return `${student.className} ${student.name}：${student.rewardReasons.join("、")}（本次${scoreText}，${formatRankChange(student.rankChange)}${statusText}）`;
}

export function formatExcellentDeclinedLine(student: GradeStudentRecord): string {
  const scoreText = student.currentScore === null ? "-" : `${student.currentScore}分`;
  return `${student.className} ${student.name}：本次${scoreText}，${formatRankChange(student.rankChange)}，成绩仍优秀但状态明显下滑，建议提醒稳定。`;
}
