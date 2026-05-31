import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F7F9FC] px-5 py-10">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="border-b border-[#D0D7DE] pb-6">
          <p className="text-sm font-bold text-[#2F4F68]">达达教学工具台</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-normal text-slate-800">
            一周订正与成绩分析
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            两个功能独立使用，数据互不混用。需要处理订正情况时进入“一周订正”，需要分析考试成绩时进入“成绩分析报告”。
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-md border border-[#D0D7DE] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-[#2F4F68]">订正反馈</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-normal text-slate-800">一周订正</h2>
            <p className="mt-3 min-h-24 text-sm leading-6 text-slate-600">
              上传学生订正情况 Excel，生成家长反馈图和教师内部跟进名单。适合每周检查作业订正、提醒未完成学生。
            </p>
            <Link
              href="/upload"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[#2F4F68] px-5 text-sm font-bold text-white transition hover:bg-[#244055]"
            >
              进入一周订正
            </Link>
          </section>

          <section className="rounded-md border border-[#D0D7DE] bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-[#6B5B2E]">考试分析</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-normal text-slate-800">成绩分析报告</h2>
            <p className="mt-3 min-h-24 text-sm leading-6 text-slate-600">
              上传成绩单，查看分数段、进退步、小零食奖励名单、家长沟通话术和加强关注名单。
            </p>
            <Link
              href="/grade-upload"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[#7A5C24] px-5 text-sm font-bold text-white transition hover:bg-[#604717]"
            >
              进入成绩分析
            </Link>
          </section>
        </div>
      </section>
    </main>
  );
}
