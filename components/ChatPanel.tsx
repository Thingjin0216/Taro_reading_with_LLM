"use client";

import { useState } from "react";
import { MAX_QUESTION_LENGTH } from "@/lib/constants";
import type { Message } from "@/lib/llm/types";
import { ModelText } from "./ModelText";

interface ChatPanelProps {
  messages: Message[];
  /** 질문이 대화에 남았는지 알려 준다. 남지 못했으면 입력창에 되돌려 놓는다. */
  onSend: (text: string) => Promise<boolean>;
  busy: boolean;
  remaining: number;
  error: string | null;
}

export function ChatPanel({ messages, onSend, busy, remaining, error }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const exhausted = remaining <= 0;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy || exhausted) {
      return;
    }
    setDraft("");
    void onSend(text).then((kept) => {
      if (!kept) {
        setDraft(text);
      }
    });
  }

  return (
    <section className="space-y-4">
      {messages.length > 0 && (
        <ul data-testid="chat" className="space-y-4">
          {messages.map((message, index) => {
            const fromUser = message.role === "user";
            return (
              <li key={index} className={fromUser ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[85%] space-y-3 rounded-2xl px-4 py-3 text-[15px] leading-7",
                    fromUser
                      ? "rounded-br-sm bg-gold-500/15 text-gold-100"
                      : "rounded-bl-sm border border-night-600/70 bg-night-800/60 text-mist-100",
                  ].join(" ")}
                >
                  {fromUser ? (
                    message.content
                  ) : (
                    <ModelText text={message.content} streaming={busy && index === messages.length - 1} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          aria-label="더 물어보기"
          placeholder={exhausted ? "이번 리딩의 질문을 모두 쓰셨습니다" : "더 물어보기…"}
          value={draft}
          maxLength={MAX_QUESTION_LENGTH}
          disabled={busy || exhausted}
          onChange={(event) => setDraft(event.target.value)}
          className="flex-1 rounded-full border border-night-600 bg-night-800/60 px-5 py-3 text-[15px] text-mist-100 placeholder:text-mist-500 focus:border-gold-500/60 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || exhausted || draft.trim().length === 0}
          className="rounded-full border border-gold-500/60 bg-gold-500/10 px-6 py-3 text-sm text-gold-200 transition-colors hover:bg-gold-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          보내기
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-gold-300">
          {error}
        </p>
      )}

      {!exhausted && <p className="text-right text-xs text-mist-500">남은 질문 {remaining}번</p>}
    </section>
  );
}
