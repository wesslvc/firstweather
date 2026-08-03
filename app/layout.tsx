import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// next/font는 자체 호스팅 + preload로 렌더 차단 없이 로드됨 (기존 Google Fonts @import 대비 속도 개선)
const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "기상특보 지도",
  description: "기상청 기상특보 조회서비스 기반 지역별 특보 지도",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`h-full ${notoSansKr.variable}`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
