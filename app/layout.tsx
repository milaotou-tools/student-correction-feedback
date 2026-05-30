import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "学生订正反馈生成器",
  description: "上传 Excel，生成学生一周订正情况反馈长图和教师跟进名单。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
