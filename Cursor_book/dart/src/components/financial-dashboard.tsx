"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type CorpItem = {
  corpCode: string;
  corpName: string;
  stockCode: string;
};

type AccountRow = {
  account_nm: string;
  sj_div: string;
  sj_nm: string;
  thstrm_amount: string;
  frmtrm_amount: string;
  bfefrmtrm_amount?: string;
  currency: string;
};

type DARTResponse = {
  status: string;
  message: string;
  list?: AccountRow[];
};

const reportOptions = [
  { code: "11011", label: "사업보고서 (연간)" },
  { code: "11013", label: "1분기보고서" },
  { code: "11012", label: "반기보고서" },
  { code: "11014", label: "3분기보고서" },
];

function parseAmount(value?: string) {
  if (!value) return 0;
  return Number(value.replaceAll(",", "")) || 0;
}

function formatKrw(num: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(num));
}

export function FinancialDashboard() {
  const [query, setQuery] = useState("");
  const [corpResults, setCorpResults] = useState<CorpItem[]>([]);
  const [selectedCorp, setSelectedCorp] = useState<CorpItem | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear() - 1));
  const [reprtCode, setReprtCode] = useState("11011");
  const [data, setData] = useState<DARTResponse | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState("");

  const chartData = useMemo(() => {
    if (!data?.list) return [];
    return data.list
      .filter((row) =>
        ["매출", "영업이익", "당기순이익", "자산총계", "부채총계", "자본총계"].some(
          (keyword) => row.account_nm.includes(keyword),
        ),
      )
      .slice(0, 10)
      .map((row) => ({
        name: row.account_nm,
        당기: parseAmount(row.thstrm_amount),
        전기: parseAmount(row.frmtrm_amount),
      }));
  }, [data]);

  async function searchCorp() {
    if (!query.trim()) return;
    setError("");
    setLoadingSearch(true);
    try {
      const res = await fetch(`/api/corps?q=${encodeURIComponent(query)}`);
      const json = (await res.json()) as { items: CorpItem[]; message?: string };
      if (!res.ok) throw new Error(json.message ?? "회사 검색에 실패했습니다.");
      setCorpResults(json.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "회사 검색 중 오류가 발생했습니다.");
    } finally {
      setLoadingSearch(false);
    }
  }

  async function loadFinancialData() {
    if (!selectedCorp) return;
    setError("");
    setAnalysis("");
    setLoadingData(true);
    try {
      const params = new URLSearchParams({
        corpCode: selectedCorp.corpCode,
        bsnsYear: year,
        reprtCode,
      });
      const res = await fetch(`/api/dart/fnlttSinglAcnt?${params.toString()}`);
      const json = (await res.json()) as DARTResponse;
      if (!res.ok) throw new Error(json.message ?? "재무 데이터 조회 실패");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "재무 데이터 조회 중 오류");
    } finally {
      setLoadingData(false);
    }
  }

  async function analyzeWithAI() {
    if (!selectedCorp || !data?.list?.length) return;
    setLoadingAnalysis(true);
    setError("");
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          corpName: selectedCorp.corpName,
          bsnsYear: year,
          reprtCode,
          accounts: data.list.slice(0, 40),
        }),
      });
      const json = (await res.json()) as { analysis?: string; message?: string };
      if (!res.ok) throw new Error(json.message ?? "AI 분석 실패");
      setAnalysis(json.analysis ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 분석 중 오류");
    } finally {
      setLoadingAnalysis(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <div className="rounded-3xl border border-zinc-200 bg-zinc-50/70 px-6 py-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          재무 데이터 시각화 분석 서비스
        </h1>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">
          1) 회사 검색 (corp.xml 인덱스)
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[260px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-900/15"
            placeholder="회사명 입력 (예: 삼성전자)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"
            onClick={searchCorp}
            disabled={loadingSearch}
          >
            {loadingSearch ? "검색 중..." : "검색"}
          </button>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {corpResults.map((corp) => (
            <button
              key={corp.corpCode}
              className={`rounded-xl border p-3 text-left transition ${
                selectedCorp?.corpCode === corp.corpCode
                  ? "border-zinc-900 bg-zinc-100"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
              onClick={() => setSelectedCorp(corp)}
            >
              <p className="font-semibold text-zinc-900">{corp.corpName}</p>
              <p className="text-sm text-zinc-600">
                corp_code: {corp.corpCode} / stock: {corp.stockCode || "-"}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">2) 오픈다트 재무 시각화</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="w-36 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-900/15"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="사업연도 (예: 2024)"
          />
          <select
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-900/15"
            value={reprtCode}
            onChange={(e) => setReprtCode(e.target.value)}
          >
            {reportOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50"
            onClick={loadFinancialData}
            disabled={!selectedCorp || loadingData}
          >
            {loadingData ? "조회 중..." : "재무 데이터 불러오기"}
          </button>
        </div>

        {chartData.length > 0 && (
          <div className="mt-4 h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 72 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={110} />
                <YAxis tickFormatter={(v) => formatKrw(Number(v))} />
                <Tooltip formatter={(v) => formatKrw(Number(v))} />
                <Legend />
                <Bar dataKey="당기" fill="#2563eb" />
                <Bar dataKey="전기" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">3) Gemini 쉬운 해석</h2>
        <button
          className="rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
          onClick={analyzeWithAI}
          disabled={!data?.list?.length || loadingAnalysis}
        >
          {loadingAnalysis ? "분석 중..." : "AI 분석하기"}
        </button>
        {analysis ? (
          <div className="mt-4 whitespace-pre-wrap rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-950">
            {analysis}
          </div>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </main>
  );
}
