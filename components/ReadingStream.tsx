import { ModelText } from "./ModelText";

interface ReadingStreamProps {
  text: string;
  streaming: boolean;
  error: string | null;
  onRetry: () => void;
}

export function ReadingStream({ text, streaming, error, onRetry }: ReadingStreamProps) {
  return (
    <div className="space-y-5">
      <div data-testid="reading-text" className="space-y-5 text-[15px] leading-8 text-mist-100">
        <ModelText text={text} streaming={streaming} placeholder="카드를 읽는 중" />
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gold-600/40 bg-night-800/70 px-4 py-3 text-sm text-mist-300"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full border border-gold-500/60 px-4 py-1.5 text-gold-200 transition-colors hover:bg-gold-500/15"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  );
}
