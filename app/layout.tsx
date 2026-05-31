import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "达达教学工具台",
  description: "一周订正反馈和成绩分析报告，两个功能独立使用。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
