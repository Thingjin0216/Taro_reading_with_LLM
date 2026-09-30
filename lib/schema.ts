import { z } from "zod";
import { MAX_FOLLOW_UP_TURNS, MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH, MAX_QUESTION_LENGTH } from "./constants";
import type { Message } from "./llm/types";
import { getCard } from "./tarot/deck";
import { SPREAD_POSITIONS } from "./tarot/draw";

const drawnCardSchema = z.object({
  id: z.string().refine((id) => getCard(id) !== undefined, { message: "덱에 없는 카드입니다" }),
  reversed: z.boolean(),
  position: z.enum(SPREAD_POSITIONS),
});

const spreadSchema = z
  .array(drawnCardSchema)
  .length(SPREAD_POSITIONS.length, `카드는 ${SPREAD_POSITIONS.length}장이어야 합니다`)
  .refine((cards) => new Set(cards.map((card) => card.id)).size === cards.length, {
    message: "같은 카드가 두 번 나올 수 없습니다",
  })
  .refine((cards) => SPREAD_POSITIONS.every((position) => cards.some((card) => card.position === position)), {
    message: "과거·현재·미래 자리가 모두 있어야 합니다",
  });

export const readingRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "질문을 입력해 주세요")
    .max(MAX_QUESTION_LENGTH, `질문은 ${MAX_QUESTION_LENGTH}자까지 쓸 수 있습니다`),
  cards: spreadSchema,
});

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

export const chatRequestSchema = readingRequestSchema.extend({
  /** 앞서 들려준 첫 해석. 대화 턴이 아니라 따로 받아 고정된 맥락으로 쓴다. */
  reading: z.string().trim().min(1, "해석이 비어 있습니다").max(MAX_MESSAGE_LENGTH),
  /** 후속 대화만 — 마지막은 이번에 묻는 질문이다. */
  messages: z
    .array(messageSchema)
    .min(1, "대화 내용이 비어 있습니다")
    .max(MAX_FOLLOW_UP_TURNS * 2)
    .refine((messages) => messages.at(-1)?.role === "user", { message: "마지막 메시지는 질문이어야 합니다" })
    .refine(
      (messages) => messages.filter((message) => message.role === "user").length <= MAX_FOLLOW_UP_TURNS,
      { message: `후속 질문은 ${MAX_FOLLOW_UP_TURNS}번까지 할 수 있습니다` },
    ),
});

/** 오래된 대화는 버리고 최근 것만 남긴다. 잘린 자리가 답으로 시작하면 그 답도 버린다. */
export function trimHistory(messages: Message[]): Message[] {
  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  return recent[0]?.role === "assistant" ? recent.slice(1) : recent;
}
