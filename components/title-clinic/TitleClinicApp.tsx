"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type OutlineItem = {
  id?: string;
  index?: number;
  level: number;
  text: string;
};

type AlternativeTitle = {
  type: string;
  title: string;
  reason: string;
};

type OptimizeResult = {
  diagnosis?: string[];
  recommendedTitle?: string;
  recommendedReason?: string;
  alternativeTitles?: AlternativeTitle[];
  outlineRevision?: Array<{
    id?: string;
    index?: number;
    level?: number;
    oldText?: string;
    newText?: string;
    reason?: string;
  }>;
  meta?: {
    mode?: string;
    provider?: string;
    model?: string;
  };
};

type HealthStatus = {
  ok: boolean;
  provider: string;
  model: string;
  keyConfigured: boolean;
};

type DocxParts = {
  fullText: string;
  outlineText: string;
};

const loadingSteps = [
  "正在解析标题层级",
  "正在通读全文",
  "正在套用专家规则",
  "正在生成新版标题"
];

const sampleText = `从“完美学霸”到“问题学伴”：AI赋能语文课堂的路径与思考
一、认知破局：从AI崇拜到工具觉醒
（一）政策驱动：人工智能赋能教育的新基建
（二）三重断裂：语文课堂中的“三重断裂”
二、实践建构：四阶转化的课堂探索
（一）问题驱动：从“教什么”到“AI能帮什么”
（二）冲突生成：利用AI的“不完美”制造认知冲突
1．画不准的AI→深读《木兰诗》
2．译不准的AI→批判《春望》翻译
三、边界澄明：AI赋能语文的能力与意义
（一）AI能做什么、不能做什么：能力边界的再审视
（二）赋能含义的再思考：谁赋能谁？
四、价值回归：AI时代语文教育的本质坚守`;

function emptyResult(): OptimizeResult {
  return {
    diagnosis: ["上传后显示最多 3 条关键问题。"],
    alternativeTitles: []
  };
}

export function TitleClinicApp() {
  const [title, setTitle] = useState("");
  const [abstractText, setAbstractText] = useState("");
  const [intro, setIntro] = useState("");
  const [fullText, setFullText] = useState("");
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [newOutline, setNewOutline] = useState<OutlineItem[]>([]);
  const [result, setResult] = useState<OptimizeResult>(emptyResult);
  const [fileName, setFileName] = useState("默认上传 .docx 文件");
  const [fileStatus, setFileStatus] = useState("系统会先抽取大标题和各级小标题，再让 AI 按专家规则生成新版标题结构。");
  const [status, setStatus] = useState("等待上传 Word。");
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("等待开始");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState("");

  const titleCount = outline.length;
  const apiLabel = useMemo(() => {
    if (healthError) return "API：检查失败";
    if (!health) return "API：未检查";
    if (!health.keyConfigured) return "API：服务在，但未配置 key";
    return `API：已连接 / ${health.provider} / ${health.model}`;
  }, [health, healthError]);

  useEffect(() => {
    void checkHealth();
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const interval = window.setInterval(() => {
      setProgressLabel((current) => {
        const index = loadingSteps.indexOf(current);
        return loadingSteps[(index + 1 + loadingSteps.length) % loadingSteps.length];
      });
      setProgress((current) => Math.min(88, current + 7));
    }, 1600);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  async function checkHealth() {
    setHealthError("");
    try {
      const response = await fetch("/api/title-clinic/health", { cache: "no-store" });
      const data = await response.json() as HealthStatus;
      if (!response.ok || !data.ok) throw new Error("API unavailable");
      setHealth(data);
    } catch (error) {
      setHealth(null);
      setHealthError(error instanceof Error ? error.message : "检查失败");
    }
  }

  async function processDocxFile(file: File) {
    setFileName(file.name);
    setStatus("正在解析 Word 标题层级...");
    setProgress(10);
    setProgressLabel("正在解析 Word");
    try {
      const parts = await extractDocxText(file);
      const normalizedFullText = normalizeText(parts.fullText);
      const sections = splitPaperSections(normalizedFullText);
      const nextTitle = sections.title || title;
      const nextOutline = extractOutline(parts.outlineText || normalizedFullText, nextTitle);

      setFullText(normalizedFullText);
      setTitle(nextTitle);
      setAbstractText(sections.abstract);
      setIntro(sections.intro);
      setOutline(nextOutline);
      setNewOutline(nextOutline);
      setResult(emptyResult());
      setFileStatus(`已解析约 ${normalizedFullText.length} 字，识别出 ${Math.max(0, nextOutline.length - 1)} 个层级标题。`);
      setStatus("Word 已解析。检查标题层级后，点击“开始改标题”。");
      setProgress(0);
      setProgressLabel("等待开始");
    } catch (error) {
      setFullText("");
      setOutline([]);
      setNewOutline([]);
      setStatus(`Word 解析失败：${error instanceof Error ? error.message : "未知错误"}`);
      setFileStatus("如果当前浏览器不支持 Word 本地解析，可点“手动粘贴”输入标题和目录。");
    }
  }

  function readInput() {
    const context = fullText || `${title}\n${abstractText}\n${intro}`;
    const nextOutline = context ? extractOutline(context, title) : outline;
    return {
      title,
      abstract: abstractText,
      intro,
      fullText: context,
      outline: nextOutline.length ? nextOutline : outline
    };
  }

  function validateInput(input: ReturnType<typeof readInput>) {
    if (!input.title.trim()) return "请先提供原标题。";
    if ((input.fullText + input.abstract + input.intro).trim().length < 80) {
      return "请上传完整 Word，或展开手动粘贴区补充论文内容。";
    }
    return "";
  }

  async function generate() {
    const input = readInput();
    const validation = validateInput(input);
    if (validation) {
      setStatus(validation);
      return;
    }

    const nextOutline = input.outline.map((item, index) => ({ ...item, id: `T${index}`, index }));
    setOutline(nextOutline);
    setNewOutline(nextOutline);
    setIsLoading(true);
    setProgress(12);
    setProgressLabel("正在解析标题层级");
    setStatus("正在调用 AI 按专家规则改标题结构...");

    try {
      const response = await fetch("/api/title-clinic/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, outline: nextOutline })
      });
      const payload = await response.json() as OptimizeResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "接口请求失败。");
      const normalized = normalizeDisplayedResult(payload);
      const built = buildNewOutline(nextOutline, normalized.recommendedTitle || title, normalized.outlineRevision || []);
      setResult(normalized);
      setNewOutline(built);
      setProgress(100);
      setProgressLabel("改标题完成");
      setStatus(normalized.meta?.mode === "fallback" ? "已生成本地规则版。若要专家规则效果，请确认服务端 API 可用。" : "已生成新版标题结构。红色部分为改动。");
    } catch (error) {
      setStatus(`API 调用失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setIsLoading(false);
    }
  }

  function fillSample() {
    const nextOutline = extractOutline(sampleText, "从“完美学霸”到“问题学伴”：AI赋能语文课堂的路径与思考");
    setTitle("从“完美学霸”到“问题学伴”：AI赋能语文课堂的路径与思考");
    setAbstractText("本文围绕AI进入语文课堂后的学习依赖、认知冲突与能力边界展开，尝试从课堂教学转向数智教研。");
    setIntro(sampleText);
    setFullText(sampleText);
    setOutline(nextOutline);
    setNewOutline(nextOutline);
    setResult(emptyResult());
    setProgress(0);
    setProgressLabel("等待开始");
    setStatus("已填入示例。点击“开始改标题”查看红字对比。");
  }

  function clearAll() {
    setTitle("");
    setAbstractText("");
    setIntro("");
    setFullText("");
    setOutline([]);
    setNewOutline([]);
    setResult(emptyResult());
    setFileName("默认上传 .docx 文件");
    setFileStatus("系统会先抽取大标题和各级小标题，再让 AI 按专家规则生成新版标题结构。");
    setProgress(0);
    setProgressLabel("等待开始");
    setStatus("等待上传 Word。");
  }

  return (
    <main className="min-h-screen bg-[#FAF9F6] px-4 py-6 text-[#141413] sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="rounded-3xl border border-[#E8E6E1] bg-white p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <Link href="/" className="text-xs font-bold uppercase tracking-[0.18em] text-[#6B7280]">
                达达教学工具台
              </Link>
              <h1 className="mt-3 text-3xl font-extrabold tracking-normal text-[#141413]">论文标题优化门诊</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6B7280]">
                上传论文 Word，自动抓取大标题和各级小标题，按专家规则生成左右对比。红色部分表示新版改动。
              </p>
            </div>
            <div className="flex flex-col gap-2 lg:w-[360px]">
              <div className="rounded-full border border-[#E8E6E1] bg-[#FAF9F6] px-4 py-2 text-xs font-bold text-[#141413]">
                {apiLabel}
              </div>
              <button
                type="button"
                onClick={() => void checkHealth()}
                className="focus-ring h-9 rounded-full border border-[#D1D5DB] bg-white px-4 text-sm font-bold text-[#141413] hover:bg-[#F3F2EF]"
              >
                重新检查 API
              </button>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-[#E8E6E1] bg-white p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <label
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (!file) return;
                if (!/\.docx$/i.test(file.name)) {
                  setStatus("只支持拖入 .docx 文件。");
                  return;
                }
                void processDocxFile(file);
              }}
              className={[
                "flex min-h-[88px] cursor-pointer items-center justify-between gap-4 rounded-xl border border-dashed px-4 py-3 transition",
                isDragging ? "border-[#8B5CF6] bg-[#F5F3FF]" : "border-[#C9C7C1] bg-[#FAF9F6]"
              ].join(" ")}
            >
              <input
                className="sr-only"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void processDocxFile(file);
                }}
              />
              <span className="min-w-0">
                <strong className="block truncate text-base font-extrabold text-[#141413]">{fileName}</strong>
                <span className="mt-1 block text-sm leading-6 text-[#6B7280]">{fileStatus}</span>
                <span className="mt-1 block text-xs font-bold text-[#8B5CF6]">可以直接把 Word 拖到这里</span>
              </span>
              <span className="shrink-0 rounded-full border border-[#D1D5DB] bg-white px-4 py-2 text-sm font-bold text-[#141413]">
                选择 Word
              </span>
            </label>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <button
                type="button"
                onClick={generate}
                disabled={isLoading}
                className="focus-ring h-11 rounded-full bg-[#141413] px-5 text-sm font-extrabold text-white transition hover:bg-[#2A2A28] disabled:cursor-not-allowed disabled:bg-[#D1D5DB]"
              >
                {isLoading ? "正在改标题..." : "开始改标题"}
              </button>
              <button
                type="button"
                onClick={() => setIsManualOpen((current) => !current)}
                className="focus-ring h-11 rounded-full border border-[#D1D5DB] bg-white px-5 text-sm font-bold text-[#141413] hover:bg-[#F3F2EF]"
              >
                手动粘贴
              </button>
              <button
                type="button"
                onClick={fillSample}
                className="focus-ring h-11 rounded-full border border-[#D1D5DB] bg-white px-5 text-sm font-bold text-[#141413] hover:bg-[#F3F2EF]"
              >
                填入示例
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="focus-ring h-11 rounded-full px-5 text-sm font-bold text-[#6B7280] hover:bg-[#F3F2EF]"
              >
                清空
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <div className="h-2 overflow-hidden rounded-full bg-[#E8E6E1]">
              <div className="h-full rounded-full bg-[#8B5CF6] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between gap-3 text-xs text-[#6B7280]">
              <strong className="font-bold text-[#141413]">{progressLabel}</strong>
              <span>{Math.round(progress)}%</span>
            </div>
            <p className="text-sm leading-6 text-[#6B7280]">{status}</p>
          </div>

          {isManualOpen ? (
            <div className="mt-5 grid gap-4 rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] p-4 lg:grid-cols-3">
              <Field label="原标题" value={title} onChange={setTitle} placeholder="粘贴论文原标题" />
              <Field label="摘要" value={abstractText} onChange={setAbstractText} placeholder="可选，粘贴摘要" multiline />
              <Field label="引言/目录/正文" value={intro || fullText} onChange={(value) => {
                setIntro(value);
                setFullText(value);
                const nextOutline = extractOutline(value, title);
                setOutline(nextOutline);
                setNewOutline(nextOutline);
              }} placeholder="粘贴引言、目录或全文" multiline />
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <OutlinePane title="原版" count={titleCount} items={outline} />
          <OutlinePane title="新版" count={newOutline.length} items={newOutline} oldItems={outline} />
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-2xl border border-[#E8E6E1] bg-white p-5">
            <h2 className="text-base font-extrabold text-[#141413]">原题诊断</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-[#141413]">
              {(result.diagnosis?.length ? result.diagnosis : emptyResult().diagnosis || []).map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-[#E8E6E1] bg-white p-5">
            <h2 className="text-base font-extrabold text-[#141413]">候选标题</h2>
            {result.recommendedTitle ? (
              <div className="mt-3 border-b border-[#E8E6E1] pb-4">
                <p className="text-xs font-bold text-[#8B5CF6]">推荐标题</p>
                <p className="mt-1 text-lg font-extrabold leading-7 text-[#141413]">{result.recommendedTitle}</p>
                <p className="mt-2 text-sm leading-6 text-[#6B7280]">{result.recommendedReason}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#6B7280]">这里保留推荐标题和 3 个备选标题，便于后续挑选。</p>
            )}
            <div className="mt-4 grid gap-3">
              {(result.alternativeTitles || []).map((item) => (
                <section key={`${item.type}-${item.title}`} className="rounded-xl border border-[#E8E6E1] bg-[#FAF9F6] p-4">
                  <p className="text-xs font-bold text-[#6B7280]">{item.type}</p>
                  <p className="mt-1 font-extrabold leading-7 text-[#141413]">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#6B7280]">{item.reason}</p>
                </section>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  placeholder,
  multiline = false,
  onChange
}: {
  label: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-bold text-[#141413]">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          rows={6}
          onChange={(event) => onChange(event.target.value)}
          className="focus-ring resize-y rounded-md border border-[#E8E6E1] bg-white px-3 py-3 text-sm leading-6 text-[#141413] placeholder:text-[#9CA3AF]"
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="focus-ring h-11 rounded-md border border-[#E8E6E1] bg-white px-3 text-sm text-[#141413] placeholder:text-[#9CA3AF]"
        />
      )}
    </label>
  );
}

function OutlinePane({
  title,
  count,
  items,
  oldItems
}: {
  title: string;
  count: number;
  items: OutlineItem[];
  oldItems?: OutlineItem[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E8E6E1] bg-white">
      <div className="flex items-center justify-between border-b border-[#E8E6E1] px-5 py-3">
        <h2 className="text-base font-extrabold text-[#141413]">{title}</h2>
        <span className="text-xs text-[#6B7280]">{count} 个标题</span>
      </div>
      <div className="max-h-[68vh] overflow-auto px-5 py-5">
        {items.length ? (
          <div className="space-y-3">
            {items.map((item, index) => (
              <OutlineRow key={`${index}-${item.text}`} item={item} index={index} oldText={oldItems?.[index]?.text} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#E8E6E1] bg-[#FAF9F6] px-5 py-10 text-center">
            <h3 className="text-base font-extrabold text-[#141413]">等待标题层级</h3>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">上传 Word 或手动粘贴后，这里会显示抓取到的标题。</p>
          </div>
        )}
      </div>
    </section>
  );
}

function OutlineRow({ item, index, oldText }: { item: OutlineItem; index: number; oldText?: string }) {
  const level = clampLevel(item.level);
  const textClass = [
    "min-w-0 break-words",
    level === 0 ? "text-[26px] font-black leading-tight text-[#273469]" : "",
    level === 1 ? "text-lg font-extrabold text-[#141413]" : "",
    level === 2 ? "text-[15px] font-bold text-[#1f4f43]" : "",
    level === 3 ? "text-sm font-semibold text-[#333947]" : "",
    level >= 4 ? "text-xs font-medium text-[#555c69]" : ""
  ].join(" ");

  return (
    <div
      className="grid items-baseline gap-2"
      style={{
        gridTemplateColumns: level === 0 ? "0 minmax(0, 1fr)" : "42px minmax(0, 1fr)",
        paddingLeft: `${Math.max(0, level - 1) * 18}px`
      }}
    >
      <div className="text-right text-xs font-bold text-[#8A8F9A]">{level === 0 ? "" : index}</div>
      <div className={textClass}>{oldText === undefined ? item.text : <DiffText oldText={oldText} newText={item.text} />}</div>
    </div>
  );
}

function DiffText({ oldText, newText }: { oldText: string; newText: string }) {
  return (
    <>
      {diffChars(oldText, newText).map((part, index) => (
        <span key={`${index}-${part.text}`} className={part.changed ? "text-[#C9191F]" : undefined}>
          {part.text}
        </span>
      ))}
    </>
  );
}

function diffChars(oldText: string, newText: string) {
  if (oldText === newText) return [{ text: newText, changed: false }];
  const oldChars = [...oldText];
  const newChars = [...newText];
  const dp = Array.from({ length: oldChars.length + 1 }, () => Array<number>(newChars.length + 1).fill(0));
  for (let i = oldChars.length - 1; i >= 0; i--) {
    for (let j = newChars.length - 1; j >= 0; j--) {
      dp[i][j] = oldChars[i] === newChars[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const parts: Array<{ text: string; changed: boolean }> = [];
  let i = 0;
  let j = 0;
  while (j < newChars.length) {
    if (i < oldChars.length && oldChars[i] === newChars[j]) {
      pushDiff(parts, newChars[j], false);
      i++;
      j++;
    } else if (i < oldChars.length && dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      pushDiff(parts, newChars[j], true);
      j++;
    }
  }
  return parts;
}

function pushDiff(parts: Array<{ text: string; changed: boolean }>, text: string, changed: boolean) {
  const last = parts[parts.length - 1];
  if (last && last.changed === changed) {
    last.text += text;
    return;
  }
  parts.push({ text, changed });
}

function buildNewOutline(oldOutline: OutlineItem[], recommendedTitle: string, revision: NonNullable<OptimizeResult["outlineRevision"]>) {
  const byIndex = new Map<number, NonNullable<OptimizeResult["outlineRevision"]>[number]>();
  const byOldText = new Map<string, NonNullable<OptimizeResult["outlineRevision"]>[number]>();
  for (const item of revision) {
    if (!item) continue;
    if (Number.isInteger(item.index)) byIndex.set(Number(item.index), item);
    if (item.id && /^T\d+$/.test(item.id)) byIndex.set(Number(item.id.slice(1)), item);
    if (item.oldText) byOldText.set(normalizeKey(item.oldText), item);
  }

  return oldOutline.map((item, index) => {
    const update = byIndex.get(index) || byOldText.get(normalizeKey(item.text));
    return {
      id: item.id,
      index,
      level: Number.isInteger(update?.level) ? Number(update?.level) : item.level,
      text: stripCaseSubtitle(String(update?.newText || (index === 0 ? recommendedTitle : item.text)))
    };
  });
}

function normalizeDisplayedResult(result: OptimizeResult) {
  const normalized: OptimizeResult = {
    ...result,
    recommendedTitle: stripCaseSubtitle(result.recommendedTitle || "")
  };
  if (Array.isArray(result.alternativeTitles)) {
    normalized.alternativeTitles = result.alternativeTitles.map((item) => ({
      ...item,
      title: stripCaseSubtitle(item.title)
    }));
  }
  if (Array.isArray(result.outlineRevision)) {
    normalized.outlineRevision = result.outlineRevision.map((item) => ({
      ...item,
      oldText: stripCaseSubtitle(item.oldText || ""),
      newText: stripCaseSubtitle(item.newText || "")
    }));
  }
  return normalized;
}

function stripCaseSubtitle(text: string) {
  return normalizeText(text)
    .replace(/(?:——|—|-)?[（(]?\s*以["“『《]?[^"”』》]+["”』》]?\s*为例\s*[)）]?$/g, "")
    .replace(/(?:——|—|-)?[（(]?\s*以["“『《]?[^"”』》]+["”』》]?\s*教学为例\s*[)）]?$/g, "")
    .replace(/\s*[-—]*\s*以["“『《]?[^"”』》]+["”』》]?\s*为例$/, "")
    .trim();
}

async function extractDocxText(file: File): Promise<DocxParts> {
  const buffer = await file.arrayBuffer();
  const entries = parseZip(buffer);
  const documentEntry = entries.find((entry) => entry.name === "word/document.xml");
  if (!documentEntry) throw new Error("没有找到 word/document.xml");
  const xmlBytes = await inflateZipEntry(buffer, documentEntry);
  const xml = new TextDecoder("utf-8").decode(xmlBytes);
  return {
    fullText: xmlToPlainText(xml),
    outlineText: xmlToPlainText(xml.replace(/<w:tbl[\s\S]*?<\/w:tbl>/g, "\n"))
  };
}

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
};

function parseZip(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 66000); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("不是有效的 .docx 文件");

  const total = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  let ptr = centralOffset;

  for (let i = 0; i < total; i++) {
    if (view.getUint32(ptr, true) !== 0x02014b50) throw new Error("Word 压缩目录损坏");
    const method = view.getUint16(ptr + 10, true);
    const compressedSize = view.getUint32(ptr + 20, true);
    const nameLength = view.getUint16(ptr + 28, true);
    const extraLength = view.getUint16(ptr + 30, true);
    const commentLength = view.getUint16(ptr + 32, true);
    const localOffset = view.getUint32(ptr + 42, true);
    const nameBytes = bytes.slice(ptr + 46, ptr + 46 + nameLength);
    const name = new TextDecoder("utf-8").decode(nameBytes);
    entries.push({ name, method, compressedSize, localOffset });
    ptr += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function inflateZipEntry(buffer: ArrayBuffer, entry: ZipEntry) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const ptr = entry.localOffset;
  if (view.getUint32(ptr, true) !== 0x04034b50) throw new Error("Word 局部文件头损坏");
  const nameLength = view.getUint16(ptr + 26, true);
  const extraLength = view.getUint16(ptr + 28, true);
  const dataStart = ptr + 30 + nameLength + extraLength;
  const compressed = bytes.slice(dataStart, dataStart + entry.compressedSize);
  if (entry.method === 0) return compressed;
  if (entry.method !== 8) throw new Error("不支持的 Word 压缩方式");
  if (!("DecompressionStream" in window)) throw new Error("当前浏览器不支持本地解压 Word");
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function xmlToPlainText(xml: string) {
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitPaperSections(text: string) {
  const clean = normalizeText(text);
  const lines = clean.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return {
    title: findLikelyTitle(lines),
    abstract: captureSection(clean, /摘要[:：\s]*/, /(关键词|引言|绪论|一[、.．]|1[.．、])/),
    intro: captureSection(clean, /(引言|绪论|一[、.．]\s*引言|1[.．、]\s*引言)[:：\s]*/, /(二[、.．]|2[.．、]|研究方法|文献综述|理论基础)/)
  };
}

function captureSection(text: string, startPattern: RegExp, endPattern: RegExp) {
  const start = text.search(startPattern);
  if (start < 0) return "";
  const after = text.slice(start).replace(startPattern, "");
  const end = after.search(endPattern);
  return normalizeText((end >= 0 ? after.slice(0, end) : after).slice(0, 1800));
}

function extractOutline(text: string, fallbackTitle: string) {
  const lines = normalizeText(text).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const items: OutlineItem[] = [];
  const seen = new Set<string>();
  const title = fallbackTitle || findLikelyTitle(lines);
  if (title) pushItem(items, seen, 0, title);

  for (const line of lines) {
    const clean = cleanLine(line);
    if (!clean || clean === title) continue;
    const level = detectHeadingLevel(clean);
    if (level === null) continue;
    pushItem(items, seen, level, clean);
  }

  return items.slice(0, 140).map((item, index) => ({ ...item, id: `T${index}`, index }));
}

function pushItem(items: OutlineItem[], seen: Set<string>, level: number, text: string) {
  const clean = cleanLine(text);
  const key = `${level}:${clean}`;
  if (!clean || seen.has(key)) return;
  seen.add(key);
  items.push({ level, text: clean });
}

function findLikelyTitle(lines: string[]) {
  return lines.find((line) => {
    const clean = cleanLine(line);
    return clean.length >= 6 &&
      clean.length <= 64 &&
      detectHeadingLevel(clean) === null &&
      !/^(摘要|关键词|目录|参考文献|作者|单位)/.test(clean);
  }) || "";
}

function detectHeadingLevel(line: string) {
  if (isPlainDataLine(line)) return null;
  if (/^(引子|尾声|危机浮现|问题诊断|觉醒起点|深度验证|制度重构|理论升华|价值坚守|失焦|对焦|成像|画像|困惑|审视|建构|实践|特征|结语|价值回归)[：:]/.test(line)) return 1;
  if (/^[一二三四五六七八九十]+[、.．]/.test(line)) return 1;
  if (/^（[一二三四五六七八九十]+）/.test(line)) return 2;
  if (/^\([一二三四五六七八九十]+\)/.test(line)) return 2;
  if (/^(第一|第二|第三|第四|第五|第六|步骤一|步骤二|步骤三|路径一|路径二|路径三|路径四|方向之一|方向之二|方向之三|方向之四)[，、：:]/.test(line)) return 3;
  if (/^\d+[.．、]/.test(line)) {
    const body = line.replace(/^\d+[.．、]\s*/, "");
    if (!isPlainDataLine(body) && body.length >= 4 && /[\u4e00-\u9fa5]/.test(body)) return 3;
  }
  if (/^\d+\.\d+/.test(line)) return null;
  if (/^[（(]\d+[）)]/.test(line)) return 4;
  return null;
}

function isPlainDataLine(line: string) {
  const clean = String(line || "").replace(/\s+/g, "");
  if (!clean) return true;
  if (/^[+-]?\d+(\.\d+)?$/.test(clean)) return true;
  if (/^[+-]?\d+(\.\d+)?(?:%|％|分|分钟|min|小时|次|项|条|分数|分点)$/.test(clean)) return true;
  if (/^\d+\.\d+\.\d+$/.test(clean)) return true;
  if (/^[\d.]+(?:分|分钟|次|项|条|%|％)$/.test(clean)) return true;
  return false;
}

function cleanLine(line: string) {
  return normalizeText(line)
    .replace(/\s+/g, " ")
    .replace(/[ \t]+$/g, "")
    .slice(0, 120);
}

function normalizeText(text: string) {
  return String(text || "")
    .replace(/\u3000/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeKey(text: string) {
  return normalizeText(text).replace(/\s+/g, "");
}

function clampLevel(level: number) {
  const n = Number(level);
  if (!Number.isFinite(n)) return 3;
  return Math.max(0, Math.min(4, n));
}
