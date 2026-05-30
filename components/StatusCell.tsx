import { CSSProperties } from "react";
import { getStatusStyle } from "@/lib/status";
import type { Status } from "@/lib/types";

export function StatusCell({ status }: { status: Status }) {
  const style = getStatusStyle(status);
  const css: CSSProperties = {
    backgroundColor: style.background,
    color: style.color,
    fontWeight: style.fontWeight
  };

  return (
    <td style={css} className="border border-[#D0D7DE] px-3 py-2 text-center text-sm">
      {status}
    </td>
  );
}
