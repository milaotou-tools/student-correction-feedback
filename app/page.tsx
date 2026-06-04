import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#FAF9F6] px-5 py-12">
      <section className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="border-b border-[#E8E6E1] pb-6">
          <p className="text-[11px] font-medium tracking-[0.15em] text-[#6B7280] uppercase">
            Teaching Tools
          </p>
          <h1 className="mt-3 text-[28px] font-bold tracking-[-0.02em] text-[#141413]">
            达达教学工具台
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6B7280]">
            三个功能独立使用，数据互不混用。需要处理订正情况时进入"一周订正"，需要分析考试成绩时进入"成绩分析报告"，需要整理课题申报思路时进入"课题申报小助手"。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <section className="rounded-md border border-[#E8E6E1] bg-white p-6">
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#6B7280] uppercase">
              订正反馈
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.01em] text-[#141413]">
              一周订正
            </h2>
            <p className="mt-3 min-h-[5.5rem] text-sm leading-6 text-[#6B7280]">
              上传学生订正情况 Excel，生成家长反馈图和教师内部跟进名单。
            </p>
            <Link
              href="/upload"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#141413] px-5 text-sm font-medium text-white transition hover:bg-[#2A2A28]"
            >
              进入一周订正
            </Link>
          </section>

          <section className="rounded-md border border-[#E8E6E1] bg-white p-6">
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#6B7280] uppercase">
              考试分析
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.01em] text-[#141413]">
              成绩分析报告
            </h2>
            <p className="mt-3 min-h-[5.5rem] text-sm leading-6 text-[#6B7280]">
              上传成绩单，查看分数段、进退步、小零食奖励名单和加强关注名单。
            </p>
            <Link
              href="/grade-upload"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#141413] px-5 text-sm font-medium text-white transition hover:bg-[#2A2A28]"
            >
              进入成绩分析
            </Link>
          </section>

          <section className="rounded-md border border-[#E8E6E1] bg-white p-6">
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#6B7280] uppercase">
              课题研究
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-[-0.01em] text-[#141413]">
              课题申报小助手
            </h2>
            <p className="mt-3 min-h-[5.5rem] text-sm leading-6 text-[#6B7280]">
              从课题想法生成申报书框架，对已有草稿进行整体诊断、逐栏打磨和模拟专家预审。
            </p>
            <Link
              href="/proposal-helper"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#141413] px-5 text-sm font-medium text-white transition hover:bg-[#2A2A28]"
            >
              进入课题申报小助手
            </Link>
          </section>
        </div>
      </section>
    </main>
  );
}
