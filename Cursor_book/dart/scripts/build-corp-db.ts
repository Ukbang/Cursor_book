import fs from "node:fs/promises";
import path from "node:path";

type Corp = {
  corpCode: string;
  corpName: string;
  stockCode: string;
};

async function build() {
  const xmlPath = path.join(process.cwd(), "..", "data", "corp.xml");
  const outPath = path.join(process.cwd(), "db", "corps.json");
  const xml = await fs.readFile(xmlPath, "utf-8");

  const listBlocks = xml.match(/<list>[\s\S]*?<\/list>/g) ?? [];
  const corps: Corp[] = [];

  for (const block of listBlocks) {
    const corpCode = block.match(/<corp_code>(.*?)<\/corp_code>/)?.[1]?.trim() ?? "";
    const corpName = block.match(/<corp_name>(.*?)<\/corp_name>/)?.[1]?.trim() ?? "";
    const stockCode = block.match(/<stock_code>(.*?)<\/stock_code>/)?.[1]?.trim() ?? "";
    if (corpCode && corpName) corps.push({ corpCode, corpName, stockCode });
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(corps), "utf-8");
  console.log(`Saved ${corps.length} companies to db/corps.json`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
