import Link from "next/link";
import { TeacherPasswordGate } from "@/components/TeacherPasswordGate";

type TeacherPageProps = {
  params: Promise<{ reportId: string }>;
};

export default async function TeacherFollowUpPage({ params }: TeacherPageProps) {
  const { reportId } = await params;

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-5 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between border-b border-[#E8E6E1] pb-5">
          <div>
            <p className="text-sm font-bold text-[#141413]">仅教师本人查看</p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#141413]">教师内部跟进页</h1>
          </div>
          <Link href="/" className="focus-ring rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-bold text-[#141413] hover:bg-[#FAF9F6]">
            返回达达工作台
          </Link>
          <Link href={`/reports/${reportId}`} className="focus-ring rounded-md border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-bold text-[#141413] hover:bg-[#FAF9F6]">
            返回结果页
          </Link>
        </div>
        <TeacherPasswordGate reportId={reportId} />
      </section>
    </main>
  );
}
