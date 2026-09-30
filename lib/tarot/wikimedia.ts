import { getCard, type MinorSuit } from "./deck";

/**
 * 카드 이미지는 위키미디어 공용(Wikimedia Commons)의 라이더-웨이트-스미스 1909년판에서 받는다.
 * 파일명 규칙이 메이저와 마이너가 서로 달라서 여기서 한 번에 흡수한다.
 */
const MAJOR_TITLES = [
  "00_Fool", "01_Magician", "02_High_Priestess", "03_Empress", "04_Emperor",
  "05_Hierophant", "06_Lovers", "07_Chariot", "08_Strength", "09_Hermit",
  "10_Wheel_of_Fortune", "11_Justice", "12_Hanged_Man", "13_Death", "14_Temperance",
  "15_Devil", "16_Tower", "17_Star", "18_Moon", "19_Sun", "20_Judgement", "21_World",
];

/** 커먼즈는 펜타클을 "Pents"로 줄여 쓴다. */
const SUIT_PREFIX: Record<MinorSuit, string> = {
  wands: "Wands",
  cups: "Cups",
  swords: "Swords",
  pentacles: "Pents",
};

export function sourceFileName(cardId: string): string {
  const card = getCard(cardId);
  if (!card) {
    throw new Error(`덱에 없는 카드입니다: ${cardId}`);
  }
  if (card.arcana === "major") {
    return `RWS_Tarot_${MAJOR_TITLES[card.number]}.jpg`;
  }
  return `${SUIT_PREFIX[card.suit!]}${String(card.number).padStart(2, "0")}.jpg`;
}

export function sourceUrl(cardId: string, width: number): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${sourceFileName(cardId)}?width=${width}`;
}
