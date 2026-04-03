"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NicknameGate } from "@/components/NicknameGate";
import { Leaderboard } from "@/components/Leaderboard";

type QuizQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
};

type QuizSession = {
  topic: string;
  questionCount: number;
  createdByNickname?: string;
  questions?: QuizQuestion[];
};

export default function LearnerPage() {
  return (
    <NicknameGate>
      {({ uid, nickname }) => <LearnerInner uid={uid} nickname={nickname} />}
    </NicknameGate>
  );
}

function LearnerInner({ uid, nickname }: { uid: string; nickname: string }) {
  const searchParams = useSearchParams();
  const paramSessionId = searchParams.get("sessionId") ?? "";

  const [sessionIdInput, setSessionIdInput] = useState(paramSessionId);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [startAttemptLoading, setStartAttemptLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);

  useEffect(() => {
    setSessionIdInput(paramSessionId);
    // Reset quiz state if the URL sessionId changes.
    setSession(null);
    setSessionError(null);
    setQuestions(null);
    setSelected([]);
    setAttemptId(null);
    setSubmittedScore(null);
  }, [paramSessionId]);

  useEffect(() => {
    const run = async () => {
      const sid = sessionIdInput.trim();
      if (!sid) {
        setSession(null);
        return;
      }

      if (!db) {
        setSessionError(
          "Firebase 설정이 누락되었습니다. .env.local에서 NEXT_PUBLIC_FIREBASE_* 또는 NEXT_PUBLIC_FIREBASE_CONFIG_JSON을 확인해 주세요."
        );
        setLoadingSession(false);
        return;
      }

      setLoadingSession(true);
      setSessionError(null);
      setSession(null);

      try {
        const snap = await getDoc(doc(db, "quizSessions", sid));
        if (!snap.exists()) {
          setSessionError("세션을 찾을 수 없어요. 참가 코드를 다시 확인해 주세요.");
          return;
        }

        const data = snap.data() as unknown as QuizSession;
        setSession({
          topic: typeof data.topic === "string" ? data.topic : "",
          questionCount:
            typeof data.questionCount === "number"
              ? data.questionCount
              : 0,
          createdByNickname:
            typeof data.createdByNickname === "string"
              ? data.createdByNickname
              : undefined,
          questions: Array.isArray(data.questions)
            ? (data.questions as QuizQuestion[])
            : undefined,
        });
      } catch (e) {
        setSessionError(
          e instanceof Error ? e.message : "세션 조회에 실패했습니다."
        );
      } finally {
        setLoadingSession(false);
      }
    };

    run();
  }, [sessionIdInput]);

  const sessionReady = useMemo(() => {
    return !!session && session.topic.trim().length > 0 && session.questionCount > 0;
  }, [session]);

  const canSubmit = useMemo(() => {
    if (!questions) return false;
    if (submittedScore !== null) return false;
    if (selected.length !== questions.length) return false;
    return selected.every((v) => typeof v === "number" && v >= 0);
  }, [questions, selected, submittedScore]);

  const startAttempt = async () => {
    if (!sessionReady || !session) return;

    if (!db) {
      setSessionError(
        "Firebase 설정이 누락되었습니다. .env.local에서 NEXT_PUBLIC_FIREBASE_* 또는 NEXT_PUBLIC_FIREBASE_CONFIG_JSON을 확인해 주세요."
      );
      return;
    }

    setStartAttemptLoading(true);
    setSessionError(null);
    setQuestions(null);
    setSelected([]);
    setAttemptId(null);
    setSubmittedScore(null);

    try {
      const questionsPayload = session.questions;
      if (!questionsPayload || questionsPayload.length === 0) {
        throw new Error(
          "세션에 문제 데이터가 없습니다. 교수자가 세션 생성 시 퀴즈를 생성했는지 확인해 주세요."
        );
      }
      const attemptRef = await addDoc(collection(db, "quizAttempts"), {
        sessionId: sessionIdInput.trim(),
        uid,
        nickname,
        status: "in_progress",
        score: 0,
        answers: [],
        createdAt: serverTimestamp(),
      });

      setAttemptId(attemptRef.id);
      setQuestions(questionsPayload);
      setSelected(Array(questionsPayload.length).fill(-1));
    } catch (e) {
      setSessionError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setStartAttemptLoading(false);
    }
  };

  const submit = async () => {
    if (!questions || !attemptId) return;
    if (submittedScore !== null) return;
    if (!canSubmit) return;

    if (!db) {
      setSessionError(
        "Firebase 설정이 누락되었습니다. .env.local에서 NEXT_PUBLIC_FIREBASE_* 또는 NEXT_PUBLIC_FIREBASE_CONFIG_JSON을 확인해 주세요."
      );
      return;
    }

    setSubmitLoading(true);
    try {
      let correctCount = 0;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (selected[i] === q.correctOptionIndex) correctCount++;
      }

      await updateDoc(doc(db, "quizAttempts", attemptId), {
        status: "completed",
        score: correctCount,
        answers: selected,
        completedAt: serverTimestamp(),
      });

      setSubmittedScore(correctCount);
    } catch (e) {
      setSessionError(
        e instanceof Error ? e.message : "제출 처리에 실패했습니다."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const sessionId = sessionIdInput.trim();

  return (
    <div className="min-h-screen p-6 bg-zinc-50 dark:bg-black">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              학습자: 퀴즈 응시
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mt-1">
              닉네임: <span className="font-medium">{nickname}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-5">
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  참가 코드(세션 ID)
                </label>
                <input
                  value={sessionIdInput}
                  onChange={(e) => setSessionIdInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  placeholder="예: AbCdEf12..."
                />
              </div>
              <div className="w-40">
                <button
                  onClick={() => startAttempt()}
                  disabled={!sessionReady || startAttemptLoading}
                  className="w-full rounded-xl bg-zinc-900 text-white py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startAttemptLoading ? "퀴즈 생성 중..." : "Start Attempt"}
                </button>
              </div>
            </div>

            {loadingSession ? (
              <div className="text-sm text-zinc-600">세션 확인 중...</div>
            ) : null}

            {sessionError ? (
              <div className="text-sm text-red-600 dark:text-red-500">
                {sessionError}
              </div>
            ) : null}

            {sessionReady && session ? (
              <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800 p-4 bg-zinc-50/30 dark:bg-zinc-900/20">
                <div className="text-sm text-zinc-700 dark:text-zinc-200">
                  주제: <span className="font-medium">{session.topic}</span>
                </div>
                <div className="text-sm text-zinc-700 dark:text-zinc-200 mt-1">
                  문항: <span className="font-medium">{session.questionCount}</span>
                </div>
                {session.createdByNickname ? (
                  <div className="text-xs text-zinc-500 mt-2">
                    교수자: {session.createdByNickname}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {sessionId && sessionReady ? (
          <Leaderboard sessionId={sessionId} />
        ) : null}

        {questions ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                퀴즈
              </h2>
              <div className="text-xs text-zinc-500 font-mono">
                attempt:{attemptId ?? "..." }
              </div>
            </div>

            <div className="mt-4 space-y-5">
              {questions.map((q, idx) => (
                <div key={q.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                      {idx + 1}. {q.prompt}
                    </div>
                    {submittedScore !== null ? (
                      <div className="text-xs text-zinc-500">
                        {selected[idx] === q.correctOptionIndex
                          ? "정답"
                          : "오답"}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((opt, optIdx) => {
                      const checked = selected[idx] === optIdx;
                      const disabled = submittedScore !== null;
                      return (
                        <label
                          key={optIdx}
                          className={[
                            "cursor-pointer rounded-xl border px-4 py-3",
                            checked
                              ? "border-zinc-900 bg-zinc-50 dark:bg-zinc-900/30"
                              : "border-zinc-200/70 dark:border-zinc-800",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              checked={checked}
                              disabled={disabled}
                              onChange={() => {
                                setSelected((prev) => {
                                  const next = [...prev];
                                  next[idx] = optIdx;
                                  return next;
                                });
                              }}
                            />
                            <div className="text-sm text-zinc-900 dark:text-zinc-50">
                              {String.fromCharCode(65 + optIdx)}. {opt}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {submittedScore !== null ? (
              <div className="mt-6 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/30 p-4">
                <div className="text-sm text-emerald-900 dark:text-emerald-50">
                  제출 완료!
                </div>
                <div className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-50">
                  내 점수: {submittedScore} / {questions.length}
                </div>
              </div>
            ) : (
              <button
                onClick={() => submit()}
                disabled={!canSubmit || submitLoading}
                className="mt-6 w-full rounded-xl bg-emerald-900 text-white py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitLoading ? "제출 처리 중..." : "Submit"}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

