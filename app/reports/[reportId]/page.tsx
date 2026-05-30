import Link from "next/link";
import { notFound } from "next/navigation";
import { getGroupMessage } from "@/lib/report-utils";
import { getClassDownloadUrl, getClassImageUrl, readReportData } from "@/lib/storage";

type ReportPageProps = {
  params: Promise<{ reportId: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { reportId } = await params;
  const reportData = await readReportData(reportId).catch(() => null);
  if (!reportData) notFound();

  const groupMessage = getGroupMessage();

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-6 sm:px-5 sm:py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#D0D7DE] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">学生一周订正情况反馈</h1>
            <p className="mt-2 text-slate-600">
              {reportData.weekLabel}｜日期范围：{reportData.dateRange}
            </p>
          </div>
          <Link
            href={`/teacher/${reportId}/follow-up`}
            className="focus-ring rounded-md border border-[#9fb3c4] bg-white px-4 py-3 text-sm font-bold text-[#2F4F68] hover:bg-[#F3F6FA]"
          >
            进入教师跟进页
            <span className="ml-2 font-normal text-slate-500">仅教师本人查看</span>
          </Link>
        </div>

        {reportData.warnings.length > 0 ? (
          <div className="mb-6 rounded-md border border-[#E3C15B] bg-[#FFF8E1] px-4 py-3 text-sm leading-6 text-[#7A5C00]">
            {reportData.warnings.map((warning) => (
              <div key={warning}>{warning}</div>
            ))}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          {reportData.classes.map((classReport, index) => {
            const imageUrl = getClassImageUrl(reportId, classReport.className, index);
            return (
              <section
                key={classReport.className}
                className="rounded-md border border-[#D0D7DE] bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">{classReport.className}反馈图</h2>
                    <p className="mt-1 text-sm text-slate-500">共 {classReport.students.length} 名学生</p>
                  </div>
                  <a
                    href={getClassDownloadUrl(reportId, classReport.className, index)}
                    className="focus-ring rounded-md bg-[#2F4F68] px-4 py-2 text-sm font-bold text-white hover:bg-[#263f53]"
                  >
                    下载 {classReport.className}反馈图
                  </a>
                </div>

                <div className="rounded-md border border-[#D0D7DE] bg-[#F7F9FC] p-2 sm:p-3">
                  <img
                    src={imageUrl}
                    alt={`${classReport.className}反馈图预览`}
                    className="block h-auto w-full rounded-sm shadow-sm"
                    loading="eager"
                    decoding="async"
                  />
                </div>

                <div className="mt-4 rounded-md border border-[#D0D7DE] bg-[#F7F9FC] p-4">
                  <h3 className="mb-2 font-bold text-slate-800">{classReport.className}建议发群文案</h3>
                  <p className="text-sm leading-6 text-slate-600">{groupMessage}</p>
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
