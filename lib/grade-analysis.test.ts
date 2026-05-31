import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { analyzeGradeClass, calculateCompetitionRanks, getScoreBand, isMajorExamLabel, reanalyzeGradeReportData } from "./grade-analysis";
import { parseGradeExcel } from "./grade-excel";
import { buildParentMessageGroups } from "./grade-parent-messages";
import { buildRewardGroups, formatRankChange, getExcellentButDeclinedStudents, hasDeclinedWhileRewarded } from "./grade-rewards";
import { buildFocusClassReport } from "./grade-focus";
import type { GradeClassReport, GradeReportData, GradeStudentRecord } from "./grade-types";

function buildWorkbookBuffer(): Buffer {
  const workbook = XLSX.utils.book_new();
  const class61 = XLSX.utils.aoa_to_sheet([
    ["学号", "姓名", "上学期期末", "本学期期中"],
    [1, "学生甲", 80, 90],
    [2, "学生乙", 90, 80],
    [3, "学生丙", 60, 60]
  ]);
  const class62 = XLSX.utils.aoa_to_sheet([
    ["学号", "姓名", "上学期期末", "圆柱单元", "本学期期中"],
    [1, "学生丁", 90, 70, 95],
    [2, "学生戊", 80, 100, 85],
    [3, "学生己", 70, 60, 70]
  ]);
  XLSX.utils.book_append_sheet(workbook, class61, "61");
  XLSX.utils.book_append_sheet(workbook, class62, "62");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("grade analysis basics", () => {
  it("recognizes major exam labels and score bands", () => {
    expect(isMajorExamLabel("上学期期末")).toBe(true);
    expect(isMajorExamLabel("本学期期中")).toBe(true);
    expect(isMajorExamLabel("圆柱单元")).toBe(false);
    expect(getScoreBand(85)).toBe("优秀");
    expect(getScoreBand(75)).toBe("良好");
    expect(getScoreBand(60)).toBe("一般");
    expect(getScoreBand(50)).toBe("加油");
    expect(getScoreBand(49.5)).toBe("后进");
  });

  it("uses competition ranking for ties", () => {
    const ranks = calculateCompetitionRanks([
      { key: "a", score: 100 },
      { key: "b", score: 90 },
      { key: "c", score: 90 },
      { key: "d", score: 70 }
    ]);

    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("b")).toBe(2);
    expect(ranks.get("c")).toBe(2);
    expect(ranks.get("d")).toBe(4);
  });

  it("formats rank changes in readable text", () => {
    expect(formatRankChange(13)).toBe("进步 13 名");
    expect(formatRankChange(-1)).toBe("退步 1 名");
    expect(formatRankChange(0)).toBe("持平");
    expect(formatRankChange(null)).toBe("无可比排名");
  });

  it("calculates baseline score from major exam and process exam", () => {
    const report = analyzeGradeClass(
      "62",
      [
        { label: "上学期期末", index: 2, isMajorExam: true },
        { label: "圆柱单元", index: 3, isMajorExam: false },
        { label: "本学期期中", index: 4, isMajorExam: true }
      ],
      [
        { studentId: "1", name: "学生丁", scores: { 上学期期末: 90, 圆柱单元: 70, 本学期期中: 95 } },
        { studentId: "2", name: "学生戊", scores: { 上学期期末: 80, 圆柱单元: 100, 本学期期中: 85 } }
      ]
    );

    expect(report.baselineDescription).toBe("上学期期末 50% + 圆柱单元 50%");
    expect(report.students[0].baselineScore).toBe(80);
    expect(report.students[1].baselineScore).toBe(90);
    expect(report.students[0].rankChange).toBe(1);
    expect(report.students[1].rankChange).toBe(-1);
  });
});

describe("parseGradeExcel", () => {
  it("parses sample-like workbook structures and keeps each class independent", async () => {
    const report = await parseGradeExcel(buildWorkbookBuffer());
    const class61 = report.classes.find((classReport) => classReport.className === "61");
    const class62 = report.classes.find((classReport) => classReport.className === "62");

    expect(class61?.baselineDescription).toBe("上学期期末");
    expect(class62?.baselineDescription).toBe("上学期期末 50% + 圆柱单元 50%");
    expect(class61?.currentExamLabel).toBe("本学期期中");
    expect(class62?.currentExamLabel).toBe("本学期期中");
    expect(report.summary.totalStudents).toBe(6);
  });

  it("marks reward and parent-message students from fixed rules", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["学号", "姓名", "上学期期末", "圆柱单元", "本学期期中"],
      [1, "优秀生", 90, 90, 92],
      [2, "进步生", 50, 50, 80],
      [3, "努力生", 70, 70, 81],
      [4, "退步生", 95, 95, 55],
      [5, "边缘生", 80, 80, 65],
      [6, "普通生", 75, 75, 74],
      [7, "挤压生", 60, 60, 70]
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "测试班");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const report = await parseGradeExcel(buffer);
    const classReport = report.classes[0];
    const rewardNames = classReport.rewardStudents.map((student) => student.name);
    const messageNames = classReport.parentMessageStudents.map((student) => student.name);

    expect(rewardNames).toContain("优秀生");
    expect(rewardNames).toContain("进步生");
    expect(rewardNames).toContain("努力生");
    expect(messageNames).toContain("退步生");
    expect(messageNames).toContain("边缘生");
    expect(messageNames).toContain("进步生");
    expect(messageNames).toContain("努力生");
  });

  it("groups parent messages by situation instead of per student", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["学号", "姓名", "上学期期末", "圆柱单元", "本学期期中"],
      [1, "退步甲", 100, 100, 40],
      [2, "退步乙", 98, 98, 42],
      [3, "进步甲", 50, 50, 95],
      [4, "进步乙", 48, 48, 90],
      [5, "挤压甲", 47, 47, 88],
      [6, "挤压乙", 46, 46, 86],
      [7, "挤压丙", 45, 45, 84],
      [8, "普通甲", 75, 75, 74]
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "测试班");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const report = await parseGradeExcel(buffer);
    const groups = buildParentMessageGroups(report.classes);
    const foundation = groups.find((group) => group.id === "foundation");
    const improved = groups.find((group) => group.id === "improved");

    expect(foundation?.students.map((student) => student.name)).toEqual(["退步甲", "退步乙"]);
    expect(improved?.students.map((student) => student.name)).toContain("进步甲");
    expect(improved?.students.map((student) => student.name)).toContain("进步乙");
  });

  it("groups rewards by priority without duplicates and flags declined rewarded students", () => {
    const makeStudent = (name: string, rewardReasons: string[], rankChange: number | null): GradeStudentRecord => ({
      className: "奖励班",
      studentId: name,
      name,
      scores: {},
      currentScore: 88,
      baselineScore: 80,
      currentRank: null,
      baselineRank: null,
      rankChange,
      scoreChange: 8,
      scoreBand: "优秀",
      rewardReasons,
      attentionReasons: [],
      parentMessage: ""
    });
    const students = [
      makeStudent("双项生", ["优秀", "进步"], 5),
      makeStudent("优秀生", ["优秀"], 0),
      makeStudent("进步生", ["进步"], 5),
      makeStudent("努力生", ["努力"], 1),
      makeStudent("下滑优秀", ["优秀"], -2)
    ];
    const classReport = {
      className: "奖励班",
      students,
      rewardStudents: students
    } as unknown as GradeClassReport;

    const groups = buildRewardGroups([classReport]);
    const groupedNames = groups.flatMap((group) => group.students.map((student) => student.name));
    const multi = groups.find((group) => group.id === "multi");
    const excellent = groups.find((group) => group.id === "excellent");
    const improved = groups.find((group) => group.id === "improved");
    const effort = groups.find((group) => group.id === "effort");
    const declinedExcellent = students.find((student) => student.name === "下滑优秀");

    expect(multi?.students.map((student) => student.name)).toContain("双项生");
    expect(excellent?.students.map((student) => student.name)).toContain("优秀生");
    expect(improved?.students.map((student) => student.name)).toContain("进步生");
    expect(effort?.students.map((student) => student.name)).toContain("努力生");
    expect(groupedNames.filter((name) => name === "双项生")).toHaveLength(1);
    expect(declinedExcellent && hasDeclinedWhileRewarded(declinedExcellent)).toBe(true);
  });

  it("excludes excellent students with clear decline from rewards and lists them for reminders", () => {
    const makeStudent = (name: string, currentScore: number, rankChange: number, scoreChange = -5): GradeStudentRecord => ({
      className: "提醒班",
      studentId: name,
      name,
      scores: {},
      currentScore,
      baselineScore: currentScore - scoreChange,
      currentRank: null,
      baselineRank: null,
      rankChange,
      scoreChange,
      scoreBand: currentScore >= 85 ? "优秀" : "良好",
      rewardReasons: [],
      attentionReasons: [],
      parentMessage: ""
    });
    const classReport = analyzeGradeClass(
      "提醒班",
      [
        { label: "上学期期末", index: 2, isMajorExam: true },
        { label: "本学期期中", index: 3, isMajorExam: true }
      ],
      [
        { studentId: "1", name: "小幅退步优秀", scores: { 上学期期末: 97, 本学期期中: 96 } },
        { studentId: "2", name: "明显退步优秀", scores: { 上学期期末: 100, 本学期期中: 85 } },
        { studentId: "3", name: "进步生", scores: { 上学期期末: 70, 本学期期中: 95 } },
        { studentId: "4", name: "挤压甲", scores: { 上学期期末: 60, 本学期期中: 94 } },
        { studentId: "5", name: "挤压乙", scores: { 上学期期末: 60, 本学期期中: 93 } },
        { studentId: "6", name: "挤压丙", scores: { 上学期期末: 60, 本学期期中: 92 } },
        { studentId: "7", name: "挤压丁", scores: { 上学期期末: 60, 本学期期中: 91 } },
        { studentId: "8", name: "挤压戊", scores: { 上学期期末: 60, 本学期期中: 90 } },
        { studentId: "9", name: "普通生", scores: { 上学期期末: 80, 本学期期中: 80 } }
      ]
    );
    const rewardNames = classReport.rewardStudents.map((student) => student.name);
    const reminderNames = getExcellentButDeclinedStudents([classReport]).map((student) => student.name);

    expect(rewardNames).toContain("小幅退步优秀");
    expect(rewardNames).not.toContain("明显退步优秀");
    expect(rewardNames).toContain("进步生");
    expect(reminderNames).toContain("明显退步优秀");
    expect(reminderNames).not.toContain("小幅退步优秀");
  });

  it("reanalyzes stored reports so stale reward reasons use current rules", () => {
    const makeStoredStudent = (studentId: string, name: string, previous: number, current: number, rewardReasons: string[] = []): GradeStudentRecord => ({
      className: "61",
      studentId,
      name,
      scores: { 上学期期末: previous, 本学期期中: current },
      currentScore: current,
      baselineScore: previous,
      currentRank: 7,
      baselineRank: 1,
      rankChange: -6,
      scoreChange: current - previous,
      scoreBand: current >= 85 ? "优秀" : "良好",
      rewardReasons,
      attentionReasons: [],
      parentMessage: ""
    });
    const staleStudent = makeStoredStudent("43", "周健豪", 98, 91, ["优秀"]);
    const students = [
      staleStudent,
      makeStoredStudent("1", "挤压甲", 60, 100),
      makeStoredStudent("2", "挤压乙", 60, 99),
      makeStoredStudent("3", "挤压丙", 60, 98),
      makeStoredStudent("4", "挤压丁", 60, 97),
      makeStoredStudent("5", "挤压戊", 60, 96),
      makeStoredStudent("6", "挤压己", 60, 95)
    ];
    const staleReport: GradeReportData = {
      gradeReportId: "stale",
      title: "学生成绩分析",
      createdAt: new Date().toISOString(),
      warnings: [],
      summary: {
        totalStudents: 1,
        validCurrentScoreCount: 1,
        averageScore: 91,
        excellentCount: 1,
        lowScoreCount: 0,
        rewardCount: 1,
        parentMessageCount: 0
      },
      classes: [
        {
          className: "61",
          scoreColumns: [
            { label: "上学期期末", index: 2, isMajorExam: true },
            { label: "本学期期中", index: 3, isMajorExam: true }
          ],
          currentExamLabel: "本学期期中",
          baselineMajorExamLabel: "上学期期末",
          baselineProcessExamLabel: null,
          baselineDescription: "上学期期末",
          students,
          bandSummary: [],
          studentCount: students.length,
          validCurrentScoreCount: students.length,
          averageScore: 91,
          excellentCount: 1,
          lowScoreCount: 0,
          improvedStudents: [],
          declinedStudents: [staleStudent],
          rewardStudents: [staleStudent],
          parentMessageStudents: [],
          warnings: []
        }
      ]
    };

    const reanalyzed = reanalyzeGradeReportData(staleReport);

    expect(reanalyzed.classes[0].students[0].rewardReasons).toEqual([]);
    expect(reanalyzed.classes[0].rewardStudents.map((student) => student.name)).not.toContain("周健豪");
    expect(getExcellentButDeclinedStudents(reanalyzed.classes).map((student) => student.name)).toContain("周健豪");
  });

  it("separates must communication and positive feedback counts from parent groups", async () => {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["学号", "姓名", "上学期期末", "圆柱单元", "本学期期中"],
      [1, "低分生", 80, 80, 50],
      [2, "边缘生", 80, 80, 65],
      [3, "退步生", 95, 95, 70],
      [4, "进步生", 50, 50, 88],
      [5, "普通生", 76, 76, 76],
      [6, "挤压生", 60, 60, 86]
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "沟通班");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const report = await parseGradeExcel(buffer);
    const groups = buildParentMessageGroups(report.classes);
    const mustCount = groups.filter((group) => group.section === "must").reduce((sum, group) => sum + group.students.length, 0);
    const positiveCount = groups.filter((group) => group.section === "positive").reduce((sum, group) => sum + group.students.length, 0);

    expect(mustCount).toBeGreaterThan(0);
    expect(positiveCount).toBeGreaterThan(0);
    expect(mustCount + positiveCount).toBe(report.summary.parentMessageCount);
  });

  it("splits focus students into five primary and up to five backup students", () => {
    const makeStudent = (name: string, currentScore: number, baselineScore: number, rankChange: number): GradeStudentRecord => ({
      className: "关注班",
      studentId: name,
      name,
      scores: {},
      currentScore,
      baselineScore,
      currentRank: null,
      baselineRank: null,
      rankChange,
      scoreChange: Math.round((currentScore - baselineScore) * 10) / 10,
      scoreBand: currentScore >= 85 ? "优秀" : currentScore >= 75 ? "良好" : currentScore >= 60 ? "一般" : currentScore >= 50 ? "加油" : "后进",
      rewardReasons: [],
      attentionReasons: [],
      parentMessage: ""
    });
    const students = [
      makeStudent("冲及格甲", 59, 58, -1),
      makeStudent("冲及格乙", 55, 60, -5),
      makeStudent("冲优秀甲", 84, 82, 1),
      makeStudent("冲优秀乙", 78, 76, 0),
      makeStudent("防下滑甲", 68, 80, -8),
      makeStudent("稳定优秀", 92, 90, 0),
      makeStudent("过低弱基础", 35, 40, -2),
      makeStudent("补基础甲", 45, 58, -1),
      makeStudent("候选1", 58, 59, 0),
      makeStudent("候选2", 57, 59, 0),
      makeStudent("候选3", 56, 59, 0),
      makeStudent("候选4", 83, 81, 0)
    ];
    const report = buildFocusClassReport({ className: "关注班", students } as GradeClassReport);
    const names = report.students.map((item) => item.student.name);
    const backupNames = report.backupStudents.map((item) => item.student.name);

    expect(report.students).toHaveLength(5);
    expect(report.backupStudents).toHaveLength(5);
    expect(report.strategy).toBe("保及格优先");
    expect(report.watchStudents).toHaveLength(3);
    expect(report.lightStudents).toHaveLength(2);
    expect(report.students.slice(0, 3).every((item) => item.level === "重点盯")).toBe(true);
    expect(report.students.slice(3).every((item) => item.level === "顺手关注")).toBe(true);
    expect(report.students[0].targetType).toBe("冲及格");
    expect(report.students[0].evidenceTags).toContain("近及格线");
    expect(names).toContain("冲及格甲");
    expect(backupNames).toContain("冲优秀甲");
    expect(backupNames).toContain("防下滑甲");
    expect(backupNames).toContain("补基础甲");
    expect(names).not.toContain("稳定优秀");
    expect(backupNames).not.toContain("稳定优秀");
    expect(names).not.toContain("过低弱基础");
    expect(backupNames).not.toContain("过低弱基础");
  });

  it("prioritizes decline prevention before excellent pushing in focus lists", () => {
    const makeStudent = (name: string, currentScore: number, baselineScore: number, rankChange: number): GradeStudentRecord => ({
      className: "排序班",
      studentId: name,
      name,
      scores: {},
      currentScore,
      baselineScore,
      currentRank: null,
      baselineRank: null,
      rankChange,
      scoreChange: Math.round((currentScore - baselineScore) * 10) / 10,
      scoreBand: currentScore >= 85 ? "优秀" : currentScore >= 75 ? "良好" : currentScore >= 60 ? "一般" : currentScore >= 50 ? "加油" : "后进",
      rewardReasons: [],
      attentionReasons: [],
      parentMessage: ""
    });
    const report = buildFocusClassReport({
      className: "排序班",
      students: [
        makeStudent("冲及格甲", 58, 61, 0),
        makeStudent("冲及格乙", 56, 58, 1),
        makeStudent("防下滑甲", 68, 78, -8),
        makeStudent("防下滑乙", 72, 82, -7),
        makeStudent("冲优秀甲", 84, 82, 1),
        makeStudent("冲优秀乙", 83, 80, 0)
      ]
    } as GradeClassReport);
    const names = report.students.map((item) => item.student.name);

    expect(names.indexOf("防下滑甲")).toBeLessThan(names.indexOf("冲优秀甲"));
    expect(names.indexOf("防下滑乙")).toBeLessThan(names.indexOf("冲优秀甲"));
  });

  it("uses decline and excellent supplement strategies when pass pressure is low", () => {
    const makeStudent = (name: string, currentScore: number, baselineScore: number, rankChange: number): GradeStudentRecord => ({
      className: "策略班",
      studentId: name,
      name,
      scores: {},
      currentScore,
      baselineScore,
      currentRank: null,
      baselineRank: null,
      rankChange,
      scoreChange: Math.round((currentScore - baselineScore) * 10) / 10,
      scoreBand: currentScore >= 85 ? "优秀" : currentScore >= 75 ? "良好" : currentScore >= 60 ? "一般" : currentScore >= 50 ? "加油" : "后进",
      rewardReasons: [],
      attentionReasons: [],
      parentMessage: ""
    });
    const declineReport = buildFocusClassReport({
      className: "策略班",
      students: [
        makeStudent("防下滑甲", 70, 85, -8),
        makeStudent("防下滑乙", 68, 82, -7),
        makeStudent("冲优秀甲", 84, 82, 0),
        makeStudent("稳定优秀", 92, 90, 0)
      ]
    } as GradeClassReport);
    const excellentReport = buildFocusClassReport({
      className: "策略班",
      students: [
        makeStudent("冲优秀甲", 84, 82, 0),
        makeStudent("冲优秀乙", 83, 81, 1),
        makeStudent("普通甲", 76, 76, 0),
        makeStudent("稳定优秀", 92, 90, 0)
      ]
    } as GradeClassReport);

    expect(declineReport.strategy).toBe("防下滑优先");
    expect(declineReport.students[0].targetType).toBe("防下滑");
    expect(declineReport.students[0].evidenceTags).toContain("防掉线");
    expect(excellentReport.strategy).toBe("冲优秀补充");
    expect(excellentReport.students.map((item) => item.targetType)).toContain("冲优秀");
  });

  it("keeps clearly declined excellent students out of the primary focus list", () => {
    const makeStudent = (name: string, currentScore: number, baselineScore: number, rankChange: number): GradeStudentRecord => ({
      className: "优秀提醒班",
      studentId: name,
      name,
      scores: {},
      currentScore,
      baselineScore,
      currentRank: null,
      baselineRank: null,
      rankChange,
      scoreChange: Math.round((currentScore - baselineScore) * 10) / 10,
      scoreBand: currentScore >= 85 ? "优秀" : currentScore >= 75 ? "良好" : currentScore >= 60 ? "一般" : currentScore >= 50 ? "加油" : "后进",
      rewardReasons: [],
      attentionReasons: [],
      parentMessage: ""
    });
    const report = buildFocusClassReport({
      className: "优秀提醒班",
      students: [
        makeStudent("优秀退步", 90, 98, -6),
        makeStudent("冲及格甲", 58, 60, 0),
        makeStudent("防下滑甲", 68, 80, -6)
      ]
    } as GradeClassReport);

    expect(report.students.map((item) => item.student.name)).not.toContain("优秀退步");
    expect(report.backupStudents.map((item) => item.student.name)).toContain("优秀退步");
    expect(report.backupStudents.find((item) => item.student.name === "优秀退步")?.level).toBe("候补关注");
  });

  it("marks focus report short when fewer than five candidates exist", () => {
    const student: GradeStudentRecord = {
      className: "短名单",
      studentId: "1",
      name: "临界生",
      scores: {},
      currentScore: 58,
      baselineScore: 59,
      currentRank: null,
      baselineRank: null,
      rankChange: 0,
      scoreChange: -1,
      scoreBand: "加油",
      rewardReasons: [],
      attentionReasons: [],
      parentMessage: ""
    };
    const report = buildFocusClassReport({ className: "短名单", students: [student] } as GradeClassReport);

    expect(report.students).toHaveLength(1);
    expect(report.backupStudents).toHaveLength(0);
    expect(report.isShort).toBe(true);
  });
});
