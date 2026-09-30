import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-2xl flex-col items-center justify-center gap-10 px-6 py-20 text-center">
      <div className="space-y-5">
        <p className="text-xs tracking-[0.4em] text-gold-500">TAROT · PAST PRESENT FUTURE</p>
        <h1 className="font-display text-5xl leading-tight text-gold-200 sm:text-6xl">밤의 타로</h1>
        <p className="text-balance text-base leading-relaxed text-mist-300">
          마음에 걸리는 것을 한 줄로 적고, 78장 가운데 세 장을 고르세요.
          <br className="hidden sm:block" />
          과거·현재·미래의 자리에서 카드가 무엇을 비추는지 읽어 드립니다.
        </p>
      </div>

      <Link
        href="/reading"
        className="rounded-full border border-gold-500/60 bg-gold-500/10 px-10 py-3 font-display text-lg text-gold-200 transition-colors hover:bg-gold-500/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400"
      >
        리딩 시작
      </Link>

      <ol className="grid w-full gap-3 text-left text-sm text-mist-400 sm:grid-cols-3">
        {[
          ["01", "질문을 적습니다", "구체적일수록 해석이 선명해집니다."],
          ["02", "세 장을 고릅니다", "고른 순서가 과거·현재·미래가 됩니다."],
          ["03", "이어서 묻습니다", "해석을 읽고 궁금한 걸 더 물어보세요."],
        ].map(([step, title, detail]) => (
          <li key={step} className="rounded-lg border border-night-600/70 bg-night-800/50 p-4">
            <span className="font-display text-xs text-gold-500">{step}</span>
            <p className="mt-1 text-mist-100">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-mist-500">{detail}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
