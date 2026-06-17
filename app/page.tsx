import { headers } from "next/headers";
import Link from "next/link";

type ToolCard = {
  badge: string;
  title: string;
  description: string;
  href: string;
  label: string;
  color: string;
};

const toolCards: ToolCard[] = [
  {
    badge: "订正反馈",
    title: "一周订正",
    description:
      "上传学生订正情况 Excel，生成家长反馈图和教师内部跟进清单。",
    href: "/upload",
    label: "进入一周订正",
    color: "#0EA5E9",
  },
  {
    badge: "考试分析",
    title: "成绩分析报告",
    description:
      "上传成绩单，查看分数段、进退步、小领奖励名单和加强关注名单。",
    href: "/grade-upload",
    label: "进入成绩分析",
    color: "#F59E0B",
  },
  {
    badge: "课题研究",
    title: "课题申报助手",
    description:
      "从课题想法生成申报书框架，对已有草稿进行整体诊断、逐栏打磨和模拟专家预审。",
    href: "/proposal-helper",
    label: "进入课题申报助手",
    color: "#22C55E",
  },
  {
    badge: "论文标题",
    title: "标题优化门诊",
    description:
      "上传论文 Word，提取大标题和小标题，按专家规则生成改前改后的标题层级对比。",
    href: "/title-clinic",
    label: "进入标题优化",
    color: "#8B5CF6",
  },
];

type Variant = {
  eyebrow: string;
  title: string;
  intro: string;
  note: string;
};

const weTeach: Variant = {
  eyebrow: "Teaching Tools",
  title: "达达教学工具台",
  intro:
    "面向教学场景的独立工具入口。订正反馈、成绩分析、课题申报助手和标题优化门诊各自独立，入口统一收敛在这里。",
  note: "教育工具入口",
};

const toolou: Variant = {
  eyebrow: "Toolou",
  title: "达达工具台",
  intro: "个人品牌入口，汇总常用工具。这里保留最直接的导航，不做复杂装饰。",
  note: "个人工具入口",
};

function HomeShell({ variant }: { variant: Variant }) {
  return (
    <main className="min-h-screen bg-[#FAF9F6] px-5 py-12">
      <section className="mx-auto flex max-w-5xl flex-col gap-7">
        <div className="rounded-3xl border border-[#E8E6E1] bg-white p-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#6B7280]">
            {variant.eyebrow}
          </p>
          <h1 className="mt-3 text-[30px] font-bold tracking-[-0.03em] text-[#141413]">
            {variant.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6B7280]">
            {variant.intro}
          </p>
          <div className="mt-5 inline-flex rounded-full border border-[#E8E6E1] bg-[#FAF9F6] px-3 py-1 text-xs font-medium text-[#141413]">
            {variant.note}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {toolCards.map((card) => (
            <section
              key={card.href}
              className="rounded-2xl border border-[#E8E6E1] border-l-[4px] bg-white p-6"
              style={{ borderLeftColor: card.color }}
            >
              <p
                className="text-[11px] font-medium uppercase tracking-[0.12em]"
                style={{ color: card.color }}
              >
                {card.badge}
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-[-0.01em] text-[#141413]">
                {card.title}
              </h2>
              <p className="mt-3 min-h-[5.5rem] text-sm leading-6 text-[#6B7280]">
                {card.description}
              </p>
              <Link
                href={card.href}
                className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-[#141413] px-5 text-sm font-medium text-white transition hover:bg-[#2A2A28]"
              >
                {card.label}
              </Link>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

export default async function HomePage() {
  const host = (await headers()).get("host") ?? "";
  const current = host.includes("toolou.cn") ? toolou : weTeach;
  return <HomeShell variant={current} />;
}
