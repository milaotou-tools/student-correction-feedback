import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import {
  buildRewardGroups,
  formatExcellentDeclinedLine,
  formatRankChange,
  formatRewardStudentLine,
  getExcellentButDeclinedStudents,
  hasDeclinedWhileRewarded
} from "@/lib/grade-rewards";
import { readGradeReportData } from "@/lib/grade-storage";
import type { GradeStudentRecord } from "@/lib/grade-types";

type RewardsPageProps = {
  params: Promise<{ gradeReportId: string }>;
};

function formatScore(value: number | null): string {
  return value === null ? "-" : `${value}分`;
}

function getRewardReasonClassName(reason: string): string {
  if (reason === "优秀") return "bg-[#FFF2CC] text-[#7A5C00]";
  if (reason === "进步") return "bg-[#E7F5EA] text-[#2F6B3D]";
  return "bg-[#EEF4F8] text-[#2F4F68]";
}

function sortStudentsById(students: GradeStudentRecord[]): GradeStudentRecord[] {
  return [...students].sort((a, b) => {
    const aId = Number(a.studentId);
    const bId = Number(b.studentId);
    if (!Number.isNaN(aId) && !Number.isNaN(bId) && aId !== bId) return aId - bId;
    return a.studentId.localeCompare(b.studentId, "zh-CN", { numeric: true }) || a.name.localeCompare(b.name, "zh-CN");
  });
}

function RewardStudentsList({ students }: { students: GradeStudentRecord[] }) {
  if (students.length === 0) {
    return <div className="px-4 py-8 text-center text-sm text-slate-500">本组暂无学生。</div>;
  }

  return (
    <ul className="divide-y divide-[#D0D7DE]">
      {students.map((student) => (
        <li key={`${student.className}-${student.studentId}-${student.name}`} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="shrink-0 text-sm font-extrabold text-[#2F4F68]">{student.className}</span>
            <span className="shrink-0 text-sm text-slate-500">{student.studentId}</span>
            <span className="min-w-[4.5rem] text-base font-extrabold text-slate-800">{student.name}</span>
            <span className="text-sm font-bold text-slate-700">{formatScore(student.currentScore)}</span>
            <span className="text-xs text-slate-500">{formatRankChange(student.rankChange)}</span>
            <span className="text-xs font-bold text-slate-500">理由</span>
            {student.rewardReasons.map((reason) => (
              <span key={reason} className={`rounded-md px-2 py-1 text-xs font-bold ${getRewardReasonClassName(reason)}`}>
                {reason}
              </span>
            ))}
            {hasDeclinedWhileRewarded(student) ? (
              <span className="rounded-md bg-[#FFF2CC] px-2 py-1 text-[11px] font-bold text-[#7A5C00]">状态下滑</span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function ClassRewardCompactList({ students }: { students: GradeStudentRecord[] }) {
  const sortedStudents = sortStudentsById(students);

  if (sortedStudents.length === 0) {
    return <div className="px-4 py-8 text-center text-sm text-slate-500">本班暂无学生。</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-px bg-[#D0D7DE]">
      {sortedStudents.map((student) => (
        <div key={`${student.className}-${student.studentId}-${student.name}`} className="relative min-h-[5.75rem] bg-white px-2 py-2">
          <div
            className={`absolute right-2 bottom-2 text-[9px] font-extrabold leading-none ${
              student.rankChange === null
                ? "text-slate-400"
                : student.rankChange > 0
                  ? "text-emerald-600"
                  : "text-rose-600"
            }`}
          >
            {student.rankChange === null ? "-" : student.rankChange > 0 ? `+${student.rankChange}` : `${student.rankChange}`}
          </div>
          <div className="grid h-full min-w-0 grid-rows-[auto_1fr_auto] pb-4 text-left">
            <div className="flex min-w-0 items-start gap-1 overflow-hidden whitespace-nowrap pr-8">
              <span className="shrink-0 text-[12px] font-extrabold leading-5 text-[#2F4F68]">{student.studentId}</span>
            </div>
            <div className="flex min-w-0 items-center justify-center overflow-hidden whitespace-nowrap px-1">
              <span className="block w-full min-w-0 -translate-y-1 text-center text-[15px] font-extrabold leading-5 text-slate-800">{student.name}</span>
            </div>
            <div className="absolute left-2 bottom-2 flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap pr-8">
              {student.rewardReasons.slice(0, 2).map((reason) => (
                <span key={reason} className={`shrink-0 rounded-md px-1 py-0.5 text-[8px] font-bold leading-3 ${getRewardReasonClassName(reason)}`}>
                  {reason}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExcellentDeclinedList({ students }: { students: GradeStudentRecord[] }) {
  return (
    <ul className="divide-y divide-[#E3C15B]">
      {students.map((student) => (
        <li key={`${student.className}-${student.studentId}-${student.name}`} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="shrink-0 text-sm font-extrabold text-[#7A5C00]">{student.className}</span>
            <span className="shrink-0 text-sm text-[#7A5C00]">{student.studentId}</span>
            <span className="min-w-[4.5rem] text-base font-extrabold text-slate-800">{student.name}</span>
            <span className="text-sm font-bold text-slate-700">{formatScore(student.currentScore)}</span>
            <span className="text-xs font-bold text-[#7A5C00]">{formatRankChange(student.rankChange)}</span>
            <span className="text-xs font-bold text-[#7A5C00]">提醒</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-[#7A5C00]">成绩仍优秀，但状态明显下滑，建议提醒稳定。</p>
        </li>
      ))}
    </ul>
  );
}

export default async function GradeRewardsPage({ params }: RewardsPageProps) {
  const { gradeReportId } = await params;
  const reportData = await readGradeReportData(gradeReportId).catch(() => null);
  if (!reportData) notFound();

  const allRewardStudents = reportData.classes.flatMap((classReport) => classReport.rewardStudents);
  const rewardGroups = buildRewardGroups(reportData.classes);
  const excellentDeclinedStudents = getExcellentButDeclinedStudents(reportData.classes);
  const copyText = allRewardStudents.length > 0
    ? [`本次小零食奖励名单（${allRewardStudents.length}人）`, ...rewardGroups.map((group) => `${group.title}（${group.students.length}人）\n${group.students.map(formatRewardStudentLine).join("\n")}`)].join("\n\n")
    : "本次暂无符合小零食奖励规则的学生。";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F9FC] px-4 py-6 sm:px-5 sm:py-8">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#D0D7DE] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-[#2F4F68]">统一发小零食</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-800">小零食奖励名单</h1>
            <p className="mt-2 text-slate-600">规则固定：优秀、进步、努力；优秀但明显退步的学生不计入小零食奖励。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CopyButton text={copyText} label="复制全部名单" />
            <Link href={`/grade-reports/${gradeReportId}`} className="focus-ring rounded-md border border-[#9fb3c4] bg-white px-4 py-3 text-sm font-bold text-[#2F4F68] hover:bg-[#F3F6FA]">
              返回成绩分析
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-md border border-[#D0D7DE] bg-white p-5 text-sm leading-7 text-slate-600 shadow-sm">
          <b className="text-slate-800">奖励规则：</b>
          最新成绩达到 85 分且排名退步未达到 5 名；或相对折合基准排名进步 5 名及以上；或最新成绩比折合基准分提高 10 分及以上。
        </div>

        {allRewardStudents.length === 0 ? (
          <div className="rounded-md border border-[#D0D7DE] bg-white px-4 py-10 text-center text-slate-500 shadow-sm">本次暂无符合小零食奖励规则的学生。</div>
        ) : (
          <div className="space-y-6">
            <details open className="group overflow-hidden rounded-md border border-[#D0D7DE] bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-white p-5">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800">按班级核对</h2>
                  <p className="mt-1 text-sm text-slate-600">发放小零食时优先按班级看，逐班核对名单。</p>
                </div>
                <span className="shrink-0 rounded-md border border-[#9fb3c4] bg-white px-3 py-2 text-sm font-bold text-[#2F4F68] group-open:hidden">
                  展开
                </span>
                <span className="hidden shrink-0 rounded-md border border-[#9fb3c4] bg-white px-3 py-2 text-sm font-bold text-[#2F4F68] group-open:inline">
                  收起
                </span>
              </summary>
              <div className="space-y-4 border-t border-[#D0D7DE] bg-[#F7F9FC] p-4">
                {reportData.classes.map((classReport) => {
                  const sortedClassRewards = sortStudentsById(classReport.rewardStudents);
                  const classCopyText = classReport.rewardStudents.length > 0
                    ? [`${classReport.className}小零食奖励名单（${sortedClassRewards.length}人）`, ...sortedClassRewards.map((student) => `${student.studentId} ${student.name}`)].join("\n")
                    : `${classReport.className}暂无符合小零食奖励规则的学生。`;

                  return (
                    <section key={classReport.className} className="min-w-0 overflow-hidden rounded-md border border-[#D0D7DE] bg-white shadow-sm">
                      <div className="flex flex-col gap-3 border-b border-[#D0D7DE] bg-[#D9EAF7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-xl font-extrabold text-slate-800">{classReport.className}</h2>
                          <p className="mt-1 text-sm text-slate-600">{classReport.rewardStudents.length} 人符合奖励规则</p>
                        </div>
                        <CopyButton text={classCopyText} label="复制本班" />
                      </div>
                      <ClassRewardCompactList students={classReport.rewardStudents} />
                    </section>
                  );
                })}
              </div>
            </details>

            <details className="group overflow-hidden rounded-md border border-[#D0D7DE] bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-white p-5">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800">按奖励原因分组</h2>
                  <p className="mt-1 text-sm text-slate-600">同一学生只出现在最优先的一个分组里，避免重复发放。</p>
                </div>
                <span className="shrink-0 rounded-md border border-[#9fb3c4] bg-white px-3 py-2 text-sm font-bold text-[#2F4F68] group-open:hidden">
                  展开
                </span>
                <span className="hidden shrink-0 rounded-md border border-[#9fb3c4] bg-white px-3 py-2 text-sm font-bold text-[#2F4F68] group-open:inline">
                  收起
                </span>
              </summary>
              <div className="space-y-4 border-t border-[#D0D7DE] bg-[#F7F9FC] p-4">
                {rewardGroups.map((group) => {
                  const groupCopyText = `${group.title}（${group.students.length}人）\n${group.students.map(formatRewardStudentLine).join("\n")}`;
                  return (
                    <section key={group.id} className="min-w-0 overflow-hidden rounded-md border border-[#D0D7DE] bg-white shadow-sm">
                      <div className="flex flex-col gap-3 border-b border-[#D0D7DE] bg-[#D9EAF7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-xl font-extrabold text-slate-800">{group.title}</h2>
                          <p className="mt-1 text-sm text-slate-600">{group.description}｜{group.students.length} 人</p>
                        </div>
                        <CopyButton text={groupCopyText} label="复制本组" />
                      </div>
                      <ClassRewardCompactList students={group.students} />
                    </section>
                  );
                })}
              </div>
            </details>

            {excellentDeclinedStudents.length > 0 ? (
              <section className="min-w-0 overflow-hidden rounded-md border border-[#E3C15B] bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-[#E3C15B] bg-[#FFF8E1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">优秀但需提醒</h2>
                    <p className="mt-1 text-sm text-[#7A5C00]">
                      最新成绩仍达优秀，但排名退步 5 名及以上；不计入小零食奖励名单。
                    </p>
                  </div>
                  <CopyButton
                    text={[`优秀但需提醒（${excellentDeclinedStudents.length}人）`, ...excellentDeclinedStudents.map(formatExcellentDeclinedLine)].join("\n")}
                    label="复制提醒名单"
                  />
                </div>
                <ExcellentDeclinedList students={excellentDeclinedStudents} />
              </section>
            ) : null}

          </div>
        )}
      </section>
    </main>
  );
}
