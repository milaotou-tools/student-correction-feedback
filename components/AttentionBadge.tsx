import { CSSProperties } from "react";
import { getAttentionStyle } from "@/lib/status";
import type { AttentionLevel } from "@/lib/types";

export function AttentionBadge({ level }: { level: AttentionLevel }) {
  const style = getAttentionStyle(level);
  const css: CSSProperties = {
    backgroundColor: style.background,
    color: style.color,
    borderColor: style.border,
    fontWeight: style.fontWeight
  };

  return (
    <span
      style={css}
      className="inline-flex min-w-24 items-center justify-center rounded-full border-2 px-3 py-1 text-sm leading-none"
    >
      {level}
    </span>
  );
}
