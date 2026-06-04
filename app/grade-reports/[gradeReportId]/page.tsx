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
    return <div className="rounded-md border border-[#E8E6E1] bg-[#FAF9F6] px-4 py-6 text-center text-sm text-[#6B7280]">{emptyText}</div>;
  }

  const groupedStudents = groupStudentsByClass(students);

  return (
    <div className="space-y-3">
      {groupedStudents.map((group) => (
        <section key={group[0].className} className="max-w-full overflow-hidden rounded-md border border-[#E8E6E1] bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-[#E8E6E1] bg-[#FAF9F6] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-[#141413] px-2.5 py-1 text-[11px] font-semibold leading-none text-white">
                {group[0].className}
              </span>
              <span className="text-[11px] text-[#6B7280]">{group.length} 人</span>
            </div>
          </div>
          <table className="w-full table-fixed border-collapse text-[12px] sm:text-sm">
            <thead>
              <tr className="bg-[#EFEDE9] text-[#141413]">
                <th className="w-[28%] border border-[#E8E6E1] px-3 py-2.5 text-left font-semibold">姓名</th>
                <th className="w-[22%] border border-[#E8E6E1] px-3 py-2.5 text-left font-semibold">成绩</th>
                <th className="w-[50%] border border-[#E8E6E1] px-3 py-2.5 text-left font-semibold">排行</th>
              </tr>
            </thead>
            <tbody>
              {group.map((student) => (
                <tr key={`${student.className}-${student.studentId}-${student.name}`} className="odd:bg-white even:bg-[#FAF9F6]">
                  <td className="break-keep border border-[#E8E6E1] px-3 py-3 text-[15px] font-bold text-[#141413] sm:text-base">
                    {student.name}
                  </td>
                  <td className="border border-[#E8E6E1] px-3 py-3 leading-5 text-[#6B7280]">
                    <div className="text-[16px] font-bold leading-6 text-[#141413] sm:text-lg">{formatNumber(student.currentScore)}分</div>
                  </td>
                  <td className="relative border border-[#E8E6E1] px-3 py-3 pb-6 leading-5 text-[#6B7280]">
                    <div
                      className={`absolute right-2 bottom-2 text-[12px] font-bold leading-none ${
                        student.rankChange === null
                          ? "text-[#9CA3AF]"
                          : student.rankChange > 0
                            ? "text-[#16A34A]"
                            : "text-[#DC2626]"
                      }`}
                    >
                      {student.rankChange === null ? "-" : student.rankChange > 0 ? `+${student.rankChange}` : `${student.rankChange}`}
                    </div>
                    <div className="pr-8">
                      <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                        <span className="whitespace-nowrap text-[11px] text-[#6B7280] sm:text-xs">排名</span>
                        <span className="text-[14px] font-bold text-[#141413] sm:text-[15px]">
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
    <section className="min-w-0 rounded-md border border-[#E8E6E1] bg-white">
      <div className="border-b border-[#E8E6E1] px-5 py-4">
        <h2 className="text-xl font-bold tracking-[-0.01em] text-[#141413]">班级分布概览</h2>
        <p className="mt-1 text-sm text-[#6B7280]">每个班一张紧凑概览卡，分数段和关键指标一屏看完。</p>
      </div>
      <div className="p-4 grid min-w-0 gap-4 lg:grid-cols-2">
        {classes.map((classReport) => (
          <article key={classReport.className} className="min-w-0 rounded-md border border-[#E8E6E1] bg-[#F5F4F0] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-2xl font-bold tracking-[-0.01em] text-[#141413]">{classReport.className}</h3>
                <p className="mt-2 text-sm leading-6 text-[#6B7280]">
                  本次：{classReport.currentExamLabel}<br />
                  基准：{classReport.baselineDescription}
                </p>
              </div>
              <div className="shrink-0 rounded-md bg-white px-3 py-2 text-right text-sm border border-[#E8E6E1]">
                <div className="text-[#6B7280] text-xs">平均分</div>
                <div className="mt-1 text-xl font-bold text-[#141413]">{formatNumber(classReport.averageScore)}</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-5 overflow-hidden rounded-md border border-[#E8E6E1] bg-white">
              {bands.map((band) => {
                const summary = getBandSummary(classReport.bandSummary, band);
                return (
                  <div key={band} className="min-w-0 border-r border-[#E8E6E1] px-1 py-3 text-center last:border-r-0">
                    <div className="text-xs font-semibold text-[#6B7280]">{band}</div>
                    <div className="mt-1 text-xl font-bold text-[#141413]">{summary.count}</div>
                    <div className="mt-1 text-[11px] leading-4 text-[#6B7280]">{summary.percent}%</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-white px-3 py-2 border border-[#E8E6E1]">
                明显进步：<b className="text-[#0070F3]">{classReport.improvedStudents.length}</b> 人
              </div>
              <div className="rounded-md bg-white px-3 py-2 border border-[#E8E6E1]">
                明显退步：<b className="text-[#DC2626]">{classReport.declinedStudents.length}</b> 人
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
    <main className="min-h-screen overflow-x-hidden bg-[#FAF9F6] px-4 py-6 sm:px-5 sm:py-8">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#E8E6E1] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-[#6B7280] uppercase">Analysis</p>
            <h1 className="mt-2 text-[28px] font-bold tracking-[-0.02em] text-[#141413]">学生成绩分析报告</h1>
            <p className="mt-2 text-sm text-[#6B7280]">本功能与订正反馈数据完全独立。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/grade-reports/${gradeReportId}/focus`} className="focus-ring rounded-md bg-[#141413] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2A2A28]">
              加强关注名单
            </Link>
            <Link href={`/grade-reports/${gradeReportId}/rewards`} className="focus-ring rounded-md bg-[#141413] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2A2A28]">
              小零食奖励名单
            </Link>
            <Link href={`/grade-reports/${gradeReportId}/parent-messages`} className="focus-ring rounded-md bg-[#141413] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#2A2A28]">
              家长沟通话术
            </Link>
            <Link href="/" className="focus-ring rounded-md border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-medium text-[#141413] hover:bg-[#FAF9F6]">
              返回首页
            </Link>
          </div>
        </div>

        {reportData.warnings.length > 0 ? (
          <div className="mb-6 rounded-md border border-[#E8C54A] bg-[#FEF9EC] px-4 py-3 text-sm leading-6 text-[#7A6000]">
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
              <div key={label} className="min-w-0 rounded-md border border-[#E8E6E1] bg-white px-2 py-3 sm:p-4">
                <div className="truncate text-[11px] font-medium text-[#6B7280] tracking-[0.04em] uppercase sm:text-xs">{label}</div>
                <div className="mt-1 whitespace-nowrap text-lg font-bold leading-7 text-[#141413] sm:mt-2 sm:text-3xl">{value}</div>
              </div>
            ))}
          </div>

        <ClassDistributionOverview classes={reportData.classes} />

        <div className="mt-6 grid min-w-0 gap-6 xl:grid-cols-2">
          <section className="min-w-0 rounded-md border border-[#E8E6E1] bg-white">
            <div className="border-b border-[#E8E6E1] bg-[#F5F4F0] px-5 py-4">
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[#141413]">明显进步学生</h2>
            </div>
            <div className="p-4">
              <StudentMiniTable students={improvedStudents} emptyText="暂无进步 5 名及以上的学生。" />
            </div>
          </section>
          <section className="min-w-0 rounded-md border border-[#E8E6E1] bg-[#F5F4F0]">
            <div className="border-b border-[#E8E6E1] bg-white px-5 py-4">
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[#141413]">明显退步学生</h2>
            </div>
            <div className="p-4">
              <StudentMiniTable students={declinedStudents} emptyText="暂无退步 5 名及以上的学生。" />
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
