"use client";

import { useState } from "react";

export function CopyButton({ text, label = "复制" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="focus-ring rounded-md border border-[#9fb3c4] bg-white px-3 py-2 text-sm font-bold text-[#2F4F68] hover:bg-[#F3F6FA]"
    >
      {copied ? "已复制" : label}
    </button>
  );
}
