import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeachSync · 机构运营协同",
  description: "授课线 · 晚辅线 · 智习室线 的运营协同平台",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
