import { NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GenerateQuizRequestSchema = z.object({
  topic: z.string().min(1).max(200),
  questionCount: z.number().int().min(1).max(20),
});

const GenerateQuizResponseSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string(),
        prompt: z.string().min(1).max(500),
        options: z
          .tuple([
            z.string().min(1).max(200),
            z.string().min(1).max(200),
            z.string().min(1).max(200),
            z.string().min(1).max(200),
          ])
          .transform((t) => [t[0], t[1], t[2], t[3]]),
        correctOptionIndex: z.number().int().min(0).max(3),
      })
    )
    .min(1),
});

function stripCodeFences(text: string) {
  // Gemini가 ```json ... ``` 형태로 답하면 제거합니다.
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, questionCount } =
      GenerateQuizRequestSchema.parse(body);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set" },
        { status: 500 }
      );
    }

    const modelName =
      process.env.GEMINI_MODEL && process.env.GEMINI_MODEL.trim().length > 0
        ? process.env.GEMINI_MODEL
        : "gemini-2.5-flash";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
너는 교육용 퀴즈 생성기다.
아래 주제에 대해 사지선다형 객관식 퀴즈 ${questionCount}개를 생성해라.

반드시 아래 JSON 스키마를 "있는 그대로" 출력하라.
응답은 JSON만 출력하며 마크다운/코드블록/설명 텍스트를 절대 포함하지 마라.

스키마:
{
  "questions": [
    {
      "id": "q1",
      "prompt": "질문 내용",
      "options": ["보기1","보기2","보기3","보기4"],
      "correctOptionIndex": 0
    }
  ]
}

검증 조건:
- questions 배열 길이는 정확히 ${questionCount}이어야 함
- options는 정확히 4개
- correctOptionIndex는 0~3 사이 정수
- 각 prompt/option은 빈 문자열이면 안됨

주제: ${topic}
`.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonText = stripCodeFences(text);

    const parsed = JSON.parse(jsonText) as unknown;
    const data = GenerateQuizResponseSchema.parse(parsed);

    if (data.questions.length !== questionCount) {
      return NextResponse.json(
        { error: "Gemini returned unexpected question count" },
        { status: 502 }
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Failed to generate quiz";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

