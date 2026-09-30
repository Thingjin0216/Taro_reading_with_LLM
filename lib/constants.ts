/** 응답이 실제 모델에서 왔는지 데모 대역에서 왔는지 알려 주는 헤더. */
export const READING_MODE_HEADER = "x-reading-mode";

// 요청 크기 상한. 서버 검증(lib/schema.ts)과 입력창이 함께 쓴다.
// 스키마 파일에 두면 입력창 때문에 zod가 통째로 브라우저로 딸려 가서 여기 따로 둔다.
export const MAX_QUESTION_LENGTH = 500;
export const MAX_MESSAGE_LENGTH = 4000;
/** 후속 대화에서 한 요청에 실어 보낼 메시지 수 — 토큰이 무한정 늘지 않게 자른다. */
export const MAX_HISTORY_MESSAGES = 12;
export const MAX_FOLLOW_UP_TURNS = 10;
