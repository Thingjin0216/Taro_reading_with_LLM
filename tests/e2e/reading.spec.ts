import { expect, test, type Page } from "@playwright/test";

const QUESTION = "이직을 해야 할까?";
const FOLLOW_UP = "언제 움직이는 게 좋을까요?";

/**
 * 하이드레이션이 끝나기 전에 입력하면 React가 값을 비워 버린다.
 * 버튼이 살아날 때까지 입력을 다시 시도한다.
 */
async function askQuestion(page: Page, text: string) {
  const field = page.getByLabel("무엇이 궁금한가요?");
  const submit = page.getByRole("button", { name: "카드 뽑기" });

  await expect(async () => {
    await field.fill(text);
    await expect(submit).toBeEnabled({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });

  await submit.click();
}

async function pickThreeCards(page: Page) {
  const cards = page.getByRole("button", { name: /^카드 \d+$/ });
  await expect(cards).toHaveCount(78);
  for (const index of [0, 7, 30]) {
    await cards.nth(index).click();
  }
}

test("데모 모드에서 질문부터 후속 대화까지 한 번에 진행한다", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "리딩 시작" }).click();
  await expect(page).toHaveURL(/\/reading$/);

  await askQuestion(page, QUESTION);

  await pickThreeCards(page);

  const spread = page.getByTestId("spread");
  await expect(spread).toBeVisible();
  await expect(spread).toContainText("과거");
  await expect(spread).toContainText("현재");
  await expect(spread).toContainText("미래");

  const reading = page.getByTestId("reading-text");
  await expect(reading).toContainText(QUESTION);
  await expect(reading).toContainText("세 장을 이어 보면", { timeout: 40_000 });

  await expect(page.getByTestId("demo-badge")).toBeVisible();

  await page.getByLabel("더 물어보기").fill(FOLLOW_UP);
  await page.getByRole("button", { name: "보내기" }).click();

  const chat = page.getByTestId("chat");
  await expect(chat).toContainText(FOLLOW_UP);
  await expect(chat).toContainText("라고 물으셨군요", { timeout: 40_000 });
});

test("카드를 세 장 고르기 전에는 해석으로 넘어가지 않는다", async ({ page }) => {
  await page.goto("/reading");

  await askQuestion(page, QUESTION);

  const cards = page.getByRole("button", { name: /^카드 \d+$/ });
  await cards.nth(3).click();
  await cards.nth(9).click();

  await expect(page.getByTestId("selection-count")).toHaveText("2 / 3");
  await expect(page.getByTestId("spread")).toHaveCount(0);
});

test("애니메이션을 줄인 환경에서도 같은 흐름이 끝까지 동작한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/reading");

  await askQuestion(page, QUESTION);
  await pickThreeCards(page);

  await expect(page.getByTestId("reading-text")).toContainText(QUESTION, { timeout: 40_000 });
});
