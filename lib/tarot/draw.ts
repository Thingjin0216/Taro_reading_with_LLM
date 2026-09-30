import { DECK, requireCard, type TarotCard } from "./deck";

/** 0 이상 1 미만의 난수를 내놓는 함수. 테스트에서는 결정적인 값을 주입한다. */
export type Rng = () => number;

export const SPREAD_POSITIONS = ["past", "present", "future"] as const;

export type SpreadPosition = (typeof SPREAD_POSITIONS)[number];

export const SPREAD_LABELS: Record<SpreadPosition, string> = {
  past: "과거",
  present: "현재",
  future: "미래",
};

/** 역방향이 너무 자주 나오면 리딩이 어두워지기만 해서 절반보다 낮게 잡았다. */
export const REVERSAL_PROBABILITY = 0.35;

export interface DrawnCard {
  id: string;
  reversed: boolean;
  position: SpreadPosition;
}

export function orientationLabel(reversed: boolean): string {
  return reversed ? "역방향" : "정방향";
}

/** 뽑힌 카드를 해석에 필요한 말로 풀어 둔다. 프롬프트와 데모 대역이 함께 쓴다. */
export function describeDrawn(drawn: DrawnCard) {
  const card = requireCard(drawn.id);
  return {
    card,
    positionLabel: SPREAD_LABELS[drawn.position],
    orientation: orientationLabel(drawn.reversed),
    keywords: drawn.reversed ? card.keywordsReversed : card.keywordsUpright,
  };
}

/** mulberry32 — 시드를 주면 같은 순서를 재현하므로 테스트에 쓴다. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeck(rng: Rng = Math.random): TarotCard[] {
  const cards = [...DECK];
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/**
 * 섞인 덱에서 사용자가 고른 자리의 카드를 뽑는다.
 * 고른 순서가 곧 과거 → 현재 → 미래다.
 */
export function drawFromShuffled(
  shuffled: readonly TarotCard[],
  picks: readonly number[],
  rng: Rng = Math.random,
): DrawnCard[] {
  if (picks.length !== SPREAD_POSITIONS.length) {
    throw new Error(`카드는 ${SPREAD_POSITIONS.length}장을 골라야 합니다 (받은 수: ${picks.length})`);
  }
  if (new Set(picks).size !== picks.length) {
    throw new Error("같은 자리를 두 번 고를 수 없습니다");
  }
  for (const pick of picks) {
    if (!Number.isInteger(pick) || pick < 0 || pick >= shuffled.length) {
      throw new Error(`덱 범위를 벗어난 자리입니다: ${pick}`);
    }
  }

  return picks.map((pick, index) => ({
    id: shuffled[pick].id,
    reversed: rng() < REVERSAL_PROBABILITY,
    position: SPREAD_POSITIONS[index],
  }));
}
