import fs from "node:fs/promises";
import path from "node:path";

export type Corp = {
  corpCode: string;
  corpName: string;
  stockCode: string;
};

let corpCache: Corp[] | null = null;

async function loadCorpJson() {
  const jsonPath = path.join(process.cwd(), "db", "corps.json");
  const raw = await fs.readFile(jsonPath, "utf-8");
  const parsed = JSON.parse(raw) as Corp[];
  return parsed;
}

async function parseFromXmlFallback() {
  const xmlPath = path.join(process.cwd(), "..", "data", "corp.xml");
  const xml = await fs.readFile(xmlPath, "utf-8");
  const blocks = xml.match(/<list>[\s\S]*?<\/list>/g) ?? [];
  const result: Corp[] = [];

  for (const block of blocks) {
    const corpCode = block.match(/<corp_code>(.*?)<\/corp_code>/)?.[1]?.trim() ?? "";
    const corpName = block.match(/<corp_name>(.*?)<\/corp_name>/)?.[1]?.trim() ?? "";
    const stockCode = block.match(/<stock_code>(.*?)<\/stock_code>/)?.[1]?.trim() ?? "";
    if (corpCode && corpName) {
      result.push({ corpCode, corpName, stockCode });
    }
  }
  return result;
}

export async function getCorps() {
  if (corpCache) return corpCache;
  try {
    corpCache = await loadCorpJson();
  } catch {
    corpCache = await parseFromXmlFallback();
  }
  return corpCache;
}

export async function searchCorps(query: string, limit = 20) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const corps = await getCorps();

  const startsWith = corps.filter((c) => c.corpName.toLowerCase().startsWith(q));
  const includes = corps.filter(
    (c) =>
      !c.corpName.toLowerCase().startsWith(q) &&
      (c.corpName.toLowerCase().includes(q) || c.stockCode.includes(query)),
  );
  return [...startsWith, ...includes].slice(0, limit);
}
