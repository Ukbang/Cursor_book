"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NicknameGate } from "@/components/NicknameGate";

type QuizQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
};

const QuizResponseSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string(),
        prompt: z.string().min(1),
        options: z.tuple([
          z.string().min(1),
          z.string().min(1),
          z.string().min(1),
          z.string().min(1),
        ]),
        correctOptionIndex: z.number().int().min(0).max(3),
      })
    )
    .min(1),
});

function stripCodeFences(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();
}

export default function TeacherPage() {
  return (
    <NicknameGate>
      {({ uid, nickname }) => <TeacherInner uid={uid} nickname={nickname} />}
    </NicknameGate>
  );
}

function TeacherInner({
  uid,
  nickname,
}: {
  uid: string;
  nickname: string;
}) {
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(5);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [creating, setCreating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canCreate = useMemo(() => {
    const t = topic.trim();
    const k = geminiApiKey.trim();
    return t.length >= 1 && t.length <= 200 && questionCount >= 1 && k.length > 0;
  }, [topic, questionCount, geminiApiKey]);

  const onCreate = async () => {
    setError(null);
    const t = topic.trim();
    const k = geminiApiKey.trim();
    if (!t || !k) return;

    try {
      if (!db) {
        setError(
          "Firebase 설정이 누락되었습니다. .env.local에서 NEXT_PUBLIC_FIREBASE_* 또는 NEXT_PUBLIC_FIREBASE_CONFIG_JSON을 확인해 주세요."
        );
        setCreating(false);
        return;
      }

      setCreating(true);
      const client = new GoogleGenerativeAI(k);
      const model = client.getGenerativeModel({ model: geminiModel });
      const prompt = `
너는 교육용 퀴즈 생성기다.
아래 주제에 대해 사지선다형 객관식 퀴즈 ${questionCount}개를 생성해라.
응답은 JSON만 출력한다.
{
  "questions": [
    {
      "id": "q1",
      "prompt": "질문",
      "options": ["보기1","보기2","보기3","보기4"],
      "correctOptionIndex": 0
    }
  ]
}
주제: ${t}
`.trim();

      const result = await model.generateContent(prompt);
      const jsonText = stripCodeFences(result.response.text());
      const parsed = JSON.parse(jsonText) as unknown;
      const data = QuizResponseSchema.parse(parsed);
      const questions = data.questions as QuizQuestion[];

      const docRef = await addDoc(collection(db, "quizSessions"), {
        topic: t,
        questionCount,
        questions,
        createdAt: serverTimestamp(),
        createdByNickname: nickname,
        createdByUid: uid,
      });

      setSessionId(docRef.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create session");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-zinc-50 dark:bg-black">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              교수자: 퀴즈 세션 생성
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
              로그인 닉네임: <span className="font-medium">{nickname}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Gemini API Key
              </label>
              <input
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900/20"
                placeholder="AIza..."
                type="password"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-zinc-500">
                키는 저장되지 않고, 이 브라우저 요청에서만 퀴즈 생성에 사용됩니다.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                퀴즈 주제
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900/20"
                placeholder="예: 인공지능 개론, 확률과 통계, 생물학..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                문항 수
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-zinc-900 dark:text-zinc-50 outline-none"
              >
                {[3, 5, 8, 10, 15].map((n) => (
                  <option key={n} value={n}>
                    {n}문항
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Gemini 모델
              </label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-zinc-900 dark:text-zinc-50 outline-none"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="gemini-3.0-flash">gemini-3.0-flash</option>
              </select>
            </div>

            {error ? (
              <div className="text-sm text-red-600 dark:text-red-500">
                {error}
              </div>
            ) : null}

            <button
              onClick={onCreate}
              disabled={!canCreate || creating}
              className="w-full rounded-xl bg-zinc-900 text-white py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "세션 생성 중..." : "세션 생성"}
            </button>
          </div>
        </div>

        {sessionId ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 p-5">
            <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-50">
              세션 생성 완료
            </h2>
            <p className="mt-2 text-sm text-emerald-900/80 dark:text-emerald-50/80">
              참가 코드(세션 ID):
              <span className="ml-2 font-mono font-medium">{sessionId}</span>
            </p>
            <div className="mt-3">
              <Link
                href={`/learner?sessionId=${encodeURIComponent(sessionId)}`}
                className="inline-flex items-center rounded-xl bg-emerald-900 text-white px-4 py-2 font-medium hover:bg-emerald-800"
              >
                학습자 페이지로 이동
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

