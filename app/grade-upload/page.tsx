import Link from "next/link";
import { GradeUploadForm } from "@/components/GradeUploadForm";
import { readLatestGradeReportData } from "@/lib/grade-storage";

type GradeUploadPageProps = {
  searchParams?: Promise<{ mode?: string | string[] }>;
};

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", { hour12: false });
}

export default async function GradeUploadPage({ searchParams }: GradeUploadPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const showUploader = getParam(resolvedSearchParams.mode) === "new";
  const latestReport = await readLatestGradeReportData();
  const shouldShowUploader = showUploader || !latestReport;

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-5 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="mb-7 border-b border-[#D0D7DE] pb-6">
          <p className="text-sm font-bold text-[#2F4F68]">独立功能</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-normal text-slate-800">学生成绩分析</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            进入后默认显示上次生成的成绩分析。需要更新数据时，点击“上传新数据”后再上传新的成绩 Excel。
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-md border border-[#9fb3c4] bg-white px-4 text-sm font-bold text-[#2F4F68] hover:bg-[#F3F6FA]"
          >
            返回达达工作台
          </Link>
        </div>

        {!shouldShowUploader && latestReport ? (
          <section className="rounded-md border border-[#D0D7DE] bg-white p-7 shadow-sm">
            <p className="text-sm font-bold text-[#2F4F68]">上次生成的数据</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-normal text-slate-800">学生成绩分析报告</h2>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600 sm:grid-cols-2">
              <p>班级：{latestReport.classes.map((classReport) => classReport.className).join("、")}</p>
              <p>学生：共 {latestReport.summary.totalStudents} 名</p>
              <p>当前考试：{latestReport.classes.map((classReport) => classReport.currentExamLabel).join("、")}</p>
              <p>平均分：{latestReport.summary.averageScore ?? "-"}</p>
              <p className="sm:col-span-2">生成时间：{formatCreatedAt(latestReport.createdAt)}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/grade-reports/${latestReport.gradeReportId}`}
                className="focus-ring inline-flex h-11 items-center justify-center rounded-md bg-[#2F4F68] px-5 text-sm font-bold text-white hover:bg-[#263f53]"
              >
                查看上次结果
              </Link>
              <Link
                href="/grade-upload?mode=new"
                className="focus-ring inline-flex h-11 items-center justify-center rounded-md border border-[#9fb3c4] bg-white px-5 text-sm font-bold text-[#2F4F68] hover:bg-[#F3F6FA]"
              >
                上传新数据
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <GradeUploadForm />

            <aside className="rounded-md border border-[#D0D7DE] bg-[#F3F6FA] p-6">
              <h2 className="text-lg font-bold text-slate-800">成绩单格式</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>一个工作簿可以包含多个班级工作表，工作表名会作为班级名。</li>
                <li>表头需要包含“学号”“姓名”，姓名右侧为成绩列。</li>
                <li>最右侧成绩列会作为本次考试。</li>
                <li>列名包含“期中”或“期末”的成绩会作为大考基准。</li>
              </ul>
              <div className="mt-6 space-y-3 border-t border-[#D0D7DE] pt-4">
                {latestReport ? (
                  <Link href={`/grade-reports/${latestReport.gradeReportId}`} className="block text-sm font-bold text-[#2F4F68] hover:underline">
                    查看上次结果
                  </Link>
                ) : null}
                <Link href="/" className="block text-sm font-bold text-[#2F4F68] hover:underline">
                  返回工作台
                </Link>
                <Link href="/upload" className="block text-sm font-bold text-[#2F4F68] hover:underline">
                  切换到一周订正
                </Link>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
