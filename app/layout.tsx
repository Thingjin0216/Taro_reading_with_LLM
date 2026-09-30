import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "밤의 타로 — AI 타로 리딩",
  description: "고민을 적고 세 장을 고르면, AI가 과거·현재·미래로 읽어 줍니다.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/*
          next/font는 한글 폰트의 유니코드 구간을 수백 개로 나눠 받다 실패한다.
          App Router의 루트 레이아웃이라 이 link는 모든 페이지에 들어가므로
          경고가 경고하는 상황(페이지 하나에만 적용됨)에는 해당하지 않는다.
          굵기는 400만 쓴다 — 한글 폰트라 굵기 하나마다 첫 화면을 막는 CSS가 크게 늘어난다.
        */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang&family=Noto+Sans+KR:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <div className="flex-1">{children}</div>
        <footer className="px-6 py-8 text-center text-xs leading-relaxed text-mist-500">
          <p>타로는 즐거움을 위한 것입니다. 중요한 결정은 스스로, 필요하면 전문가와 함께 내려 주세요.</p>
          <p className="mt-1">
            카드 이미지: 라이더-웨이트-스미스 덱(1909) · 퍼블릭 도메인 ·{" "}
            <a
              className="underline decoration-mist-500/40 underline-offset-2 transition-colors hover:text-mist-300"
              href="https://commons.wikimedia.org/wiki/Category:Rider-Waite_tarot_deck"
              target="_blank"
              rel="noreferrer"
            >
              위키미디어 공용
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
