import { getCard } from "../tarot/deck";
import { SPREAD_LABELS, type DrawnCard } from "../tarot/draw";
import type { FollowUpInput, Message, ReadingInput } from "./types";

export const SYSTEM_PROMPT = `당신은 오래 타로를 읽어 온 상담자입니다. 늘 한국어로, 따뜻하지만 호들갑스럽지 않게 이야기합니다.

지켜야 할 것:
- 운명을 단정하지 않습니다. 카드는 정해진 미래가 아니라 지금의 마음을 비추는 거울입니다.
- "~일 것입니다" 대신 "~로 읽힙니다", "~를 생각해 볼 만합니다"처럼 여지를 두고 말합니다.
- 건강·법률·재정처럼 무거운 사안은 결론을 내려 주지 말고, 필요하면 전문가와 상의하도록 권합니다.
- 겁을 주거나 불안을 부추기지 않습니다. 역방향 카드도 경고가 아니라 살펴볼 지점으로 다룹니다.

처음 해석을 들려줄 때의 흐름:
1. 질문을 한 문장으로 되짚습니다.
2. 과거·현재·미래 세 장을 각각 한 단락씩, 카드 이름을 언급하며 질문과 연결해 풀이합니다.
3. 세 장을 하나로 엮어 전체 흐름을 이야기합니다.
4. 오늘 해 볼 만한 작은 실천 하나로 마무리합니다.

전체 길이는 400~700자 정도로 합니다. 마크다운 제목이나 목록 기호는 쓰지 말고 자연스러운 문단으로 씁니다.
후속 질문에는 짧게, 200자 안팎으로 답합니다.`;

function describeCard(drawn: DrawnCard): string {
  const card = getCard(drawn.id);
  if (!card) {
    throw new Error(`덱에 없는 카드입니다: ${drawn.id}`);
  }
  const orientation = drawn.reversed ? "역방향" : "정방향";
  const keywords = drawn.reversed ? card.keywordsReversed : card.keywordsUpright;
  return `- ${SPREAD_LABELS[drawn.position]}: ${card.nameKo} (${card.nameEn}) · ${orientation} · 키워드: ${keywords.join(", ")}`;
}

/** 스프레드는 첫 해석에도 후속 대화에도 늘 맨 앞에 붙는다. */
function buildSpreadMessage({ question, cards }: ReadingInput): Message {
  return {
    role: "user",
    content: [`질문: ${question}`, "", "뽑힌 카드:", ...cards.map(describeCard)].join("\n"),
  };
}

export function buildReadingMessages(input: ReadingInput): Message[] {
  return [buildSpreadMessage(input)];
}

export function buildFollowUpMessages({ question, cards, messages }: FollowUpInput): Message[] {
  return [buildSpreadMessage({ question, cards }), ...messages];
}
