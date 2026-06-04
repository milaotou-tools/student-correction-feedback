import Link from "next/link";
import { notFound } from "next/navigation";
import { getGroupMessage } from "@/lib/report-utils";
import { getClassImageUrl, markLatestReport, readReportData } from "@/lib/storage";

type ReportPageProps = {
  params: Promise<{ reportId: string }>;
};

export default async function ReportPage({ params }: ReportPageProps) {
  const { reportId } = await params;
  const reportData = await readReportData(reportId).catch(() => null);
  if (!reportData) notFound();
  await markLatestReport(reportData).catch(() => undefined);

  const groupMessage = getGroupMessage();

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-4 py-6 sm:px-5 sm:py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-[#E8E6E1] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#141413]">学生一周订正情况反馈</h1>
            <p className="mt-2 text-[#6B7280]">
              {reportData.weekLabel}｜日期范围：{reportData.dateRange}
            </p>
          </div>
          <Link
            href="/"
            className="focus-ring rounded-md border border-[#D1D5DB] bg-white px-4 py-3 text-sm font-bold text-[#141413] hover:bg-[#FAF9F6]"
          >
            返回达达工作台
          </Link>
          <Link
            href={`/teacher/${reportId}/follow-up`}
            className="focus-ring rounded-md border border-[#D1D5DB] bg-white px-4 py-3 text-sm font-bold text-[#141413] hover:bg-[#FAF9F6]"
          >
            进入教师跟进页
            <span className="ml-2 font-normal text-[#6B7280]">仅教师本人查看</span>
          </Link>
        </div>

        {reportData.warnings.length > 0 ? (
          <div className="mb-6 rounded-md border border-[#E8C54A] bg-[#FEF9EC] px-4 py-3 text-sm leading-6 text-[#7A6000]">
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
                className="rounded-md border border-[#E8E6E1] bg-white p-4 sm:p-5"
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold text-[#141413]">{classReport.className}反馈图</h2>
                    <p className="mt-1 text-sm text-[#6B7280]">共 {classReport.students.length} 名学生</p>
                  </div>
                </div>

                <div className="rounded-md border border-[#E8E6E1] bg-[#FAF9F6] p-2 sm:p-3">
                  <img
                    src={imageUrl}
                    alt={`${classReport.className}反馈图预览`}
                    className="block h-auto w-full rounded-sm"
                    loading="eager"
                    decoding="async"
                  />
                </div>

                <div className="mt-4 rounded-md border border-[#E8E6E1] bg-[#FAF9F6] p-4">
                  <h3 className="mb-2 font-bold text-[#141413]">{classReport.className}建议发群文案</h3>
                  <p className="text-sm leading-6 text-[#6B7280]">{groupMessage}</p>
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
