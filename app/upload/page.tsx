import Link from "next/link";
import { UploadForm } from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-[#F7F9FC] px-5 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="mb-7 border-b border-[#D0D7DE] pb-6">
          <h1 className="text-3xl font-extrabold tracking-normal text-slate-800">学生订正反馈生成器</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            请上传本周学生订正情况 Excel。系统将自动生成 1班、2班家长反馈图，并生成教师内部跟进页。
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex h-11 items-center justify-center rounded-md border border-[#9fb3c4] bg-white px-4 text-sm font-bold text-[#2F4F68] hover:bg-[#F3F6FA]"
          >
            返回达达工作台
          </Link>
        </div>

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
              <Link href="/" className="block text-sm font-bold text-[#2F4F68] hover:underline">
                返回工具台
              </Link>
              <Link href="/grade-upload" className="block text-sm font-bold text-[#2F4F68] hover:underline">
                切换到成绩分析报告
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
