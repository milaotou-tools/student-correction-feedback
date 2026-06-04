"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { withAppBasePath } from "@/lib/app-path";

export function GradeUploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!file) {
      setError("请先选择成绩 Excel 文件。");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    setIsSubmitting(true);
    try {
      const response = await fetch(withAppBasePath("/api/grade-reports"), {
        method: "POST",
        body: formData
      });
      const result = (await response.json()) as { gradeReportId?: string; error?: string };
      if (!response.ok || !result.gradeReportId) {
        throw new Error(result.error || "生成失败，请检查成绩单格式。");
      }
      router.push(`/grade-reports/${result.gradeReportId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "生成失败，请重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-md border border-[#E8E6E1] bg-white p-7">
      <div>
        <label htmlFor="gradeFile" className="mb-2 block text-sm font-bold text-[#141413]">
          成绩 Excel 文件
        </label>
        <input
          id="gradeFile"
          type="file"
          accept=".xlsx,.xls"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="focus-ring w-full rounded-md border border-dashed border-[#D1D5DB] bg-[#FAF9F6] px-4 py-4 text-sm"
        />
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="focus-ring inline-flex w-full items-center justify-center rounded-md bg-[#141413] px-5 py-3 font-bold text-white transition hover:bg-[#2A2A28] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "正在分析成绩..." : "生成成绩分析"}
      </button>
    </form>
  );
}
