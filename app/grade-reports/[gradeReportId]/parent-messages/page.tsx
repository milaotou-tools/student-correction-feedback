import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/CopyButton";
import { buildParentMessageGroups, formatParentMessageGroup } from "@/lib/grade-parent-messages";
import { readGradeReportData } from "@/lib/grade-storage";
import type { ParentMessageGroup } from "@/lib/grade-parent-messages";
import type { GradeStudentRecord } from "@/lib/grade-types";

type ParentMessagesPageProps = {
  params: Promise<{ gradeReportId: string }>;
};

function formatStudentMeta(student: GradeStudentRecord): string {
  const score = student.currentScore === null ? "-" : `${student.currentScore}分`;
  const rankChange = student.rankChange === null
    ? "无排名变化"
    : student.rankChange > 0
      ? `进步${student.rankChange}名`
      : student.rankChange < 0
        ? `退步${Math.abs(student.rankChange)}名`
        : "排名持平";
  const scoreChange = student.scoreChange === null
    ? ""
    : student.scoreChange > 0
      ? `，提分${student.scoreChange}`
      : student.scoreChange < 0
        ? `，降分${Math.abs(student.scoreChange)}`
        : "，分数持平";
  return `${student.className}｜${score}｜${rankChange}${scoreChange}`;
}

function formatSectionText(title: string, groups: ParentMessageGroup[]): string {
  if (groups.length === 0) return `${title}\n暂无`;
  return [title, ...groups.map(formatParentMessageGroup)].join("\n\n");
}

function MessageGroupCard({ group }: { group: ParentMessageGroup }) {
  const groupText = formatParentMessageGroup(group);

  return (
    <section className="min-w-0 rounded-md border border-[#D0D7DE] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#D0D7DE] bg-[#D9EAF7] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">{group.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{group.description}｜{group.students.length} 人</p>
        </div>
        <CopyButton text={groupText} label="复制本组" />
      </div>
      <div className="p-5">
        <div className="mb-4 rounded-md border border-[#D0D7DE] bg-[#F7F9FC] p-4">
          <h3 className="font-extrabold text-slate-800">统一话术</h3>
          <p className="mt-2 text-sm leading-7 text-slate-700">{group.message}</p>
        </div>
        <div>
          <h3 className="mb-3 font-extrabold text-slate-800">适用学生</h3>
          <div className="flex flex-wrap gap-2">
            {group.students.map((student) => (
              <span
                key={`${student.className}-${student.studentId}-${student.name}`}
                title={formatStudentMeta(student)}
                className="inline-flex rounded-md border border-[#D0D7DE] bg-white px-3 py-2 text-sm font-bold text-slate-700"
              >
                {student.className} {student.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function ParentMessagesPage({ params }: ParentMessagesPageProps) {
  const { gradeReportId } = await params;
  const reportData = await readGradeReportData(gradeReportId).catch(() => null);
  if (!reportData) notFound();

  const messageGroups = buildParentMessageGroups(reportData.classes);
  const mustGroups = messageGroups.filter((group) => group.section === "must");
  const positiveGroups = messageGroups.filter((group) => group.section === "positive");
  const mustStudentCount = mustGroups.reduce((sum, group) => sum + group.students.length, 0);
  const positiveStudentCount = positiveGroups.reduce((sum, group) => sum + group.students.length, 0);
  const messageStudentCount = mustStudentCount + positiveStudentCount;
  const copyText = messageGroups.length > 0
    ? [
      `本次家长沟通话术（${messageStudentCount}人，${messageGroups.length}组）`,
      formatSectionText(`必须沟通（${mustStudentCount}人）`, mustGroups),
      formatSectionText(`正向反馈（${positiveStudentCount}人）`, positiveGroups)
    ].join("\n\n")
    : "本次暂无需要家长沟通反馈的学生。";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F7F9FC] px-4 py-6 sm:px-5 sm:py-8">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#D0D7DE] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold text-[#2F4F68]">仅用于教师沟通准备</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-800">家长沟通话术</h1>
            <p className="mt-2 text-slate-600">相似情况合并成同一套话术，分为必须沟通和正向反馈。</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CopyButton text={copyText} label="复制全部话术" />
            <Link href={`/grade-reports/${gradeReportId}`} className="focus-ring rounded-md border border-[#9fb3c4] bg-white px-4 py-3 text-sm font-bold text-[#2F4F68] hover:bg-[#F3F6FA]">
              返回成绩分析
            </Link>
          </div>
        </div>

        {messageGroups.length === 0 ? (
          <div className="rounded-md border border-[#D0D7DE] bg-white px-4 py-10 text-center text-slate-500 shadow-sm">本次暂无需要家长沟通反馈的学生。</div>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800">必须沟通</h2>
                  <p className="mt-1 text-sm text-slate-600">低分、明显退步、边缘下滑优先处理。</p>
                </div>
                <CopyButton text={formatSectionText(`必须沟通（${mustStudentCount}人）`, mustGroups)} label="复制必须沟通" />
              </div>
              <div className="space-y-6">
                {mustGroups.length === 0 ? (
                  <div className="rounded-md border border-[#D0D7DE] bg-white px-4 py-8 text-center text-slate-500 shadow-sm">本次暂无必须沟通学生。</div>
                ) : (
                  mustGroups.map((group) => <MessageGroupCard key={group.id} group={group} />)
                )}
              </div>
            </section>

            <section>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-800">正向反馈</h2>
                  <p className="mt-1 text-sm text-slate-600">进步明显的学生可选发给家长，主要用于肯定和鼓励。</p>
                </div>
                <CopyButton text={formatSectionText(`正向反馈（${positiveStudentCount}人）`, positiveGroups)} label="复制正向反馈" />
              </div>
              <div className="space-y-6">
                {positiveGroups.length === 0 ? (
                  <div className="rounded-md border border-[#D0D7DE] bg-white px-4 py-8 text-center text-slate-500 shadow-sm">本次暂无正向反馈学生。</div>
                ) : (
                  positiveGroups.map((group) => <MessageGroupCard key={group.id} group={group} />)
                )}
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
