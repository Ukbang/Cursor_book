import { GEMINI_API_KEY, GEMINI_MODEL } from "./firebase-config.js";

const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * 스터디 소개글 AI 자동 생성
 * @param {string} title - 스터디 제목
 * @param {string} category - 카테고리
 * @returns {Promise<string>} 생성된 소개글
 */
export async function generateStudyDescription(title, category) {
  const categoryKo = {
    programming: "프로그래밍",
    language: "어학",
    certificate: "자격증",
    employment: "취업",
    reading: "독서",
    etc: "기타"
  }[category] || category;

  const prompt = `스터디 모임 플랫폼에서 사용할 스터디 소개글을 작성해주세요.

스터디 제목: ${title}
카테고리: ${categoryKo}

요구사항:
- 3~5문장 분량의 자연스러운 한국어 소개글
- 스터디의 목표, 학습 방식, 기대 효과를 포함
- 참여자를 모집하는 매력적인 톤
- 마크다운 없이 순수 텍스트만 출력
- 특수문자나 이모지 없이 깔끔하게 작성`;

  const response = await fetch(GEMINI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 512
      }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API 오류 (${response.status})`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("AI 응답을 받지 못했습니다.");
  return text.trim();
}
