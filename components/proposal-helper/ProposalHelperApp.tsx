"use client";

import { useEffect, useMemo, useState } from "react";

type FrameworkForm = {
  stageSubject: string;
  idea: string;
  problem: string;
  researchObjects: string;
  practiceBase: string;
  expectedOutputs: string;
};

type Mode = "framework" | "draft";
type ResultBlock = {
  title: string;
  text: string;
};

type LastAction = {
  title: string;
  action: () => Promise<string>;
};

type HealthStatus = {
  ok: boolean;
  provider: string;
  model: string;
  baseUrl: string;
  keyConfigured: boolean;
};

const emptyFrameworkForm: FrameworkForm = {
  stageSubject: "",
  idea: "",
  problem: "",
  researchObjects: "",
  practiceBase: "",
  expectedOutputs: ""
};

const examples: Array<{ label: string; value: FrameworkForm }> = [
  {
    label: "数学概念图",
    value: {
      stageSubject: "小学数学",
      idea: "AI 辅助学生画数学概念图",
      problem: "学生复习时知识点零散，难以形成结构化理解",
      researchObjects: "六年级学生",
      practiceBase: "尝试过概念图作业和单元复习题型整理",
      expectedOutputs: "课题报告、概念图作业样例、课堂案例、学生作品集"
    }
  },
  {
    label: "班级习惯",
    value: {
      stageSubject: "班级管理",
      idea: "低段学生班级习惯培养",
      problem: "低段班级常规培养差异较大，新教师缺少清晰操作指引",
      researchObjects: "一、二年级学生和新手班主任",
      practiceBase: "已有部分优秀班主任经验和常规管理做法",
      expectedOutputs: "班级习惯培养操作卡、案例集、家校沟通话术"
    }
  },
  {
    label: "应用题错题",
    value: {
      stageSubject: "小学数学",
      idea: "应用题错题分类与复习改进",
      problem: "学生应用题错误多，教师复习时容易按题目顺序讲，缺少题型归类",
      researchObjects: "六年级学生",
      practiceBase: "已经整理过应用题题型和类似题训练",
      expectedOutputs: "题型分类表、复习课例、错题分析报告、练习资源包"
    }
  }
];

const draftExamples: Array<{ label: string; value: string; scope: string }> = [
  {
    label: "完整草稿",
    scope: "整体诊断",
    value: [
      "课题名称：人工智能支持小学数学概念图学习的实践研究",
      "",
      "选题依据：当前小学数学复习中，学生对知识点的掌握比较零散，不能很好地把单元知识联系起来。随着人工智能技术的发展，教师可以借助 AI 工具帮助学生整理知识结构，提高学生的数学学习能力。本课题拟研究人工智能在小学数学概念图学习中的应用，促进学生核心素养发展。",
      "",
      "研究目标：",
      "1. 探索 AI 辅助学生绘制数学概念图的方法。",
      "2. 提高学生数学复习效率和知识整理能力。",
      "3. 形成可推广的课堂教学模式。",
      "",
      "研究内容：",
      "1. AI 工具支持概念图绘制的策略研究。",
      "2. 概念图在单元复习中的应用研究。",
      "3. 学生数学思维能力提升研究。",
      "",
      "研究方法：行动研究法、案例研究法、问卷调查法。",
      "",
      "预期成果：课题报告、课堂案例、学生作品。"
    ].join("\n")
  },
  {
    label: "研究内容片段",
    scope: "研究内容",
    value: [
      "课题名称：低段学生班级习惯培养的实践研究",
      "",
      "研究内容：",
      "本课题主要研究低段学生班级习惯培养的有效策略。通过对一、二年级学生的观察，分析学生在课堂纪律、作业习惯、排队习惯、卫生习惯等方面存在的问题。结合优秀班主任经验，探索适合低段学生的班级管理方法，形成一套低段学生习惯培养路径，帮助新手班主任提高班级管理能力。",
      "",
      "研究方法：",
      "采用行动研究法、经验总结法和案例研究法。"
    ].join("\n")
  },
  {
    label: "预审草稿",
    scope: "整体诊断",
    value: [
      "课题名称：小学数学应用题错题分类与复习改进研究",
      "",
      "选题依据：六年级学生在应用题学习中错误比较多，教师复习时往往按照试卷顺序讲解，缺少系统分类，学生容易重复犯错。因此有必要开展应用题错题分类与复习改进研究。",
      "",
      "研究目标：通过研究，提高学生应用题解题能力，促进教师复习课教学改进，形成有效的应用题复习模式。",
      "",
      "研究内容：一是整理学生应用题错题；二是分析错因；三是设计复习课；四是总结经验。",
      "",
      "实施步骤：第一阶段准备资料，第二阶段开展课堂实践，第三阶段总结成果。",
      "",
      "预期成果：形成课题报告、题型分类表、复习课例、错题分析报告。"
    ].join("\n")
  }
];

const draftScopes = [
  "整体诊断",
  "课题名称",
  "选题依据",
  "研究目标",
  "研究内容",
  "研究方法",
  "实施步骤",
  "预期成果",
  "创新点"
];

const loadingSteps = ["正在分析输入", "正在整理栏目", "正在生成修改建议"];

function apiUrl(path: string) {
  if (typeof window === "undefined") {
    return path;
  }

  return path;
}

async function postAi(path: string, payload: Record<string, string>) {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = (await response.json()) as { text?: string; error?: string };

  if (!response.ok || !data.text) {
    throw new Error(data.error || "生成失败，请稍后重试。");
  }

  return data.text;
}

async function getHealth() {
  const response = await fetch(apiUrl("/api/proposal-helper/health"), { cache: "no-store" });
  const data = (await response.json()) as HealthStatus;

  if (!response.ok) {
    throw new Error("接口检查失败，请稍后重试。");
  }

  return data;
}

export function ProposalHelperApp() {
  const [mode, setMode] = useState<Mode>("framework");
  const [frameworkForm, setFrameworkForm] = useState<FrameworkForm>(emptyFrameworkForm);
  const [draft, setDraft] = useState("");
  const [scope, setScope] = useState("整体诊断");
  const [result, setResult] = useState<ResultBlock | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState("");
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const resultText = result?.text ?? "";
  const activeHint = useMemo(() => {
    if (mode === "framework") {
      return "把零散想法整理成申报书基本框架，适合还没有完整草稿时使用。";
    }

    return "先诊断问题，再按栏目打磨，也可以直接生成模拟专家预审意见。";
  }, [mode]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingStepIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingStepIndex((current) => (current + 1) % loadingSteps.length);
    }, 1600);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  function updateFrameworkField(field: keyof FrameworkForm, value: string) {
    setFrameworkForm((current) => ({ ...current, [field]: value }));
  }

  async function runAction(title: string, action: () => Promise<string>) {
    setLastAction({ title, action });
    setIsLoading(true);
    setError("");

    try {
      const text = await action();
      setResult({ title, text });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "生成失败，请稍后重试。";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function generateFramework() {
    if (!frameworkForm.idea.trim() || !frameworkForm.problem.trim()) {
      setError("请先填写“初步课题想法”和“当前遇到的教育教学问题”。");
      return;
    }

    void runAction("从课题想法生成申报书框架", () => {
      const payload = { ...frameworkForm };
      return postAi("/api/proposal-helper/generate-framework", payload);
    });
  }

  async function checkHealth() {
    setIsCheckingHealth(true);
    setHealthError("");

    try {
      const data = await getHealth();
      setHealth(data);
    } catch (caught) {
      setHealth(null);
      setHealthError(caught instanceof Error ? caught.message : "接口检查失败，请稍后重试。");
    } finally {
      setIsCheckingHealth(false);
    }
  }

  function clearFrameworkForm() {
    if (!window.confirm("确定要清空当前填写内容吗？")) {
      return;
    }

    setFrameworkForm(emptyFrameworkForm);
    setResult(null);
    setError("");
  }

  function clearDraftForm() {
    if (!window.confirm("确定要清空当前草稿吗？")) {
      return;
    }

    setDraft("");
    setScope("整体诊断");
    setResult(null);
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-4 py-6 text-[#141413] sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="border-b border-[#E8E6E1] pb-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-normal text-[#141413]">课题申报小助手</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6B7280]">
                帮助教师把课题想法整理成申报书框架，并对草稿进行模拟专家预审与逐栏打磨。
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 lg:w-[340px] lg:items-end">
              <div className="flex w-full items-center justify-between gap-2 rounded-md border border-[#E8E6E1] bg-white px-3 py-2 text-xs leading-5 text-[#6B7280]">
                <span className="min-w-0 truncate">
                  <span className="font-bold text-[#141413]">演示状态：</span>
                  {health ? (health.keyConfigured ? "模型已就绪" : "模型未配置") : "未检查"}
                  {health ? (
                    <span className={health.keyConfigured ? "ml-2 font-bold text-[#141413]" : "ml-2 font-bold text-red-600"}>
                      {health.keyConfigured ? health.model : "请检查环境变量"}
                    </span>
                  ) : null}
                  {healthError ? <span className="ml-2 font-bold text-red-600">{healthError}</span> : null}
                </span>
                <button
                  type="button"
                  onClick={checkHealth}
                  disabled={isCheckingHealth}
                  className="focus-ring h-8 shrink-0 rounded-md border border-[#D1D5DB] bg-white px-3 text-xs font-bold text-[#141413] transition hover:bg-[#F3F2EF] disabled:cursor-not-allowed disabled:border-[#E8E6E1] disabled:text-[#9CA3AF]"
                >
                  {isCheckingHealth ? "检查中..." : "演示前检查"}
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2">
          <ModeButton
            active={mode === "framework"}
            title="我还没有申报书"
            description="从想法生成框架"
            onClick={() => setMode("framework")}
          />
          <ModeButton
            active={mode === "draft"}
            title="我已经有草稿"
            description="模拟专家预审 + 逐栏打磨"
            onClick={() => setMode("draft")}
          />
        </section>

        <p className="text-sm leading-6 text-[#6B7280]">{activeHint}</p>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-md border border-[#E8E6E1] bg-white p-5">
            {mode === "framework" ? (
              <FrameworkPanel
                form={frameworkForm}
                onChange={updateFrameworkField}
                onUseExample={(value) => {
                  setFrameworkForm(value);
                  setResult(null);
                  setError("");
                }}
                onGenerate={generateFramework}
                onClear={clearFrameworkForm}
                isLoading={isLoading}
              />
            ) : (
              <DraftPanel
                draft={draft}
                scope={scope}
                onDraftChange={setDraft}
                onScopeChange={setScope}
                onUseDraftExample={(example) => {
                  setDraft(example.value);
                  setScope(example.scope);
                  setResult(null);
                  setError("");
                }}
                onReview={() =>
                  runAction("申报书草稿问题诊断", () => {
                    const payload = { draft, scope };
                    return postAi("/api/proposal-helper/review-draft", payload);
                  })
                }
                onPolish={() =>
                  runAction("申报书逐栏打磨", () => {
                    const payload = { draft, section: scope };
                    return postAi("/api/proposal-helper/polish-section", payload);
                  })
                }
                onExpertReview={() =>
                  runAction("模拟专家预审", () => {
                    const payload = { draft };
                    return postAi("/api/proposal-helper/expert-review", payload);
                  })
                }
                onClear={clearDraftForm}
                isLoading={isLoading}
              />
            )}
          </div>

          <section className="min-h-[560px] rounded-md border border-[#E8E6E1] bg-white">
            <div className="flex flex-col gap-3 border-b border-[#E8E6E1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold tracking-normal text-[#141413]">{result?.title || "输出结果"}</h2>
                <p className="mt-1 text-sm text-[#6B7280]">结果仅用于辅助结构化和修改，需结合真实教学材料继续完善。</p>
              </div>
              <CopyResultButton text={resultText} />
            </div>

            {error ? (
              <div
                aria-live="polite"
                className="m-5 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm leading-6 text-[#DC2626]"
              >
                {error}
                {lastAction ? (
                  <button
                    type="button"
                    onClick={() => runAction(lastAction.title, lastAction.action)}
                    className="focus-ring ml-3 rounded-md border border-[#FCA5A5] bg-white px-3 py-1 text-sm font-bold text-[#DC2626] hover:bg-[#FEF2F2]"
                  >
                    重试
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="px-5 py-5">
              {isLoading ? (
                <div
                  aria-live="polite"
                  className="rounded-md border border-[#E8E6E1] bg-[#FAF9F6] px-4 py-8 text-center text-sm text-[#6B7280]"
                >
                  {loadingSteps[loadingStepIndex]}，请稍候...
                </div>
              ) : resultText ? (
                <MarkdownLike text={resultText} />
              ) : (
                <EmptyResult />
              )}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function ModeButton({
  active,
  title,
  description,
  onClick
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "focus-ring rounded-md border p-4 text-left transition",
        active
          ? "border-[#141413] bg-[#F3F2EF]"
          : "border-[#E8E6E1] bg-white hover:border-[#D1D5DB] hover:bg-[#FAF9F6]"
      ].join(" ")}
    >
      <span className="block text-base font-extrabold text-[#141413]">{title}</span>
      <span className="mt-1 block text-sm text-[#6B7280]">{description}</span>
    </button>
  );
}

function FrameworkPanel({
  form,
  onChange,
  onUseExample,
  onGenerate,
  onClear,
  isLoading
}: {
  form: FrameworkForm;
  onChange: (field: keyof FrameworkForm, value: string) => void;
  onUseExample: (value: FrameworkForm) => void;
  onGenerate: () => void;
  onClear: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold tracking-normal text-[#141413]">从课题想法生成框架</h2>
        <p className="mt-1 text-sm leading-6 text-[#6B7280]">尽量填写真实教学问题。信息不足时，输出会提示需补充。</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => onUseExample(example.value)}
            className="focus-ring rounded-md border border-[#E8E6E1] bg-[#FAF9F6] px-3 py-2 text-sm font-bold text-[#141413] hover:bg-[#F3F2EF]"
          >
            {example.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onClear}
          className="focus-ring rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-bold text-[#6B7280] hover:bg-[#F3F2EF]"
        >
          重新填写
        </button>
      </div>

      <TextInput
        label="学段学科"
        value={form.stageSubject}
        placeholder="例如：小学数学、小学语文、班级管理、德育、家校共育"
        onChange={(value) => onChange("stageSubject", value)}
      />
      <TextArea
        label="初步课题想法"
        required
        value={form.idea}
        placeholder="例如：我想研究 AI 怎么帮助学生画数学概念图。"
        rows={3}
        onChange={(value) => onChange("idea", value)}
      />
      <TextArea
        label="当前遇到的教育教学问题"
        required
        value={form.problem}
        placeholder="例如：学生复习时知识点零散，不能形成结构化理解。"
        rows={3}
        onChange={(value) => onChange("problem", value)}
      />
      <TextInput
        label="研究对象"
        value={form.researchObjects}
        placeholder="例如：六年级学生、低段学生、新手班主任"
        onChange={(value) => onChange("researchObjects", value)}
      />
      <TextArea
        label="已有做法或实践基础"
        value={form.practiceBase}
        placeholder="例如：已经尝试过概念图作业、AI 辅助生成练习、错题分类等。"
        rows={3}
        onChange={(value) => onChange("practiceBase", value)}
      />
      <TextArea
        label="希望形成的成果"
        value={form.expectedOutputs}
        placeholder="例如：课题报告、教学案例、作业设计样例、课堂实录、学生作品集。"
        rows={3}
        onChange={(value) => onChange("expectedOutputs", value)}
      />

      <button
        type="button"
        onClick={onGenerate}
        disabled={isLoading}
        className="focus-ring mt-1 h-11 rounded-md bg-[#141413] px-5 text-sm font-extrabold text-white transition hover:bg-[#2A2A28] disabled:cursor-not-allowed disabled:bg-[#D1D5DB]"
      >
        {isLoading ? "生成中..." : "生成申报书框架"}
      </button>
    </div>
  );
}

function DraftPanel({
  draft,
  scope,
  onDraftChange,
  onScopeChange,
  onUseDraftExample,
  onReview,
  onPolish,
  onExpertReview,
  onClear,
  isLoading
}: {
  draft: string;
  scope: string;
  onDraftChange: (value: string) => void;
  onScopeChange: (value: string) => void;
  onUseDraftExample: (example: { value: string; scope: string }) => void;
  onReview: () => void;
  onPolish: () => void;
  onExpertReview: () => void;
  onClear: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold tracking-normal text-[#141413]">申报书草稿打磨</h2>
        <p className="mt-1 text-sm leading-6 text-[#6B7280]">先看问题，再逐栏修改，最后可生成模拟专家预审意见。</p>
        <p className="mt-1 text-sm font-bold leading-6 text-[#141413]">
          建议顺序：先问题诊断，再逐栏打磨，最后模拟专家预审。
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {draftExamples.map((example) => (
          <button
            key={example.label}
            type="button"
            onClick={() => onUseDraftExample(example)}
            className="focus-ring rounded-md border border-[#E8E6E1] bg-[#FAF9F6] px-3 py-2 text-sm font-bold text-[#141413] hover:bg-[#F3F2EF]"
          >
            {example.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onClear}
          className="focus-ring rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-bold text-[#6B7280] hover:bg-[#F3F2EF]"
        >
          重新填写
        </button>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-bold text-[#141413]">打磨范围</span>
        <select
          value={scope}
          onChange={(event) => onScopeChange(event.target.value)}
          className="focus-ring h-11 rounded-md border border-[#E8E6E1] bg-white px-3 text-sm text-[#141413]"
        >
          {draftScopes.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <TextArea
        label="申报书草稿"
        value={draft}
        placeholder="可以粘贴完整申报书，也可以只粘贴某一栏内容。"
        rows={16}
        onChange={onDraftChange}
      />
      <p className="text-xs leading-5 text-[#6B7280]">
        请不要粘贴学生身份证号、手机号、家庭住址等敏感信息。
      </p>

      <div className="flex flex-col gap-2">
        <div className="grid gap-2 sm:grid-cols-3">
          <ActionButton label="问题诊断" onClick={onReview} disabled={isLoading} isLoading={isLoading} variant="primary" />
          <ActionButton
            label="逐栏打磨"
            onClick={onPolish}
            disabled={isLoading || scope === "整体诊断"}
            isLoading={isLoading}
            variant="secondary"
          />
          <ActionButton label="模拟专家预审" onClick={onExpertReview} disabled={isLoading} isLoading={isLoading} variant="warm" />
        </div>
        {scope === "整体诊断" ? (
          <p className="text-xs text-[#6B7280]">逐栏打磨需在上方选择具体栏目（如"选题依据""研究内容"等）。全文润色请用"问题诊断"了解全局问题后，再逐栏处理。</p>
        ) : null}
      </div>
    </div>
  );
}

function TextInput({
  label,
  required = false,
  value,
  placeholder,
  onChange
}: {
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-bold text-[#141413]">
        {label}
        {required ? <span className="ml-2 rounded-sm bg-[#FEF3E2] px-1.5 py-0.5 text-xs text-[#141413]">必填</span> : null}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        name={label}
        autoComplete="off"
        className="focus-ring h-11 rounded-md border border-[#E8E6E1] bg-white px-3 text-sm text-[#141413] placeholder:text-[#9CA3AF]"
      />
      {required && !value.trim() ? <span className="text-xs text-[#141413]">生成前需要填写这一项。</span> : null}
    </label>
  );
}

function TextArea({
  label,
  required = false,
  value,
  placeholder,
  rows,
  onChange
}: {
  label: string;
  required?: boolean;
  value: string;
  placeholder: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-bold text-[#141413]">
        {label}
        {required ? <span className="ml-2 rounded-sm bg-[#FEF3E2] px-1.5 py-0.5 text-xs text-[#141413]">必填</span> : null}
      </span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        name={label}
        autoComplete="off"
        className="focus-ring resize-y rounded-md border border-[#E8E6E1] bg-white px-3 py-3 text-sm leading-6 text-[#141413] placeholder:text-[#9CA3AF]"
      />
      {required && !value.trim() ? <span className="text-xs text-[#141413]">生成前需要填写这一项。</span> : null}
    </label>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  isLoading,
  variant
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
  variant: "primary" | "secondary" | "warm";
}) {
  const className =
    variant === "primary"
      ? "bg-[#141413] text-white hover:bg-[#2A2A28]"
      : variant === "warm"
        ? "border border-[#E8C54A] bg-[#FEF9EC] text-[#141413] hover:bg-[#FEF3E2]"
        : "border border-[#D1D5DB] bg-white text-[#141413] hover:bg-[#F3F2EF]";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`focus-ring h-11 rounded-md px-4 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:border-[#E8E6E1] disabled:bg-[#E8E6E1] disabled:text-[#9CA3AF] ${className}`}
    >
      {isLoading ? "处理中..." : label}
    </button>
  );
}

function CopyResultButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      className="focus-ring h-10 rounded-md border border-[#D1D5DB] bg-white px-4 text-sm font-bold text-[#141413] transition hover:bg-[#F3F2EF] disabled:cursor-not-allowed disabled:border-[#E8E6E1] disabled:text-[#9CA3AF]"
    >
      {copied ? "已复制" : "复制结果"}
    </button>
  );
}

function CopySectionButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="focus-ring rounded-md border border-[#E8E6E1] bg-white px-2 py-1 text-xs font-bold text-[#141413] hover:bg-[#F3F2EF]"
    >
      {copied ? "已复制" : "复制本栏"}
    </button>
  );
}

function splitMarkdownSections(text: string) {
  const sections: Array<{ heading: string; content: string[] }> = [];
  let current: { heading: string; content: string[] } | null = null;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
      if (current) {
        sections.push(current);
      }
      current = { heading: trimmed, content: [] };
      continue;
    }

    if (!current) {
      current = { heading: "", content: [] };
    }
    current.content.push(line);
  }

  if (current) {
    sections.push(current);
  }

  return sections;
}

function renderMarkdownLine(line: string, key: string) {
  const trimmed = line.trim();

  if (!trimmed) {
    return <div key={key} className="h-1" />;
  }

  if (trimmed.startsWith("- ") || /^\d+\.\s/.test(trimmed)) {
    return (
      <p key={key} className="pl-4 text-[#141413]">
        {trimmed}
      </p>
    );
  }

  return <p key={key}>{trimmed}</p>;
}

function MarkdownLike({ text }: { text: string }) {
  const sections = splitMarkdownSections(text);

  return (
    <article className="space-y-3 text-sm leading-7 text-[#141413]">
      {sections.map((section, sectionIndex) => {
        const headingText = section.heading.replace(/^#{1,2}\s+/, "");
        const sectionText = [headingText, ...section.content].join("\n").trim();

        return (
          <section key={`${sectionIndex}-${section.heading || "intro"}`} className="space-y-3">
            {section.heading ? (
              <div className="mt-5 flex items-center justify-between gap-3 border-b border-[#E8E6E1] pb-2">
                {section.heading.startsWith("## ") ? (
                  <h3 className="text-base font-extrabold text-[#141413]">{headingText}</h3>
                ) : (
                  <h2 className="text-lg font-extrabold text-[#141413]">{headingText}</h2>
                )}
                <CopySectionButton text={sectionText} />
              </div>
            ) : null}
            {section.content.map((line, lineIndex) => renderMarkdownLine(line, `${sectionIndex}-${lineIndex}-${line}`))}
          </section>
        );
      })}
    </article>
  );
}

function EmptyResult() {
  return (
    <div className="rounded-md border border-dashed border-[#E8E6E1] bg-[#FAF9F6] px-5 py-10 text-center">
      <h3 className="text-base font-extrabold text-[#141413]">等待生成</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6B7280]">
        填写左侧内容后生成。输出会尽量按申报书栏目呈现，便于现场讲解、复制和继续修改。
      </p>
    </div>
  );
}
