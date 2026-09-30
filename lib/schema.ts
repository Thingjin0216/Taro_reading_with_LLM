import { z } from "zod";
import { getCard } from "./tarot/deck";
import { SPREAD_POSITIONS } from "./tarot/draw";
import type { Message } from "./llm/types";

export const MAX_QUESTION_LENGTH = 500;
export const MAX_MESSAGE_LENGTH = 4000;
/** 한 요청에 실어 보낼 대화 길이 상한 — 토큰이 무한정 늘어나지 않게 자른다. */
export const MAX_HISTORY_MESSAGES = 12;
export const MAX_FOLLOW_UP_TURNS = 10;

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

export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

export const chatRequestSchema = readingRequestSchema.extend({
  messages: z
    .array(messageSchema)
    .min(1, "대화 내용이 비어 있습니다")
    .max(MAX_HISTORY_MESSAGES * 4)
    .refine(
      (messages) => messages.filter((message) => message.role === "user").length <= MAX_FOLLOW_UP_TURNS,
      { message: `후속 질문은 ${MAX_FOLLOW_UP_TURNS}번까지 할 수 있습니다` },
    ),
});

export type ReadingRequest = z.infer<typeof readingRequestSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;

/** 오래된 대화는 버리고 최근 것만 남긴다. */
export function trimHistory(messages: Message[]): Message[] {
  return messages.length <= MAX_HISTORY_MESSAGES ? messages : messages.slice(-MAX_HISTORY_MESSAGES);
}
