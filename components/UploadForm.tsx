"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function UploadForm() {
  const router = useRouter();
  const [weekLabel, setWeekLabel] = useState("第16周");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!file) {
      setError("请先选择 Excel 文件。");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("weekLabel", weekLabel);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        body: formData
      });
      const result = (await response.json()) as { reportId?: string; error?: string };
      if (!response.ok || !result.reportId) {
        throw new Error(result.error || "生成失败，请检查 Excel 格式。");
      }
      router.push(`/reports/${result.reportId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成失败，请重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-md border border-[#D0D7DE] bg-white p-7 shadow-sm">
      <div>
        <label htmlFor="weekLabel" className="mb-2 block text-sm font-bold text-slate-700">
          周次
        </label>
        <input
          id="weekLabel"
          value={weekLabel}
          onChange={(event) => setWeekLabel(event.target.value)}
          placeholder="例如：第16周"
          className="focus-ring w-full rounded-md border border-[#D0D7DE] bg-[#F7F9FC] px-4 py-3 text-base"
        />
      </div>

      <div>
        <label htmlFor="excelFile" className="mb-2 block text-sm font-bold text-slate-700">
          Excel 文件
        </label>
        <input
          id="excelFile"
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="focus-ring w-full rounded-md border border-dashed border-[#9fb3c4] bg-[#F7F9FC] px-4 py-4 text-sm"
        />
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="focus-ring inline-flex w-full items-center justify-center rounded-md bg-[#2F4F68] px-5 py-3 font-bold text-white transition hover:bg-[#263f53] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "正在解析并生成图片..." : "生成反馈图"}
      </button>
    </form>
  );
}
