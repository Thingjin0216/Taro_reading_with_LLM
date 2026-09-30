import { describe, expect, it } from "vitest";
import { getCard } from "../tarot/deck";
import type { DrawnCard } from "../tarot/draw";
import { followUpPrompt, readingPrompt } from "./prompts";

const cards: DrawnCard[] = [
  { id: "major-00", reversed: false, position: "past" },
  { id: "cups-03", reversed: true, position: "present" },
  { id: "swords-10", reversed: false, position: "future" },
];

const question = "이직을 해야 할까?";

const reading = "세 장을 함께 보면, 지금의 망설임은 준비가 덜 되어서가 아니라…";

const conversation = [
  { role: "user" as const, content: "지금 옮기는 게 나을까요?" },
  { role: "assistant" as const, content: "현재 자리의 절제가 말해 주듯…" },
  { role: "user" as const, content: "그럼 언제쯤이 좋을까요?" },
];

describe("readingPrompt", () => {
  const { system, messages } = readingPrompt({ question, cards });
  const [spread] = messages;

  it("tells the reader to answer in Korean without declaring fate", () => {
    expect(system).toContain("한국어");
    expect(system).toContain("단정");
  });

  it("pins the reading to five paragraphs, one card each, opened by its position", () => {
    expect(system).toContain("다섯 문단");
    expect(system).toContain('"과거의 자리에는"');
    expect(system).toContain('"현재의 자리에는"');
    expect(system).toContain('"미래의 자리에는"');
  });

  it("asks the reader to open by addressing the person in its own words", () => {
    expect(system).toContain("자신의 말로");
  });

  it("never shows the model a question label it could copy", () => {
    // "질문:"을 쓰지 말라고 적었더니 EXAONE이 오히려 8번 모두 "질문:"으로 시작했다.
    expect(system).not.toContain("질문:");
  });

  it("sends the spread as a single user message", () => {
    expect(messages).toHaveLength(1);
    expect(spread.role).toBe("user");
  });

  it("hands over the question on its own line, with no label or quotes to mirror", () => {
    // 라벨을 달면 답이 "질문:"으로, 따옴표로 감싸면 답의 첫 문장이 따옴표로 시작했다.
    expect(spread.content.split("\n")).toContain(question);
    expect(spread.content).not.toContain(`"${question}"`);
    expect(spread.content).not.toMatch(/^질문\s*:/m);
  });

  it("names each card with its position and orientation", () => {
    expect(spread.content).toContain("과거");
    expect(spread.content).toContain("현재");
    expect(spread.content).toContain("미래");
    expect(spread.content).toContain(getCard("major-00")!.nameKo);
    expect(spread.content).toContain(getCard("cups-03")!.nameKo);
    expect(spread.content).toContain(getCard("swords-10")!.nameKo);
    expect(spread.content).toContain("정방향");
    expect(spread.content).toContain("역방향");
  });

  it("passes the keywords matching each card's orientation", () => {
    expect(spread.content).toContain(getCard("major-00")!.keywordsUpright[0]);
    expect(spread.content).toContain(getCard("cups-03")!.keywordsReversed[0]);
  });
});

describe("followUpPrompt", () => {
  const { system, messages } = followUpPrompt({ question, cards, reading, messages: conversation });

  it("keeps the same reader and the same rules about not declaring fate", () => {
    expect(system).toContain("한국어");
    expect(system).toContain("단정");
  });

  it("does not ask for the five-paragraph reading again", () => {
    // 첫 해석용 형식 지시가 함께 있으면 EXAONE이 후속 질문에도 세 장을 처음부터 다시 풀이했다.
    expect(system).not.toContain("다섯 문단");
    expect(system).not.toContain('"과거의 자리에는"');
  });

  it("asks for a short, direct answer instead of a fresh reading", () => {
    expect(system).toContain("다시 풀이하지");
    expect(system).toContain("200자");
  });

  it("holds the spread and the earlier reading as fixed context, outside the chat turns", () => {
    // 해석을 assistant 차례로 보내면 대화가 길어질 때 잘려 나가고, 모델이 그 다섯 문단을 본보기로 삼았다.
    expect(system).toContain(question);
    expect(system).toContain(getCard("major-00")!.nameKo);
    expect(system).toContain(reading);
    expect(messages.some((message) => message.content.includes(reading))).toBe(false);
  });

  it("sends only the follow-up conversation as chat turns, starting with the user", () => {
    expect(messages).toHaveLength(conversation.length);
    expect(messages.slice(0, -1)).toEqual(conversation.slice(0, -1));
  });

  it("ends with the newest question plus a nearby reminder to answer briefly", () => {
    // 시스템 지시만으로는 부족했다 — 가장 가까운 자리에 한 번 더 일러 둔다.
    const last = messages.at(-1)!;
    expect(last.role).toBe("user");
    expect(last.content.startsWith(conversation.at(-1)!.content)).toBe(true);
    expect(last.content).toContain("두세 문장");
  });
});
