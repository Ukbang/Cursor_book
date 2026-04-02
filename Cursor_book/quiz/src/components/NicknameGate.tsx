"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// 허용: 한글/영문(문자), 숫자, `_`, `-`, 공백. (하이픈은 문자 클래스에서 이스케이프)
const NICKNAME_REGEX = /^[\p{L}0-9_\- ]{2,16}$/u;
const UID_KEY = "quiz_uid";

function getOrCreateUid(): string {
  let uid = localStorage.getItem(UID_KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem(UID_KEY, uid);
  }
  return uid;
}

export function NicknameGate({
  children,
}: {
  children: (args: { uid: string; nickname: string }) => React.ReactNode;
}) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const start = async () => {
      if (!db) {
        setError(
          "Firebase 설정이 누락되었습니다. .env.local에서 NEXT_PUBLIC_FIREBASE_CONFIG_JSON을 확인해 주세요."
        );
        setBootstrapping(false);
        return;
      }

      const userUid = getOrCreateUid();
      setUid(userUid);

      try {
        const ref = doc(db, "users", userUid);
        const snap = await getDoc(ref);
        const data = snap.data();
        const storedNickname =
          typeof data?.nickname === "string" ? data.nickname : "";

        if (storedNickname.trim().length > 0) {
          setNickname(storedNickname);
          setDraft(storedNickname);
        } else {
          setNickname(null);
          setDraft("");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load nickname");
      } finally {
        setBootstrapping(false);
      }
    };

    start();
  }, []);

  const canSubmit = useMemo(() => {
    const v = draft.trim();
    return NICKNAME_REGEX.test(v);
  }, [draft]);

  const onSaveNickname = async () => {
    if (!uid) return;
    const v = draft.trim();
    if (!NICKNAME_REGEX.test(v)) {
      setError("닉네임은 2~16자(한글/영문/숫자/_/-/공백)만 사용할 수 있어요.");
      return;
    }

    if (!db) {
      setError(
        "Firebase 설정이 누락되었습니다. .env.local에서 NEXT_PUBLIC_FIREBASE_* 또는 NEXT_PUBLIC_FIREBASE_CONFIG_JSON을 확인해 주세요."
      );
      return;
    }

    setError(null);
    try {
      await setDoc(
        doc(db, "users", uid),
        { nickname: v, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setNickname(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save nickname");
    }
  };

  if (bootstrapping) {
    return (
      <div className="p-6 text-zinc-600 dark:text-zinc-300">
        초기화 중...
      </div>
    );
  }

  if (!nickname) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-6">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            닉네임을 입력하세요
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            익명으로 로그인한 뒤 닉네임을 저장합니다.
          </p>

          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
              닉네임
            </label>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-3 py-2 text-zinc-900 dark:text-zinc-50 outline-none focus:ring-2 focus:ring-zinc-900/20"
              placeholder="예: 철수_01"
            />
          </div>

          {error ? (
            <div className="mt-3 text-sm text-red-600 dark:text-red-500">
              {error}
            </div>
          ) : null}

          <button
            onClick={onSaveNickname}
            disabled={!canSubmit}
            className="mt-5 w-full rounded-lg bg-zinc-900 text-white py-2.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            저장
          </button>
        </div>
      </div>
    );
  }

  return (
    <>{children({ uid: uid!, nickname: nickname })}</>
  );
}

