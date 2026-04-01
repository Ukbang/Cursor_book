import { NextRequest, NextResponse } from "next/server";

const DART_URL = "https://opendart.fss.or.kr/api/fnlttSinglAcnt.json";

export async function GET(request: NextRequest) {
  const corpCode = request.nextUrl.searchParams.get("corpCode");
  const bsnsYear = request.nextUrl.searchParams.get("bsnsYear");
  const reprtCode = request.nextUrl.searchParams.get("reprtCode");
  const crtfcKey = process.env.OPENDART_API_KEY;

  if (!crtfcKey) {
    return NextResponse.json(
      { status: "ERROR", message: "OPENDART_API_KEY 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  if (!corpCode || !bsnsYear || !reprtCode) {
    return NextResponse.json(
      { status: "ERROR", message: "corpCode, bsnsYear, reprtCode가 필요합니다." },
      { status: 400 },
    );
  }

  const url = new URL(DART_URL);
  url.searchParams.set("crtfc_key", crtfcKey);
  url.searchParams.set("corp_code", corpCode);
  url.searchParams.set("bsns_year", bsnsYear);
  url.searchParams.set("reprt_code", reprtCode);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await res.json()) as { status: string; message: string; list?: unknown[] };
  if (!res.ok || json.status !== "000") {
    return NextResponse.json(
      {
        status: json.status ?? "ERROR",
        message: json.message ?? "오픈다트 API 호출 실패",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(json);
}
