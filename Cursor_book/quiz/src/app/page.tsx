import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          교육용 AI 퀴즈 플랫폼
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          교수자는 주제로 퀴즈 세션을 만들고, 학습자는 참가 코드로
          응시합니다. 성적과 리더보드는 실시간으로 확인할 수 있어요.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3">
          <Link
            href="/teacher"
            className="rounded-xl bg-zinc-900 text-white py-3 text-center font-medium hover:bg-zinc-800"
          >
            교수자: 퀴즈 생성
          </Link>
          <Link
            href="/learner"
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 py-3 text-center font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900/30"
          >
            학습자: 응시
          </Link>
        </div>
      </div>
    </div>
  );
}
