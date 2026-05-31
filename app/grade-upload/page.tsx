import Link from "next/link";
import { GradeUploadForm } from "@/components/GradeUploadForm";

export default function GradeUploadPage() {
  return (
    <main className="min-h-screen bg-[#F7F9FC] px-5 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="mb-7 border-b border-[#D0D7DE] pb-6">
          <p className="text-sm font-bold text-[#2F4F68]">独立功能</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-normal text-slate-800">学生成绩分析</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            上传成绩单后，系统会按最新成绩统计分数段，并用“大考 + 最近过程性考试”的折合基准判断学生进步和退步。
          </p>
        </div>

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
              <Link href="/" className="block text-sm font-bold text-[#2F4F68] hover:underline">
                返回工具台
              </Link>
              <Link href="/upload" className="block text-sm font-bold text-[#2F4F68] hover:underline">
                切换到一周订正
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
