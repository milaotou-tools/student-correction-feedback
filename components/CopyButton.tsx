"use client";

import { useState } from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

function copyWithTextarea(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const success = document.execCommand("copy");
  document.body.removeChild(textarea);
  return success;
}

export function CopyButton({ text, label = "复制", copiedLabel = "已复制", className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const canUseClipboardApi =
      typeof navigator !== "undefined" &&
      typeof navigator.clipboard?.writeText === "function" &&
      window.isSecureContext;

    const copiedSuccessfully = canUseClipboardApi
      ? await navigator.clipboard.writeText(text).then(() => true).catch(() => false)
      : copyWithTextarea(text);

    if (!copiedSuccessfully) {
      throw new Error("复制失败，请手动复制");
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button type="button" onClick={handleCopy} className={className}>
      {copied ? copiedLabel : label}
    </button>
  );
}
