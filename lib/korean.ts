/**
 * 한국어 조사는 앞말의 받침 유무에 따라 달라진다.
 * 카드 이름이 "힘", "컵 퀸", "완드 8"처럼 제각각이라 문장을 조립할 때마다 필요하다.
 */
export type ParticlePair = "이/가" | "을/를" | "은/는" | "와/과";

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const FINAL_CONSONANT_COUNT = 28;

/** 숫자는 한자음으로 읽는다: 0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔, 10 십에 받침이 있다. */
const DIGIT_HAS_FINAL: Record<string, boolean> = {
  "0": true,
  "1": true,
  "2": false,
  "3": true,
  "4": false,
  "5": false,
  "6": true,
  "7": true,
  "8": true,
  "9": false,
};

function endsWithConsonant(word: string): boolean {
  const last = word.trim().at(-1);
  if (!last) {
    return false;
  }

  if (last >= "0" && last <= "9") {
    return DIGIT_HAS_FINAL[last];
  }

  const code = last.charCodeAt(0);
  if (code < HANGUL_START || code > HANGUL_END) {
    return false;
  }
  return (code - HANGUL_START) % FINAL_CONSONANT_COUNT !== 0;
}

export function withParticle(word: string, pair: ParticlePair): string {
  const [afterConsonant, afterVowel] = pair.split("/");
  return word + (endsWithConsonant(word) ? afterConsonant : afterVowel);
}
