"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

type LeaderboardEntry = {
  attemptId: string;
  nickname: string;
  score: number;
  completedAtMs?: number;
};

export function Leaderboard({ sessionId }: { sessionId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // Avoid synchronous setState in effect body.
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      setEntries([]);
    });

    if (!db) {
      queueMicrotask(() => {
        setError(
          "Firebase 설정이 누락되었습니다. .env.local에서 NEXT_PUBLIC_FIREBASE_* 또는 NEXT_PUBLIC_FIREBASE_CONFIG_JSON을 확인해 주세요."
        );
        setLoading(false);
      });
      return;
    }

    const q = query(
      collection(db, "quizAttempts"),
      where("sessionId", "==", sessionId),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const raw: LeaderboardEntry[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status !== "completed") return;

          const completedAtMs =
            data.completedAt && typeof data.completedAt.toMillis === "function"
              ? data.completedAt.toMillis()
              : undefined;

          raw.push({
            attemptId: docSnap.id,
            nickname: typeof data.nickname === "string" ? data.nickname : "익명",
            score: typeof data.score === "number" ? data.score : 0,
            completedAtMs,
          });
        });

        raw.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const am = a.completedAtMs ?? 0;
          const bm = b.completedAtMs ?? 0;
          return bm - am;
        });

        setEntries(raw.slice(0, 10));
        setLoading(false);
      },
      (e) => {
        setError(e instanceof Error ? e.message : "Failed to load leaderboard");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [sessionId]);

  const rankedEntries = useMemo(() => {
    return entries.map((e, idx) => ({ ...e, rank: idx + 1 }));
  }, [entries]);

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          실시간 리더보드
        </h2>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
          {sessionId}
        </div>
      </div>

      {loading ? <div className="mt-3 text-sm text-zinc-600">로딩 중...</div> : null}
      {error ? (
        <div className="mt-3 text-sm text-red-600 dark:text-red-500">{error}</div>
      ) : null}

      {!loading && !error ? (
        <div className="mt-4 space-y-2">
          {rankedEntries.length === 0 ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              아직 완료된 응시가 없습니다.
            </div>
          ) : (
            rankedEntries.map((e) => (
              <div
                key={e.attemptId}
                className="flex items-center justify-between rounded-lg border border-zinc-200/70 dark:border-zinc-800 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-semibold">
                    {e.rank}
                  </div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {e.nickname}
                  </div>
                </div>
                <div className="font-mono text-zinc-900 dark:text-zinc-50">
                  {e.score}점
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

