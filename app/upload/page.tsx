import Link from "next/link";
import { UploadForm } from "@/components/UploadForm";
import { readLatestReportData } from "@/lib/storage";

type UploadPageProps = {
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

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const showUploader = getParam(resolvedSearchParams.mode) === "new";
  const latestReport = await readLatestReportData();
  const shouldShowUploader = showUploader || !latestReport;
  const studentCount = latestReport?.classes.reduce((sum, classReport) => sum + classReport.students.length, 0) ?? 0;

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-5 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="mb-7 border-b border-[#D0D7DE] pb-6">
          <h1 className="text-3xl font-extrabold tracking-normal text-slate-800">学生订正反馈生成器</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            进入后默认显示上次生成的反馈图。需要更新本周数据时，点击“上传新数据”后再上传新的 Excel。
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
            <h2 className="mt-2 text-2xl font-extrabold tracking-normal text-slate-800">学生一周订正情况反馈</h2>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-600 sm:grid-cols-2">
              <p>周次：{latestReport.weekLabel}</p>
              <p>日期范围：{latestReport.dateRange}</p>
              <p>班级：{latestReport.classes.map((classReport) => classReport.className).join("、")}</p>
              <p>学生：共 {studentCount} 名</p>
              <p className="sm:col-span-2">生成时间：{formatCreatedAt(latestReport.createdAt)}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/reports/${latestReport.reportId}`}
                className="focus-ring inline-flex h-11 items-center justify-center rounded-md bg-[#2F4F68] px-5 text-sm font-bold text-white hover:bg-[#263f53]"
              >
                查看上次结果
              </Link>
              <Link
                href="/upload?mode=new"
                className="focus-ring inline-flex h-11 items-center justify-center rounded-md border border-[#9fb3c4] bg-white px-5 text-sm font-bold text-[#2F4F68] hover:bg-[#F3F6FA]"
              >
                上传新数据
              </Link>
            </div>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <UploadForm />

            <aside className="rounded-md border border-[#D0D7DE] bg-[#F3F6FA] p-6">
              <h2 className="text-lg font-bold text-slate-800">Excel 格式要求</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>工作表名称包含“1班”“2班”。</li>
                <li>表头包含“学号”“姓名”和 5 个日期列。</li>
                <li>状态支持：满分、已订正、已交、未交。</li>
                <li>系统会自动忽略空白行，并提示未知状态。</li>
              </ul>
              <div className="mt-6 space-y-3 border-t border-[#D0D7DE] pt-4">
                {latestReport ? (
                  <Link href={`/reports/${latestReport.reportId}`} className="block text-sm font-bold text-[#2F4F68] hover:underline">
                    查看上次结果
                  </Link>
                ) : null}
                <Link href="/" className="block text-sm font-bold text-[#2F4F68] hover:underline">
                  返回工作台
                </Link>
                <Link href="/grade-upload" className="block text-sm font-bold text-[#2F4F68] hover:underline">
                  切换到成绩分析
                </Link>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
