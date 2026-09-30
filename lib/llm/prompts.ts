import { describeDrawn, type DrawnCard } from "../tarot/draw";
import type { FollowUpInput, Message, ReadingInput, ReadingProvider } from "./types";

export interface Prompt {
  system: string;
  messages: Message[];
}

/** 해석 한 편(400~700자)과 후속 답변을 넉넉히 담는 출력 상한. */
export const MAX_OUTPUT_TOKENS = 1200;

/** 첫 해석과 후속 답변이 함께 쓰는 상담자의 성격과 선. */
const READER = `당신은 오래 타로를 읽어 온 상담자입니다. 늘 한국어로, 따뜻하지만 호들갑스럽지 않게 이야기합니다.

지켜야 할 것:
- 운명을 단정하지 않습니다. 카드는 정해진 미래가 아니라 지금의 마음을 비추는 거울입니다.
- "~일 것입니다" 대신 "~로 읽힙니다", "~를 생각해 볼 만합니다"처럼 여지를 두고 말합니다.
- 건강·법률·재정처럼 무거운 사안은 결론을 내려 주지 말고, 필요하면 전문가와 상의하도록 권합니다.
- 겁을 주거나 불안을 부추기지 않습니다. 역방향 카드도 경고가 아니라 살펴볼 지점으로 다룹니다.
- 마크다운 제목·굵은 글씨·목록 기호는 쓰지 않습니다.`;

const READING_FORMAT = `처음 해석은 정확히 다섯 문단으로 쓰고, 문단 사이에는 빈 줄을 하나 둡니다.
1. 질문자에게 직접 건네는 한 문장입니다. 고민을 자신의 말로 헤아려 "~하고 계시군요"처럼 부드럽게 되짚습니다.
2. "과거의 자리에는"으로 시작해, 첫째 카드를 이름과 함께 질문에 이어 풀이합니다.
3. "현재의 자리에는"으로 시작해, 둘째 카드를 같은 방식으로 풀이합니다.
4. "미래의 자리에는"으로 시작해, 셋째 카드를 같은 방식으로 풀이합니다.
5. 세 장을 하나로 엮어 흐름을 이야기하고, 오늘 해 볼 만한 작은 실천 하나로 마무리합니다.

카드 한 장에 두세 문장, 전체 400~700자 정도로 씁니다.`;

/**
 * 첫 해석의 형식 지시와 한 프롬프트에 섞어 두면, 모델이 후속 질문에도
 * 세 장을 처음부터 다시 풀이하곤 했다. 그래서 후속 답변은 형식을 따로 준다.
 */
const FOLLOW_UP_FORMAT = `지금은 세 장의 해석을 이미 들려준 뒤, 이어진 질문에 답하는 중입니다.
카드를 처음부터 다시 풀이하지 말고 질문에 곧바로 답합니다. 필요하면 가장 관련 있는 카드 한 장만 짚습니다.
빈 줄 없이 한 문단, 두세 문장, 200자 안팎으로 씁니다.`;

const READING_SYSTEM = `${READER}\n\n${READING_FORMAT}`;
const FOLLOW_UP_SYSTEM = `${READER}\n\n${FOLLOW_UP_FORMAT}`;

/**
 * 첫 해석의 다섯 문단을 본보기 삼아 세 장을 다시 훑는 버릇이 시스템 지시만으로는 다 잡히지 않아서,
 * 가장 가까운 자리인 마지막 질문 뒤에 한 번 더 일러 둔다. 서버에서만 덧붙이므로 화면의 질문은 그대로다.
 */
const FOLLOW_UP_REMINDER = "(이 질문에만 곧바로, 두세 문장의 한 문단으로 답해 주세요.)";

function describeCard(drawn: DrawnCard): string {
  const { card, positionLabel, orientation, keywords } = describeDrawn(drawn);
  return `- ${positionLabel}: ${card.nameKo} (${card.nameEn}) · ${orientation} · 키워드: ${keywords.join(", ")}`;
}

/**
 * 질문과 뽑힌 카드. 첫 해석에서는 사용자 메시지로, 후속 답변에서는 고정 맥락으로 쓴다.
 * 질문에 "질문:" 라벨을 달거나 따옴표로 감싸면 모델이 그 모양을 답의 첫머리에 그대로 베낀다.
 */
function describeSpread({ question, cards }: ReadingInput): string {
  return ["오늘 찾아온 분이 이렇게 물었습니다.", question, "", "뽑힌 카드:", ...cards.map(describeCard)].join("\n");
}

export function readingPrompt(input: ReadingInput): Prompt {
  return {
    system: READING_SYSTEM,
    messages: [{ role: "user", content: describeSpread(input) }],
  };
}

/**
 * 스프레드와 첫 해석은 대화 턴이 아니라 시스템 프롬프트의 고정 맥락으로 넣는다.
 * 첫 해석을 assistant 차례로 보냈을 땐 대화가 길어지면 잘려 나갔고, 모델이 그 다섯 문단을 따라 했다.
 */
export function followUpPrompt({ question, cards, reading, messages }: FollowUpInput): Prompt {
  const system = [
    FOLLOW_UP_SYSTEM,
    "이번 리딩의 맥락입니다.",
    describeSpread({ question, cards }),
    `앞서 들려준 해석:\n${reading}`,
  ].join("\n\n");

  const latest = messages.at(-1);
  const withReminder =
    latest?.role === "user"
      ? [...messages.slice(0, -1), { ...latest, content: `${latest.content}\n\n${FOLLOW_UP_REMINDER}` }]
      : messages;

  return { system, messages: withReminder };
}

/** 프롬프트를 받아 텍스트를 흘려보내는 함수 하나로 프로바이더를 만든다. 무엇을 보낼지는 이 파일이 정한다. */
export function providerFromStream(stream: (prompt: Prompt) => AsyncIterable<string>): ReadingProvider {
  return {
    streamReading: (input) => stream(readingPrompt(input)),
    streamFollowUp: (input) => stream(followUpPrompt(input)),
  };
}
