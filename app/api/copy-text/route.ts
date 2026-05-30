import { execFile } from "child_process";
import { promisify } from "util";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { text?: string };
  const text = String(body.text ?? "");

  if (!text.trim()) {
    return NextResponse.json({ error: "没有可复制的文字。" }, { status: 400 });
  }

const script = `
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Clipboard]::SetText($env:CODEX_COPY_TEXT)
`;

  try {
    await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script],
      {
        windowsHide: true,
        timeout: 15000,
        env: { ...process.env, CODEX_COPY_TEXT: text }
      }
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "系统剪贴板复制失败，请手动选中文字复制。" }, { status: 500 });
  }
}
