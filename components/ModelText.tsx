import { splitParagraphs } from "@/lib/text";

interface ModelTextProps {
  text: string;
  /** 아직 받는 중이면 마지막 문단 끝에 커서를 깜박인다. */
  streaming?: boolean;
  /** 받는 중인데 아직 한 글자도 없을 때 보여 줄 말. */
  placeholder?: string;
}

/** 모델이 쓴 글을 문단으로 나눠 보여 준다. 첫 해석과 후속 답변이 같은 규칙을 쓴다. */
export function ModelText({ text, streaming = false, placeholder = "" }: ModelTextProps) {
  const paragraphs = splitParagraphs(text);

  if (paragraphs.length === 0) {
    return streaming ? <p className="caret text-mist-400">{placeholder}</p> : null;
  }

  return paragraphs.map((paragraph, index) => (
    <p
      key={index}
      className={["whitespace-pre-line", streaming && index === paragraphs.length - 1 ? "caret" : ""].join(" ")}
    >
      {paragraph}
    </p>
  ));
}
