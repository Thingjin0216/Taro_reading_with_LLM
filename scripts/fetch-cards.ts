/**
 * 라이더-웨이트-스미스(1909) 카드 이미지를 위키미디어 공용에서 받아
 * public/cards/<card-id>.webp 로 저장한다.
 *
 *   npm run fetch:cards            이미 받은 카드는 건너뛴다
 *   npm run fetch:cards -- --force 전부 다시 받는다
 *
 * 네트워크가 막힌 환경이라면 README의 "카드 이미지" 절을 참고해 수동으로 채우면 된다.
 */
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import sharp from "sharp";
import { DECK } from "../lib/tarot/deck";
import { sourceUrl } from "../lib/tarot/wikimedia";

const WIDTH = 600;
const CONCURRENCY = 2;
const RETRIES = 5;
/** 위키미디어가 429를 돌려주므로 요청 사이에 숨을 돌린다. */
const PAUSE_MS = 400;
const OUT_DIR = path.join(process.cwd(), "public", "cards");
/** 위키미디어는 정체를 밝히지 않는 요청을 거부한다. */
const USER_AGENT = "taro-tarot-demo/1.0 (portfolio project; contact: repository issues)";

const force = process.argv.includes("--force");

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function download(url: string): Promise<Buffer> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": USER_AGENT } });
      if (response.status === 429) {
        // 서버가 알려 준 만큼만 기다리고 바로 다시 시도한다.
        const retryAfter = Number(response.headers.get("retry-after"));
        lastError = new Error("HTTP 429");
        await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : attempt * 5000);
        continue;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      await sleep(attempt * 1000);
    }
  }
  throw lastError;
}

async function fetchCard(cardId: string): Promise<"saved" | "skipped"> {
  const target = path.join(OUT_DIR, `${cardId}.webp`);
  if (!force && (await exists(target))) {
    return "skipped";
  }
  const original = await download(sourceUrl(cardId, WIDTH));
  await sleep(PAUSE_MS);
  const webp = await sharp(original).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  await writeFile(target, webp);
  return "saved";
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const queue = DECK.map((card) => card.id);
  const failures: Array<{ id: string; error: unknown }> = [];
  let saved = 0;
  let skipped = 0;

  async function worker() {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      try {
        const result = await fetchCard(id);
        if (result === "saved") {
          saved += 1;
          process.stdout.write(`. ${id}\n`);
        } else {
          skipped += 1;
        }
      } catch (error) {
        failures.push({ id, error });
        process.stdout.write(`x ${id}\n`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\n저장 ${saved}장 · 건너뜀 ${skipped}장 · 실패 ${failures.length}장`);
  for (const { id, error } of failures) {
    console.error(`  ${id}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

void main();
