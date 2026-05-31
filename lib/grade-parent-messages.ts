import type { GradeClassReport, GradeStudentRecord } from "./grade-types";

export type ParentMessageGroup = {
  id: string;
  section: "must" | "positive";
  title: string;
  description: string;
  students: GradeStudentRecord[];
  message: string;
};

function hasRankProgress(student: GradeStudentRecord): boolean {
  return student.rankChange !== null && student.rankChange >= 5;
}

function hasScoreProgress(student: GradeStudentRecord): boolean {
  return student.scoreChange !== null && student.scoreChange >= 10;
}

export function needsParentCommunication(student: GradeStudentRecord): boolean {
  return getParentMessageGroupId(student) !== null;
}

export function getParentMessageGroupId(student: GradeStudentRecord): string | null {
  const currentScore = student.currentScore;
  const rankChange = student.rankChange;

  if (currentScore !== null && currentScore < 60) {
    return "foundation";
  }

  if (currentScore !== null && currentScore >= 60 && currentScore < 75 && rankChange !== null && rankChange <= -3) {
    return "edge";
  }

  if (rankChange !== null && rankChange <= -5) {
    return "declined";
  }

  if (hasRankProgress(student) || hasScoreProgress(student) || (currentScore !== null && currentScore >= 85 && rankChange !== null && rankChange >= 3)) {
    return "improved";
  }

  return null;
}

const GROUP_CONTENT: Record<string, Omit<ParentMessageGroup, "students">> = {
  foundation: {
    id: "foundation",
    section: "must",
    title: "重点沟通：低分/基础薄弱",
    description: "本次低于 60 分，统一按基础薄弱沟通；其中有进步的孩子可在发送时顺带肯定。",
    message:
      "家长您好，这次考试可以看出孩子的基础掌握还不够稳。建议近期先不追求大量刷题，重点把试卷中的基础题、反复错的题型和订正质量抓实。部分孩子已经能看到进步，这一点也值得肯定；接下来关键是继续巩固，把会做的题尽量做对、做稳。我也会在课堂和后续练习中继续关注。"
  },
  declined: {
    id: "declined",
    section: "must",
    title: "状态沟通：明显退步",
    description: "相对折合基准排名退步 5 名及以上。",
    message:
      "家长您好，这次孩子相比前期状态有比较明显的回落。建议和孩子一起复盘近期听课、作业、订正是否落实，先找出退步原因，再针对薄弱题型补一补。我这边也会继续观察孩子后续的课堂和练习状态。"
  },
  edge: {
    id: "edge",
    section: "must",
    title: "边缘提醒：60-75 分段波动",
    description: "本次 60-75 分，且排名退步 3 名及以上。",
    message:
      "家长您好，孩子目前处在容易波动的分数段，这次排名也有一定下滑。建议近期多关注作业订正质量和基础题稳定性，帮助孩子把会做的题稳稳拿住，先减少不该丢的分。"
  },
  improved: {
    id: "improved",
    section: "positive",
    title: "正向反馈：明显进步/表现提升",
    description: "排名进步 5 名及以上，或提分 10 分及以上。",
    message:
      "家长您好，这次孩子相比前期有明显进步，能看出近期学习状态和努力程度都有提升。请您也及时肯定孩子的进步，帮助孩子把现在的好习惯继续保持下去，尤其继续重视错题订正和基础题准确率，争取后面更稳定。"
  }
};

const GROUP_ORDER = ["foundation", "declined", "edge", "improved"];

export function buildParentMessageGroups(classes: GradeClassReport[]): ParentMessageGroup[] {
  const groups = new Map<string, GradeStudentRecord[]>();

  for (const classReport of classes) {
    for (const student of classReport.students) {
      const groupId = getParentMessageGroupId(student);
      if (!groupId) continue;
      groups.set(groupId, [...(groups.get(groupId) ?? []), student]);
    }
  }

  return GROUP_ORDER.flatMap((groupId) => {
    const students = groups.get(groupId) ?? [];
    if (students.length === 0) return [];
    return [{ ...GROUP_CONTENT[groupId], students }];
  });
}

function formatStudentList(students: GradeStudentRecord[]): string {
  return students.map((student) => `${student.className}${student.name}`).join("、");
}

export function formatParentMessageGroup(group: ParentMessageGroup): string {
  return `${group.title}（${group.students.length}人）\n对象：${formatStudentList(group.students)}\n话术：${group.message}`;
}
