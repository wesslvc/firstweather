import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "날씨 & 미세먼지",
  description: "기상청 & 에어코리아 데이터 기반 날씨 및 미세먼지 정보",
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
