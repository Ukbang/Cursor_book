import { NextRequest, NextResponse } from "next/server";
import { searchCorps } from "@/lib/corp-db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ items: [], message: "검색어를 입력하세요." }, { status: 400 });
  }

  const items = await searchCorps(q);
  return NextResponse.json({ items });
}
