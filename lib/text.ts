/**
 * 모델이 쓴 글을 문단으로 나눈다. 공백만 있는 줄도 빈 줄로 본다 —
 * EXAONE은 문단 끝에 공백 두 칸을 붙여 "  \n\n"으로 끊곤 한다.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}
