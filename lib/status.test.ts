import { describe, expect, it } from "vitest";
import { getFollowUpStudents } from "./report-utils";
import { generateReminder, getAttentionLevel, normalizeStatus } from "./status";
import type { ReportData, StudentRecord } from "./types";

describe("normalizeStatus", () => {
  it("normalizes compatible status labels", () => {
    expect(normalizeStatus(" 已订 ")).toBe("已订正");
    expect(normalizeStatus("订正")).toBe("已订正");
    expect(normalizeStatus("未完成")).toBe("未交");
    expect(normalizeStatus("未交作业")).toBe("未交");
  });

  it("keeps unknown status and handles empty values", () => {
    expect(normalizeStatus("")).toBe("");
    expect(normalizeStatus(undefined)).toBe("");
    expect(normalizeStatus("请假")).toBe("请假");
  });
});

describe("getAttentionLevel", () => {
  it("prioritizes missing and submitted statuses", () => {
    expect(getAttentionLevel(["满分", "未交", "满分", "满分", "满分"])).toBe("重点关注");
    expect(getAttentionLevel(["满分", "已交", "满分", "满分", "满分"])).toBe("待确认");
  });

  it("uses full-score count after higher priority statuses are excluded", () => {
    expect(getAttentionLevel(["已订正", "已订正", "已订正", "已订正", "满分"])).toBe("需要巩固");
    expect(getAttentionLevel(["满分", "满分", "已订正", "已订正", "已订正"])).toBe("稳定完成");
    expect(getAttentionLevel(["满分", "满分", "满分", "满分", "已订正"])).toBe("优秀保持");
  });
});

describe("generateReminder", () => {
  const baseStudent: StudentRecord = {
    className: "1班",
    studentId: "12",
    name: "寿铭昊",
    attentionLevel: "重点关注",
    statuses: {}
  };

  it("generates a single-missing reminder", () => {
    expect(
      generateReminder({
        ...baseStudent,
        statuses: { "5月25日": "已订正", "5月26日": "未交" }
      })
    ).toBe("家长您好，孩子本周出现1次“未交”。请您提醒孩子尽快补齐并完成订正，带到学校后我会继续关注。");
  });

  it("generates a multiple-missing reminder", () => {
    expect(
      generateReminder({
        ...baseStudent,
        name: "魏恩卓",
        statuses: { "5月26日": "未交", "5月28日": "未交" }
      })
    ).toBe("家长您好，孩子本周出现2次“未交”。请您重点提醒孩子尽快补齐并完成订正，也请帮助孩子检查作业落实情况，我会继续关注。");
  });
});

describe("getFollowUpStudents", () => {
  it("returns only students with key attention level", () => {
    const report: ReportData = {
      reportId: "test",
      title: "学生一周订正情况反馈",
      weekLabel: "第16周",
      dateRange: "5月25日—5月29日",
      dates: ["5月25日"],
      warnings: [],
      createdAt: new Date().toISOString(),
      classes: [
        {
          className: "1班",
          students: [
            {
              className: "1班",
              studentId: "1",
              name: "学生甲",
              statuses: { "5月25日": "未交" },
              attentionLevel: "重点关注"
            },
            {
              className: "1班",
              studentId: "2",
              name: "学生乙",
              statuses: { "5月25日": "满分" },
              attentionLevel: "优秀保持"
            }
          ]
        }
      ]
    };

    expect(getFollowUpStudents(report)).toHaveLength(1);
    expect(getFollowUpStudents(report)[0].name).toBe("学生甲");
  });
});
