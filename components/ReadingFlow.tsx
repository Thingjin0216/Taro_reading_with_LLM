"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m } from "motion/react";
import { FALLBACK_MESSAGE, streamPost } from "@/lib/client/stream";
import { MAX_FOLLOW_UP_TURNS, MAX_QUESTION_LENGTH } from "@/lib/constants";
import type { Message, ProviderMode } from "@/lib/llm/types";
import type { TarotCard } from "@/lib/tarot/deck";
import { drawFromShuffled, shuffleDeck, SPREAD_POSITIONS, type DrawnCard } from "@/lib/tarot/draw";
import { CardGrid } from "./CardGrid";
import { ChatPanel } from "./ChatPanel";
import { ReadingStream } from "./ReadingStream";
import { SpreadBoard } from "./SpreadBoard";

/** 리딩 한 번의 전부. 처음부터 다시 보기는 이것을 통째로 INITIAL로 되돌린다. */
interface Session {
  question: string;
  deck: TarotCard[];
  picks: number[];
  drawn: DrawnCard[];
  reading: string;
  followUps: Message[];
}

const INITIAL: Session = { question: "", deck: [], picks: [], drawn: [], reading: "", followUps: [] };

type StreamKind = "reading" | "chat";

const EMPTY_ANSWER = "답을 받지 못했습니다. 다시 물어봐 주세요.";

function messageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : FALLBACK_MESSAGE;
}

function appendToAnswer(session: Session, chunk: string): Session {
  const followUps = [...session.followUps];
  const last = followUps[followUps.length - 1];
  followUps[followUps.length - 1] = { ...last, content: last.content + chunk };
  return { ...session, followUps };
}

export function ReadingFlow() {
  const [draft, setDraft] = useState("");
  const [session, setSession] = useState<Session>(INITIAL);
  const [mode, setMode] = useState<ProviderMode | null>(null);
  const [busy, setBusy] = useState<StreamKind | null>(null);
  const [error, setError] = useState<{ on: StreamKind; message: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const phase = session.drawn.length > 0 ? "reading" : session.deck.length > 0 ? "selecting" : "question";
  const askedCount = session.followUps.filter((message) => message.role === "user").length;

  /** 해석도 후속 답변도 같은 길로 받는다. 새 요청은 이전 요청을 끊는다. 끝까지 받으면 true. */
  async function stream(kind: StreamKind, url: string, body: unknown, onChunk: (chunk: string) => void) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(kind);
    setError(null);

    try {
      setMode(await streamPost(url, body, onChunk, controller.signal));
      return true;
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError({ on: kind, message: messageOf(caught) });
      }
      return false;
    } finally {
      if (abortRef.current === controller) {
        setBusy(null);
      }
    }
  }

  function readCards(question: string, drawn: DrawnCard[]) {
    setSession((current) => ({ ...current, reading: "" }));
    return stream("reading", "/api/reading", { question, cards: drawn }, (chunk) =>
      setSession((current) => ({ ...current, reading: current.reading + chunk })),
    );
  }

  function startSelecting(event: React.FormEvent) {
    event.preventDefault();
    const question = draft.trim();
    if (question) {
      setSession({ ...INITIAL, question, deck: shuffleDeck() });
    }
  }

  function pick(index: number) {
    const { deck, picks, question } = session;
    if (picks.includes(index) || picks.length >= SPREAD_POSITIONS.length) {
      return;
    }
    const next = [...picks, index];
    if (next.length < SPREAD_POSITIONS.length) {
      setSession({ ...session, picks: next });
      return;
    }
    const drawn = drawFromShuffled(deck, next);
    setSession({ ...session, picks: next, drawn });
    void readCards(question, drawn);
  }

  /** 질문이 대화에 남았으면 true. 답이 한 글자도 오지 않았다면 질문째 거둔다 — 빈 말풍선도, 헛되이 깎인 질문 횟수도 남지 않는다. */
  async function ask(text: string): Promise<boolean> {
    const { question, drawn, reading, followUps } = session;
    const messages: Message[] = [...followUps, { role: "user", content: text }];
    setSession((current) => ({ ...current, followUps: [...messages, { role: "assistant", content: "" }] }));

    let answer = "";
    const finished = await stream("chat", "/api/chat", { question, cards: drawn, reading, messages }, (chunk) => {
      answer += chunk;
      setSession((current) => appendToAnswer(current, chunk));
    });

    if (answer.trim()) {
      return true;
    }
    setSession((current) => {
      const last = current.followUps.at(-1);
      return last?.role === "assistant" && !last.content.trim()
        ? { ...current, followUps: current.followUps.slice(0, -2) }
        : current;
    });
    if (finished) {
      setError({ on: "chat", message: EMPTY_ANSWER });
    }
    return false;
  }

  function restart() {
    abortRef.current?.abort();
    setSession(INITIAL);
    setDraft("");
    setBusy(null);
    setError(null);
  }

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-6">
          <header className="mb-10 flex items-baseline justify-between gap-4">
            <Link href="/" className="font-display text-lg text-gold-200 transition-colors hover:text-gold-300">
              밤의 타로
            </Link>
            {mode === "demo" && (
              <span
                data-testid="demo-badge"
                title="ANTHROPIC_API_KEY나 LLM_BASE_URL을 설정하면 실제 모델이 해석합니다."
                className="rounded-full border border-gold-600/50 px-3 py-1 text-[11px] text-gold-400"
              >
                데모 모드
              </span>
            )}
          </header>

          <AnimatePresence mode="wait">
            {phase === "question" && (
              <m.form
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
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="예) 지금 다니는 회사를 옮겨야 할지 고민이에요."
                  className="w-full resize-none rounded-xl border border-night-600 bg-night-800/60 px-5 py-4 text-[15px] leading-7 text-mist-100 placeholder:text-mist-500 focus:border-gold-500/60 focus:outline-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-mist-500">
                    {draft.length} / {MAX_QUESTION_LENGTH}
                  </span>
                  <button
                    type="submit"
                    disabled={draft.trim().length === 0}
                    className="rounded-full border border-gold-500/60 bg-gold-500/10 px-8 py-3 font-display text-base text-gold-200 transition-colors hover:bg-gold-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    카드 뽑기
                  </button>
                </div>
              </m.form>
            )}

            {phase === "selecting" && (
              <m.section
                key="selecting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm text-mist-300">{session.question}</p>
                  <p className="font-display text-sm text-gold-300">
                    <span data-testid="selection-count">
                      {session.picks.length} / {SPREAD_POSITIONS.length}
                    </span>
                  </p>
                </div>
                <p className="text-xs text-mist-500">
                  마음이 가는 순서대로 세 장을 고르세요. 첫 장은 과거, 둘째는 현재, 셋째는 미래의 자리입니다.
                </p>
                <CardGrid
                  total={session.deck.length}
                  selected={session.picks}
                  onSelect={pick}
                  locked={session.picks.length >= SPREAD_POSITIONS.length}
                />
              </m.section>
            )}

            {phase === "reading" && (
              <m.section key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
                <p className="text-sm text-mist-300">{session.question}</p>

                <SpreadBoard cards={session.drawn} />

                <ReadingStream
                  text={session.reading}
                  streaming={busy === "reading"}
                  error={error?.on === "reading" ? error.message : null}
                  onRetry={() => void readCards(session.question, session.drawn)}
                />

                {busy !== "reading" && error?.on !== "reading" && session.reading.length > 0 && (
                  <ChatPanel
                    messages={session.followUps}
                    onSend={ask}
                    busy={busy === "chat"}
                    remaining={MAX_FOLLOW_UP_TURNS - askedCount}
                    error={error?.on === "chat" ? error.message : null}
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
              </m.section>
            )}
          </AnimatePresence>
        </main>
      </LazyMotion>
    </MotionConfig>
  );
}
