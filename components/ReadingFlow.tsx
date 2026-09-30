"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { streamPost } from "@/lib/client/stream";
import type { Message, ProviderMode } from "@/lib/llm/types";
import { MAX_FOLLOW_UP_TURNS, MAX_QUESTION_LENGTH } from "@/lib/schema";
import type { TarotCard } from "@/lib/tarot/deck";
import { DECK } from "@/lib/tarot/deck";
import { drawFromShuffled, shuffleDeck, SPREAD_POSITIONS, type DrawnCard } from "@/lib/tarot/draw";
import { CardGrid } from "./CardGrid";
import { ChatPanel } from "./ChatPanel";
import { ReadingStream } from "./ReadingStream";
import { SpreadBoard } from "./SpreadBoard";

type Phase = "question" | "selecting" | "reading";

const FALLBACK_ERROR = "해석을 불러오지 못했습니다.";

function messageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : FALLBACK_ERROR;
}

export function ReadingFlow() {
  const [phase, setPhase] = useState<Phase>("question");
  const [question, setQuestion] = useState("");
  const [deck, setDeck] = useState<TarotCard[]>([]);
  const [picks, setPicks] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<DrawnCard[]>([]);
  const [reading, setReading] = useState("");
  const [followUps, setFollowUps] = useState<Message[]>([]);
  const [mode, setMode] = useState<ProviderMode | null>(null);
  const [readingBusy, setReadingBusy] = useState(false);
  const [readingError, setReadingError] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const askedCount = followUps.filter((message) => message.role === "user").length;

  const runReading = useCallback(
    async (cards: DrawnCard[], text: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setReading("");
      setReadingError(null);
      setReadingBusy(true);

      try {
        const resolved = await streamPost(
          "/api/reading",
          { question: text, cards },
          (chunk) => setReading((previous) => previous + chunk),
          controller.signal,
        );
        setMode(resolved);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setReadingError(messageOf(error));
      } finally {
        setReadingBusy(false);
      }
    },
    [],
  );

  function startSelecting(event: React.FormEvent) {
    event.preventDefault();
    if (question.trim().length === 0) {
      return;
    }
    setDeck(shuffleDeck());
    setPicks([]);
    setPhase("selecting");
  }

  function pick(index: number) {
    if (picks.includes(index) || picks.length >= SPREAD_POSITIONS.length) {
      return;
    }
    const next = [...picks, index];
    setPicks(next);

    if (next.length === SPREAD_POSITIONS.length) {
      const cards = drawFromShuffled(deck, next);
      setDrawn(cards);
      setPhase("reading");
      void runReading(cards, question.trim());
    }
  }

  async function sendFollowUp(text: string) {
    const history: Message[] = [
      { role: "assistant", content: reading },
      ...followUps.filter((message) => message.content.trim().length > 0),
      { role: "user", content: text },
    ];

    setChatError(null);
    setChatBusy(true);
    setFollowUps((previous) => [...previous, { role: "user", content: text }, { role: "assistant", content: "" }]);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamPost(
        "/api/chat",
        { question: question.trim(), cards: drawn, messages: history },
        (chunk) =>
          setFollowUps((previous) => {
            const next = [...previous];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + chunk };
            return next;
          }),
        controller.signal,
      );
    } catch (error) {
      if (!controller.signal.aborted) {
        setChatError(messageOf(error));
      }
    } finally {
      setChatBusy(false);
    }
  }

  function restart() {
    abortRef.current?.abort();
    setPhase("question");
    setQuestion("");
    setPicks([]);
    setDrawn([]);
    setReading("");
    setFollowUps([]);
    setReadingError(null);
    setChatError(null);
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-6">
        <header className="mb-10 flex items-baseline justify-between gap-4">
          <Link href="/" className="font-display text-lg text-gold-200 transition-colors hover:text-gold-300">
            밤의 타로
          </Link>
          {mode === "demo" && (
            <span
              data-testid="demo-badge"
              title="ANTHROPIC_API_KEY가 설정되면 AI가 직접 해석합니다."
              className="rounded-full border border-gold-600/50 px-3 py-1 text-[11px] text-gold-400"
            >
              데모 모드
            </span>
          )}
        </header>

        <AnimatePresence mode="wait">
          {phase === "question" && (
            <motion.form
              key="question"
              onSubmit={startSelecting}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >
              <label htmlFor="question" className="block font-display text-2xl text-gold-200">
                무엇이 궁금한가요?
              </label>
              <p className="text-sm leading-relaxed text-mist-400">
                상황을 한두 문장으로 적어 주세요. 구체적일수록 카드가 답할 자리가 분명해집니다.
              </p>
              <textarea
                id="question"
                rows={3}
                maxLength={MAX_QUESTION_LENGTH}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="예) 지금 다니는 회사를 옮겨야 할지 고민이에요."
                className="w-full resize-none rounded-xl border border-night-600 bg-night-800/60 px-5 py-4 text-[15px] leading-7 text-mist-100 placeholder:text-mist-500 focus:border-gold-500/60 focus:outline-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-mist-500">
                  {question.length} / {MAX_QUESTION_LENGTH}
                </span>
                <button
                  type="submit"
                  disabled={question.trim().length === 0}
                  className="rounded-full border border-gold-500/60 bg-gold-500/10 px-8 py-3 font-display text-base text-gold-200 transition-colors hover:bg-gold-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  카드 뽑기
                </button>
              </div>
            </motion.form>
          )}

          {phase === "selecting" && (
            <motion.section
              key="selecting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm text-mist-300">{question}</p>
                <p className="font-display text-sm text-gold-300">
                  <span data-testid="selection-count">{picks.length} / 3</span>
                </p>
              </div>
              <p className="text-xs text-mist-500">
                마음이 가는 순서대로 세 장을 고르세요. 첫 장은 과거, 둘째는 현재, 셋째는 미래의 자리입니다.
              </p>
              <CardGrid
                total={deck.length || DECK.length}
                selected={picks}
                onSelect={pick}
                locked={picks.length >= SPREAD_POSITIONS.length}
              />
            </motion.section>
          )}

          {phase === "reading" && (
            <motion.section
              key="reading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-10"
            >
              <p className="text-sm text-mist-300">{question}</p>

              <SpreadBoard cards={drawn} />

              <ReadingStream
                text={reading}
                streaming={readingBusy}
                error={readingError}
                onRetry={() => void runReading(drawn, question.trim())}
              />

              {!readingBusy && !readingError && reading.length > 0 && (
                <ChatPanel
                  messages={followUps}
                  onSend={(text) => void sendFollowUp(text)}
                  busy={chatBusy}
                  remaining={MAX_FOLLOW_UP_TURNS - askedCount}
                  error={chatError}
                />
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={restart}
                  className="text-sm text-mist-400 underline decoration-mist-500/40 underline-offset-4 transition-colors hover:text-mist-100"
                >
                  처음부터 다시 보기
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </MotionConfig>
  );
}
