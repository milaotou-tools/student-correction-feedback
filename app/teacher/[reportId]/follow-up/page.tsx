import Link from "next/link";
import { TeacherPasswordGate } from "@/components/TeacherPasswordGate";

type TeacherPageProps = {
  params: Promise<{ reportId: string }>;
};

export default async function TeacherFollowUpPage({ params }: TeacherPageProps) {
  const { reportId } = await params;

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-5 py-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between border-b border-[#D0D7DE] pb-5">
          <div>
            <p className="text-sm font-bold text-[#2F4F68]">仅教师本人查看</p>
            <h1 className="mt-1 text-3xl font-extrabold text-slate-800">教师内部跟进页</h1>
          </div>
          <Link href={`/reports/${reportId}`} className="focus-ring rounded-md border border-[#9fb3c4] bg-white px-4 py-2 text-sm font-bold text-[#2F4F68] hover:bg-[#F3F6FA]">
            返回结果页
          </Link>
        </div>
        <TeacherPasswordGate reportId={reportId} />
      </section>
    </main>
  );
}
