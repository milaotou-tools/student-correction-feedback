import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { buildFocusReports, formatFocusLine } from "@/lib/grade-focus";
import { formatRankChange } from "@/lib/grade-rewards";
import { readGradeReportData } from "@/lib/grade-storage";
import type { FocusClassReport } from "@/lib/grade-focus";

type FocusPageProps = {
  params: Promise<{ gradeReportId: string }>;
};

function formatScore(value: number | null): string {
  return value === null ? "-" : `${value}分`;
}

function formatClassCopyText(report: FocusClassReport): string {
  if (report.students.length === 0) return `${report.className}暂无加强关注候选。`;
  const parts = [
    `${report.className}加强关注主名单（${report.students.length}人）`,
    `班级策略：${report.strategy}｜${report.strategyReason}`
  ];
  if (report.watchStudents.length > 0) {
    parts.push(`重点盯（${report.watchStudents.length}人）`, ...report.watchStudents.map(formatFocusLine));
  }
  if (report.lightStudents.length > 0) {
    parts.push(`顺手关注（${report.lightStudents.length}人）`, ...report.lightStudents.map(formatFocusLine));
  }
  return parts.join("\n");
}

function formatClassCopyTextWithBackup(report: FocusClassReport): string {
  const primaryText = formatClassCopyText(report);
  if (report.backupStudents.length === 0) return primaryText;
  return [
    primaryText,
    `${report.className}候补关注（${report.backupStudents.length}人）`,
    ...report.backupStudents.map(formatFocusLine)
  ].join("\n");
}

function getLevelClassName(level: string): string {
  if (level === "重点盯") return "bg-[#2F4F68] text-white";
  if (level === "顺手关注") return "bg-[#E8F2F8] text-[#2F4F68]";
  return "bg-[#F3F6FA] text-slate-600";
}

function FocusStudentList({ students, startIndex = 1 }: { students: FocusClassReport["students"]; startIndex?: number }) {
  return (
    <div className="grid gap-3 p-4 lg:grid-cols-2">
      {students.map((item, index) => (
        <article key={`${item.student.className}-${item.student.studentId}-${item.student.name}`} className="rounded-md border border-[#D0D7DE] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">#{startIndex + index}</span>
                <span className={`rounded-md px-2 py-1 text-xs font-bold ${getLevelClassName(item.level)}`}>{item.level}</span>
                <span className="rounded-md bg-[#FFF7E6] px-2 py-1 text-xs font-bold text-[#7A5C00]">{item.targetType}</span>
              </div>
              <h4 className="mt-3 text-lg font-extrabold leading-6 text-slate-800">
                {item.student.name}
                <span className="ml-2 text-sm font-bold text-slate-500">{item.student.studentId}</span>
              </h4>
            </div>
            <div className="shrink-0 rounded-md bg-[#F7F9FC] px-3 py-2 text-right">
              <div className="text-xs font-bold text-slate-500">本次</div>
              <div className="mt-1 text-xl font-extrabold text-slate-800">{formatScore(item.student.currentScore)}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-[#F7F9FC] px-3 py-2">
              <div className="text-xs font-bold text-slate-500">基准分</div>
              <div className="mt-1 font-extrabold text-slate-800">{formatScore(item.student.baselineScore)}</div>
            </div>
            <div className="rounded-md bg-[#F7F9FC] px-3 py-2">
              <div className="text-xs font-bold text-slate-500">排名变化</div>
              <div className="mt-1 font-extrabold text-[#2F4F68]">{formatRankChange(item.student.rankChange)}</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1">
            {item.evidenceTags.map((tag) => (
              <span key={tag} className="rounded-md bg-[#EEF4F8] px-2 py-1 text-xs font-bold text-[#2F4F68]">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
            <div>
              <div className="text-xs font-bold text-slate-500">关注理由</div>
              <p>{item.reason}</p>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">建议动作</div>
              <p>{item.action}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function FocusPage({ params }: FocusPageProps) {
  const { gradeReportId } = await params;
  const reportData = await readGradeReportData(gradeReportId).catch(() => null);
  if (!reportData) notFound();

  const focusReports = buildFocusReports(reportData.classes);
  const totalCount = focusReports.reduce((sum, report) => sum + report.students.length, 0);
  const copyText = focusReports.length > 0
    ? [`加强关注名单（${totalCount}人）`, ...focusReports.map(formatClassCopyText)].join("\n\n")
    : "暂无加强关注候选。";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F9FC] px-4 py-6 sm:px-5 sm:py-8">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#D0D7DE] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-[#2F4F68]">老师日常投入优先级</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-800">加强关注名单</h1>
            <p className="mt-2 text-slate-600">先判断班级状态，再确定本周最值得投入的 5 人。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CopyButton text={copyText} label="复制全部名单" />
            <Link href={`/grade-reports/${gradeReportId}`} className="focus-ring rounded-md border border-[#9fb3c4] bg-white px-4 py-3 text-sm font-bold text-[#2F4F68] hover:bg-[#F3F6FA]">
              返回成绩分析
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-md border border-[#D0D7DE] bg-white p-5 text-sm leading-7 text-slate-600 shadow-sm">
          <b className="text-slate-800">选择逻辑：</b>
          先判断班级策略：未及格和 50-59 分临界学生多时保及格优先，60-75 分段明显退步多时防下滑优先，及格压力较小时再补充冲优秀。
          每班主名单 5 人，前 3 人是重点盯，后 2 人是顺手关注。
          同一目标内排序时，先看离目标线有多近，再看排名状态是否回升或下滑，最后看基准分是否说明有拉回来的可能；所以主名单更重视当前可推动性，候补再保留基准潜力较强但当前状态较弱的学生。
        </div>

        <div className="space-y-6">
          {focusReports.map((focusReport) => {
            const classCopyText = formatClassCopyText(focusReport);
            const classCopyTextWithBackup = formatClassCopyTextWithBackup(focusReport);
            return (
              <section key={focusReport.className} className="min-w-0 overflow-hidden rounded-md border border-[#D0D7DE] bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-[#D0D7DE] bg-[#D9EAF7] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">{focusReport.className}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      主名单 {focusReport.students.length} 人，候补 {focusReport.backupStudents.length} 人
                      {focusReport.isShort ? "，候选不足 5 人" : ""}
                    </p>
                    <p className="mt-2 text-sm text-[#2F4F68]">
                      <b>班级策略：{focusReport.strategy}</b>｜{focusReport.strategyReason}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div className="rounded-md bg-white px-3 py-2 text-sm">重点盯 <b>{focusReport.watchStudents.length}</b></div>
                    <div className="rounded-md bg-white px-3 py-2 text-sm">顺手关注 <b>{focusReport.lightStudents.length}</b></div>
                    <div className="rounded-md bg-white px-3 py-2 text-sm">冲及格 <b>{focusReport.passCount}</b></div>
                    <div className="rounded-md bg-white px-3 py-2 text-sm">冲优秀 <b>{focusReport.excellentCount}</b></div>
                    <div className="rounded-md bg-white px-3 py-2 text-sm">防下滑 <b>{focusReport.declineCount}</b></div>
                    <CopyButton text={classCopyText} label="复制本班" />
                    {focusReport.backupStudents.length > 0 ? (
                      <CopyButton text={classCopyTextWithBackup} label="复制本班含候补" />
                    ) : null}
                  </div>
                </div>

                {focusReport.students.length === 0 ? (
                  <div className="px-4 py-10 text-center text-slate-500">本班暂无加强关注候选。</div>
                ) : (
                  <div>
                    <div className="border-b border-[#D0D7DE] bg-white px-5 py-3">
                      <h3 className="font-extrabold text-slate-800">主名单：重点盯 3 人 + 顺手关注 2 人</h3>
                    </div>
                    <FocusStudentList students={focusReport.students} />
                    {focusReport.backupStudents.length > 0 ? (
                      <details className="group border-t border-[#D0D7DE]">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-[#D0D7DE] bg-[#F7F9FC] px-5 py-3">
                          <div>
                            <h3 className="font-extrabold text-slate-800">候补关注：有余力时补充</h3>
                            <p className="mt-1 text-sm text-slate-500">共 {focusReport.backupStudents.length} 人，默认收起，点击查看。</p>
                          </div>
                          <span className="shrink-0 rounded-md border border-[#9fb3c4] bg-white px-3 py-2 text-sm font-bold text-[#2F4F68] group-open:hidden">
                            展开
                          </span>
                          <span className="hidden shrink-0 rounded-md border border-[#9fb3c4] bg-white px-3 py-2 text-sm font-bold text-[#2F4F68] group-open:inline">
                            收起
                          </span>
                        </summary>
                        <FocusStudentList students={focusReport.backupStudents} startIndex={focusReport.students.length + 1} />
                      </details>
                    ) : null}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
