import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return NextResponse.json(
      { message: "GEMINI_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    corpName?: string;
    bsnsYear?: string;
    reprtCode?: string;
    accounts?: unknown[];
  };

  if (!body.corpName || !body.bsnsYear || !body.reprtCode || !Array.isArray(body.accounts)) {
    return NextResponse.json({ message: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  });

  const prompt = `
다음은 ${body.corpName}의 ${body.bsnsYear}년 재무데이터(${body.reprtCode})입니다.
일반인도 이해하기 쉽게 한국어로 설명해 주세요.

요구사항:
1) 한 줄 요약
2) 매출/이익/자산/부채/자본 흐름을 쉬운 비유로 설명
3) 좋은 신호 2개, 주의 신호 2개
4) "그래서 지금 이 회사는 어떤 상태인지" 3줄 결론
5) 숫자 단위는 콤마를 넣어 읽기 쉽게 표기

원본 데이터(JSON):
${JSON.stringify(body.accounts)}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  return NextResponse.json({ analysis: text });
}
