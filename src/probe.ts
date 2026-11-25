// Temporary: check which official/aggregator snow reports are reachable and parseable from GitHub Actions.
import { writeFile, mkdir } from "node:fs/promises";
const urls = [
  "https://www.vail.com/the-mountain/mountain-conditions/snow-and-weather-report.aspx",
  "https://www.onthesnow.com/colorado/vail/skireport",
  "https://www.onthesnow.com/colorado/steamboat/skireport",
  "https://www.onthesnow.com/montana/whitefish-mountain-resort/skireport",
  "https://www.onthesnow.com/japan/ski-resorts",
  "https://www.steamboat.com/the-mountain/mountain-report",
];
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const out: any[] = [];
for (const u of urls) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "text/html" } });
    const t = await r.text();
    const snip = (re: RegExp) => { const m = t.search(re); return m >= 0 ? t.slice(Math.max(0, m - 150), m + 450).replace(/\s+/g, " ") : null; };
    const nd = t.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    let next: any = null;
    if (nd) { const j = JSON.parse(nd[1]); const s = JSON.stringify(j); const i = s.search(/"snow"\s*:\s*\{/); next = i >= 0 ? s.slice(i, i + 900) : s.slice(0, 300); }
    const all = (re: RegExp, n = 4) => [...t.matchAll(re)].slice(0, n).map((m) => t.slice(Math.max(0, m.index! - 200), m.index! + 300).replace(/\s+/g, " "));
    out.push({ u, status: r.status, len: t.length, next, depth: all(/[Dd]epth/g), base: all(/\\?"base\\?"|Base\b/g), summit: all(/summit/gi, 2), hakuba: all(/hakuba[^"'\s<]*/gi, 6) });
  } catch (e: any) { out.push({ u, error: String(e?.message ?? e) }); }
}
await mkdir(new URL("../docs/debug/", import.meta.url), { recursive: true });
await writeFile(new URL("../docs/debug/probe.json", import.meta.url), JSON.stringify(out, null, 2));
