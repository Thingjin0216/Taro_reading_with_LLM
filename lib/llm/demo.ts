import { setTimeout as sleep } from "node:timers/promises";
import { withParticle } from "../korean";
import { describeDrawn, type SpreadPosition } from "../tarot/draw";
import type { FollowUpInput, ReadingInput, ReadingProvider } from "./types";

/** 실제 스트리밍과 비슷한 리듬을 내려고 조금씩 끊어 보낸다. */
const CHUNK_SIZE = 8;
const CHUNK_DELAY_MS = 15;

const POSITION_NOTE: Record<SpreadPosition, string> = {
  past: "지나온 시간이 지금의 당신에게 남긴 결이 여기에 담겨 있습니다.",
  present: "지금 이 순간 가장 크게 작동하고 있는 힘입니다.",
  future: "지금의 마음이 이대로 이어질 때 열리는 방향입니다.",
};

function readingText({ question, cards }: ReadingInput): string {
  const paragraphs = [`"${question}" — 이 질문을 품고 뽑은 세 장을 함께 봅니다.`];

  for (const drawn of cards) {
    const { card, positionLabel, orientation, keywords } = describeDrawn(drawn);
    paragraphs.push(
      `${positionLabel}의 자리에는 ${withParticle(card.nameKo, "이/가")} ${orientation}으로 놓였습니다. ` +
        `${keywords[0]}, ${keywords[1]} 같은 말이 먼저 떠오르는 카드입니다. ` +
        POSITION_NOTE[drawn.position],
    );
  }

  paragraphs.push(
    "세 장을 이어 보면, 지나온 자리에서 지금으로 넘어온 흐름이 당신을 하나의 문 앞에 데려다 놓았습니다. " +
      "답을 서둘러 정하기보다, 오늘 하루 이 질문을 품은 채 마음이 어느 쪽으로 기우는지 지켜보세요. " +
      "그 기울기가 카드보다 정확한 답일 때가 많습니다.",
  );

  return paragraphs.join("\n\n");
}

function followUpText({ question, cards, messages }: FollowUpInput): string {
  const latest = messages.findLast((message) => message.role === "user")?.content ?? question;
  const present = cards.find((card) => card.position === "present") ?? cards[0];
  const name = describeDrawn(present).card.nameKo;

  return (
    `"${latest}" 라고 물으셨군요. 현재 자리의 ${withParticle(name, "을/를")} 다시 들여다봅니다. ` +
    "카드는 정해진 답을 주기보다, 당신이 이미 알고 있는 것을 조금 더 또렷하게 비춰 줍니다. " +
    "지금 마음에 걸리는 한 가지를 먼저 적어 보시면, 다음 발걸음이 생각보다 가까이 있을 겁니다."
  );
}

async function* typeOut(text: string): AsyncIterable<string> {
  for (let index = 0; index < text.length; index += CHUNK_SIZE) {
    yield text.slice(index, index + CHUNK_SIZE);
    await sleep(CHUNK_DELAY_MS);
  }
}

/** API 키 없이도 전체 흐름을 끝까지 체험할 수 있게 해 주는 대역. */
export const demoProvider: ReadingProvider = {
  streamReading: (input) => typeOut(readingText(input)),
  streamFollowUp: (input) => typeOut(followUpText(input)),
};
