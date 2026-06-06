import { headers } from "next/headers";
import Link from "next/link";

type HomeVariant = {
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  accent: string;
};

const defaultVariant: HomeVariant = {
  eyebrow: "Teaching Tools",
  title: "达达教学工具台",
  subtitle: "面向教学场景的独立工具入口",
  intro:
    "订正反馈、成绩分析和课题申报助手各自独立，入口统一收敛在这里，便于按域名分发和按功能维护。",
  accent: "教育工具入口",
};

const toolouVariant: HomeVariant = {
  eyebrow: "Toolou",
  title: "达达工具台",
  subtitle: "个人品牌入口，汇总所有常用工具",
  intro:
    "这里聚合你常用的教学与研究工具，方便从一个品牌入口进入不同服务，不再在多个站点之间来回切换。",
  accent: "个人工具入口",
};

const cards = [
  {
    badge: "订正反馈",
    title: "一周订正",
    description:
      "上传学生订正情况 Excel，生成家长反馈图和教师内部跟进清单。",
    href: "/upload",
    label: "进入一周订正",
    color: "#0070F3",
  },
  {
    badge: "考试分析",
    title: "成绩分析报告",
    description:
      "上传成绩单，查看分数段、进退步、小领奖励名单和加强关注名单。",
    href: "/grade-upload",
    label: "进入成绩分析",
    color: "#D97706",
  },
  {
    badge: "课题研究",
    title: "课题申报助手",
    description:
      "从课题想法生成申报书框架，对已有草稿进行整体诊断、逐栏打磨和模拟专家预审。",
    href: "/proposal-helper",
    label: "进入课题申报助手",
    color: "#16A34A",
  },
] as const;

function getVariant(host: string): HomeVariant {
  if (host.includes("toolou.cn")) {
    return toolouVariant;
  }
  return defaultVariant;
}

export default async function HomePage() {
  const host = (await headers()).get("host") ?? "";
  const variant = getVariant(host);

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-5 py-12">
      <section className="mx-auto flex max-w-4xl flex-col gap-8">
        <div className="border-b border-[#E8E6E1] pb-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#6B7280]">
            {variant.eyebrow}
          </p>
          <h1 className="mt-3 text-[28px] font-bold tracking-[-0.02em] text-[#141413]">
            {variant.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6B7280]">
            {variant.subtitle}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6B7280]">
            {variant.intro}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <section
              key={card.href}
              className="rounded-md border border-[#E8E6E1] border-l-[3px] bg-white p-6"
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
                className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-[#141413] px-5 text-sm font-medium text-white transition hover:bg-[#2A2A28]"
              >
                {card.label}
              </Link>
            </section>
          ))}
        </div>

        <div className="rounded-md border border-[#E8E6E1] bg-white px-5 py-4 text-sm leading-6 text-[#6B7280]">
          当前访问域名：
          <span className="ml-2 font-medium text-[#141413]">
            {host || "localhost"}
          </span>
          <span className="ml-2 text-[#9CA3AF]">|</span>
          <span className="ml-2 text-[#141413]">{variant.accent}</span>
        </div>
      </section>
    </main>
  );
}
