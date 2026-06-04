"use client";

import { FormEvent, useState } from "react";
import type { FollowUpStudent } from "@/lib/types";
import { withAppBasePath } from "@/lib/app-path";

type FollowUpGroup = {
  reminder: string;
  students: FollowUpStudent[];
};

function groupByReminder(students: FollowUpStudent[]): FollowUpGroup[] {
  const groups = new Map<string, FollowUpStudent[]>();

  for (const student of students) {
    const existing = groups.get(student.reminder) ?? [];
    existing.push(student);
    groups.set(student.reminder, existing);
  }

  return Array.from(groups.entries())
    .map(([reminder, groupStudents]) => ({ reminder, students: groupStudents }))
    .sort((a, b) => {
      const countA = a.students[0]?.missingDates.length ?? 0;
      const countB = b.students[0]?.missingDates.length ?? 0;
      return countA - countB || a.reminder.localeCompare(b.reminder, "zh-CN");
    });
}

export function TeacherPasswordGate({ reportId }: { reportId: string }) {
  const [password, setPassword] = useState("");
  const [students, setStudents] = useState<FollowUpStudent[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(withAppBasePath(`/api/reports/${reportId}/follow-up`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const result = (await response.json()) as { students?: FollowUpStudent[]; error?: string };
      if (!response.ok || !result.students) {
        throw new Error(result.error || "密码错误，请重试");
      }
      setStudents(result.students);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "密码错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  if (!students) {
    return (
      <form onSubmit={handleSubmit} className="mx-auto max-w-md rounded-md border border-[#E8E6E1] bg-white p-7">
        <h1 className="text-2xl font-extrabold text-[#141413]">教师跟进页</h1>
        <p className="mt-3 text-sm leading-6 text-[#6B7280]">此页面仅教师本人查看。请输入访问密码后查看重点关注学生。</p>
        <label htmlFor="password" className="mt-6 block text-sm font-bold text-[#141413]">
          访问密码
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="focus-ring mt-2 w-full rounded-md border border-[#E8E6E1] bg-[#FAF9F6] px-4 py-3"
        />
        {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="focus-ring mt-6 w-full rounded-md bg-[#141413] px-5 py-3 font-bold text-white hover:bg-[#2A2A28] disabled:opacity-60"
        >
          {loading ? "正在校验..." : "查看跟进名单"}
        </button>
      </form>
    );
  }

  const groups = groupByReminder(students);

  return (
    <section className="rounded-md border border-[#E8E6E1] bg-white">
      <div className="border-b border-[#E8E6E1] bg-[#FAF9F6] px-5 py-4">
        <h1 className="text-xl font-extrabold text-[#141413]">重点关注学生</h1>
        <p className="mt-1 text-sm text-[#6B7280]">仅显示本周出现“未交”的学生，并按相同提醒话术分组。</p>
      </div>
      <div className="p-5">
        {groups.length === 0 ? (
          <div className="rounded-md border border-[#E8E6E1] bg-[#FAF9F6] px-4 py-8 text-center text-[#6B7280]">本周没有重点关注学生。</div>
        ) : (
          <div className="space-y-5">
            {groups.map((group, index) => (
              <section key={group.reminder} className="overflow-hidden rounded-md border border-[#E8E6E1]">
                <div className="bg-[#FAF9F6] px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h2 className="font-extrabold text-[#141413]">
                        话术 {index + 1}｜{group.students.length} 人
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[#141413]">{group.reminder}</p>
                      <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                        群发对象：{group.students.map((student) => `${student.className}${student.name}`).join("、")}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#FAF9F6] text-[#141413]">
                        <th className="border border-[#E8E6E1] px-3 py-3 text-left">班级</th>
                        <th className="border border-[#E8E6E1] px-3 py-3 text-left">学号</th>
                        <th className="border border-[#E8E6E1] px-3 py-3 text-left">姓名</th>
                        <th className="border border-[#E8E6E1] px-3 py-3 text-left">未交日期</th>
                        <th className="border border-[#E8E6E1] px-3 py-3 text-left">未交次数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.students.map((student) => (
                        <tr key={`${student.className}-${student.studentId}-${student.name}`} className="odd:bg-white even:bg-[#FAF9F6]">
                          <td className="border border-[#E8E6E1] px-3 py-3 font-bold">{student.className}</td>
                          <td className="border border-[#E8E6E1] px-3 py-3">{student.studentId}</td>
                          <td className="border border-[#E8E6E1] px-3 py-3 font-bold">{student.name}</td>
                          <td className="border border-[#E8E6E1] px-3 py-3 text-[#9C0006]">{student.missingDates.join("、")}</td>
                          <td className="border border-[#E8E6E1] px-3 py-3 text-[#9C0006]">{student.missingDates.length} 次</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
