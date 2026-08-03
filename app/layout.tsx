import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "기상특보",
  description: "기상청 기상특보 조회서비스 기반 지역별 특보 지도",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
