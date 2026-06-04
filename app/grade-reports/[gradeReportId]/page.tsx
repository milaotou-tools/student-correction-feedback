import Link from "next/link";
import { notFound } from "next/navigation";
import { buildParentMessageGroups } from "@/lib/grade-parent-messages";
import { markLatestGradeReport, readGradeReportData } from "@/lib/grade-storage";
import type { GradeClassReport, GradeStudentRecord, ScoreBandSummary } from "@/lib/grade-types";

type GradeReportPageProps = {
  params: Promise<{ gradeReportId: string }>;
};

function formatNumber(value: number | null): string {
  return value === null ? "-" : String(value);
}

function formatRankChange(value: number | null): string {
  if (value === null) return "-";
  if (value > 0) return `进步 ${value} 名`;
  if (value < 0) return `退步 ${Math.abs(value)} 名`;
  return "持平";
}

function groupStudentsByClass(students: GradeStudentRecord[]): GradeStudentRecord[][] {
  const groups: GradeStudentRecord[][] = [];
  const indexByClass = new Map<string, number>();

  for (const student of students) {
    const existingIndex = indexByClass.get(student.className);
    if (existingIndex === undefined) {
      indexByClass.set(student.className, groups.length);
      groups.push([student]);
      continue;
    }
    groups[existingIndex].push(student);
  }

  return groups;
}

function StudentMiniTable({ students, emptyText }: { students: GradeStudentRecord[]; emptyText: string }) {
  if (students.length === 0) {
    return <div className="rounded-md border border-[#D0D7DE] bg-[#F7F9FC] px-4 py-6 text-center text-sm text-slate-500">{emptyText}</div>;
  }

  const groupedStudents = groupStudentsByClass(students);

  return (
    <div className="space-y-4">
      {groupedStudents.map((group) => (
        <section key={group[0].className} className="max-w-full overflow-hidden rounded-xl border border-[#D0D7DE] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#D0D7DE] bg-[#F3F7FB] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#2F4F68] px-2.5 py-1 text-[11px] font-extrabold leading-none text-white">
                {group[0].className}
              </span>
              <span className="text-[11px] text-slate-500">{group.length} 人</span>
            </div>
          </div>
          <table className="w-full table-fixed border-collapse text-[12px] sm:text-sm">
            <thead>
              <tr className="bg-[#F8FAFD] text-slate-800">
                <th className="w-[28%] border border-[#D0D7DE] px-3 py-2.5 text-left">姓名</th>
                <th className="w-[22%] border border-[#D0D7DE] px-3 py-2.5 text-left">成绩</th>
                <th className="w-[50%] border border-[#D0D7DE] px-3 py-2.5 text-left">排行</th>
              </tr>
            </thead>
            <tbody>
              {group.map((student) => (
                <tr key={`${student.className}-${student.studentId}-${student.name}`} className="odd:bg-white even:bg-[#F7F9FC]">
                  <td className="break-keep border border-[#D0D7DE] px-3 py-3 text-[15px] font-extrabold text-slate-800 sm:text-base">
                    {student.name}
                  </td>
                  <td className="border border-[#D0D7DE] px-3 py-3 leading-5 text-slate-600">
                    <div className="text-[16px] font-extrabold leading-6 text-slate-800 sm:text-lg">{formatNumber(student.currentScore)}分</div>
                  </td>
                  <td className="relative border border-[#D0D7DE] px-3 py-3 pb-6 leading-5 text-slate-600">
                    <div
                      className={`absolute right-2 bottom-2 text-[12px] font-extrabold leading-none ${
                        student.rankChange === null
                          ? "text-slate-400"
                          : student.rankChange > 0
                            ? "text-emerald-600"
                            : "text-rose-600"
                      }`}
                    >
                      {student.rankChange === null ? "-" : student.rankChange > 0 ? `+${student.rankChange}` : `${student.rankChange}`}
                    </div>
                    <div className="pr-8">
                      <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                        <span className="whitespace-nowrap text-[11px] text-slate-500 sm:text-xs">排名</span>
                        <span className="text-[14px] font-extrabold text-slate-800 sm:text-[15px]">
                          {formatNumber(student.baselineRank)}→{formatNumber(student.currentRank)}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

function getBandSummary(items: ScoreBandSummary[], band: ScoreBandSummary["band"]): ScoreBandSummary {
  return items.find((item) => item.band === band) ?? { band, count: 0, percent: 0 };
}

function ClassDistributionOverview({ classes }: { classes: GradeClassReport[] }) {
  const bands: ScoreBandSummary["band"][] = ["优秀", "良好", "一般", "加油", "后进"];

  return (
    <section className="min-w-0 rounded-md border border-[#D0D7DE] bg-white p-5 shadow-sm">
      <div className="border-b border-[#D0D7DE] bg-white px-5 py-4">
        <h2 className="text-xl font-extrabold text-slate-800">班级分布概览</h2>
        <p className="mt-1 text-sm text-slate-600">每个班一张紧凑概览卡，分数段和关键指标一屏看完，不需要横向滑动。</p>
      </div>
      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
        {classes.map((classReport) => (
          <article key={classReport.className} className="min-w-0 rounded-md border border-[#D0D7DE] bg-[#F7F9FC] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-2xl font-extrabold text-slate-800">{classReport.className}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  本次：{classReport.currentExamLabel}<br />
                  基准：{classReport.baselineDescription}
                </p>
              </div>
              <div className="shrink-0 rounded-md bg-white px-3 py-2 text-right text-sm shadow-sm">
                <div className="text-slate-500">平均分</div>
                <div className="mt-1 text-xl font-extrabold text-slate-800">{formatNumber(classReport.averageScore)}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-5 overflow-hidden rounded-md border border-[#D0D7DE] bg-white">
              {bands.map((band) => {
                const summary = getBandSummary(classReport.bandSummary, band);
                return (
                  <div key={band} className="min-w-0 border-r border-[#D0D7DE] px-1 py-3 text-center last:border-r-0">
                    <div className="text-xs font-bold text-slate-600">{band}</div>
                    <div className="mt-1 text-xl font-extrabold text-slate-800">{summary.count}</div>
                    <div className="mt-1 text-[11px] leading-4 text-slate-500">{summary.percent}%</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-white px-3 py-2">
                明显进步：<b className="text-[#2F4F68]">{classReport.improvedStudents.length}</b> 人
              </div>
              <div className="rounded-md bg-white px-3 py-2">
                明显退步：<b className="text-[#7A2E2E]">{classReport.declinedStudents.length}</b> 人
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function GradeReportPage({ params }: GradeReportPageProps) {
  const { gradeReportId } = await params;
  const reportData = await readGradeReportData(gradeReportId).catch(() => null);
  if (!reportData) notFound();
  await markLatestGradeReport(reportData).catch(() => undefined);

  const improvedStudents = reportData.classes.flatMap((classReport) => classReport.improvedStudents).slice(0, 20);
  const declinedStudents = reportData.classes.flatMap((classReport) => classReport.declinedStudents).slice(0, 20);
  const parentMessageGroups = buildParentMessageGroups(reportData.classes);
  const mustCommunicationCount = parentMessageGroups
    .filter((group) => group.section === "must")
    .reduce((sum, group) => sum + group.students.length, 0);
  const positiveFeedbackCount = parentMessageGroups
    .filter((group) => group.section === "positive")
    .reduce((sum, group) => sum + group.students.length, 0);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F9FC] px-4 py-6 sm:px-5 sm:py-8">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#D0D7DE] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-[#2F4F68]">成绩分析</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-800">学生成绩分析报告</h1>
            <p className="mt-2 text-slate-600">本功能与订正反馈数据完全独立。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/grade-reports/${gradeReportId}/focus`} className="focus-ring rounded-md bg-[#2F4F68] px-4 py-3 text-sm font-bold text-white hover:bg-[#263f53]">
              加强关注名单
            </Link>
            <Link href={`/grade-reports/${gradeReportId}/rewards`} className="focus-ring rounded-md bg-[#2F4F68] px-4 py-3 text-sm font-bold text-white hover:bg-[#263f53]">
              小零食奖励名单
            </Link>
            <Link href={`/grade-reports/${gradeReportId}/parent-messages`} className="focus-ring rounded-md border border-[#9fb3c4] bg-white px-4 py-3 text-sm font-bold text-[#2F4F68] hover:bg-[#F3F6FA]">
              家长沟通话术
            </Link>
            <Link href="/" className="focus-ring rounded-md border border-[#9fb3c4] bg-white px-4 py-3 text-sm font-bold text-[#2F4F68] hover:bg-[#F3F6FA]">
              返回首页
            </Link>
          </div>
        </div>

        {reportData.warnings.length > 0 ? (
          <div className="mb-6 rounded-md border border-[#E3C15B] bg-[#FFF8E1] px-4 py-3 text-sm leading-6 text-[#7A5C00]">
            {reportData.warnings.map((warning) => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        ) : null}

        <div className="mb-6 grid grid-cols-5 gap-2 sm:gap-3">
          {[
            ["总人数", `${reportData.summary.totalStudents} 人`],
            ["平均分", formatNumber(reportData.summary.averageScore)],
            ["优秀人数", `${reportData.summary.excellentCount} 人`],
            ["必须沟通", `${mustCommunicationCount} 人`],
            ["正向反馈", `${positiveFeedbackCount} 人`]
          ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-md border border-[#D0D7DE] bg-white px-2 py-3 shadow-sm sm:p-4">
                <div className="truncate text-[11px] font-bold leading-4 text-slate-500 sm:text-sm">{label}</div>
                <div className="mt-1 whitespace-nowrap text-lg font-extrabold leading-7 text-slate-800 sm:mt-2 sm:text-3xl">{value}</div>
              </div>
            ))}
          </div>

        <ClassDistributionOverview classes={reportData.classes} />

        <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
          <section className="min-w-0 rounded-md border border-[#D0D7DE] bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-extrabold text-slate-800">明显进步学生</h2>
            <StudentMiniTable students={improvedStudents} emptyText="暂无进步 5 名及以上的学生。" />
          </section>
          <section className="min-w-0 rounded-md border border-[#D0D7DE] bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-xl font-extrabold text-slate-800">明显退步学生</h2>
            <StudentMiniTable students={declinedStudents} emptyText="暂无退步 5 名及以上的学生。" />
          </section>
        </div>
      </section>
    </main>
  );
}
