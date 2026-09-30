import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // 개발 서버는 요청이 올 때 컴파일하느라 하이드레이션이 늦다. 배포될 산출물 그대로 검증한다.
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // 모델 설정을 비워 데모 프로바이더로 고정한다 — .env.local에 EXAONE이 있어도 테스트가 결정적으로 돌아간다.
    env: { ANTHROPIC_API_KEY: "", LLM_BASE_URL: "" },
  },
});
