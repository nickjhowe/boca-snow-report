// Builds docs/snow.json for the bocaskiclub.com snow report page.
// Run with Node 22.18+ (native TypeScript): node src/update.ts
// No dependencies. Every source is fetched independently; if one fails, the
// previous day's values for that section are kept and flagged as stale.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { trips, climatologyYears, type Trip } from "./config.ts";

const OUT = new URL("../docs/snow.json", import.meta.url);
const DEBUG_DIR = new URL("../docs/debug/", import.meta.url);
const UA = "boca-snow-report (github.com/nickjhowe/boca-snow-report)";

// ---------- helpers ----------

async function getJson(url: string): Promise<any> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt >= 3) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

const round1 = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? null : Math.round(n * 10) / 10);
const IN_TO_CM = 2.54;
const FT_TO_M = 0.3048;

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371, toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ---------- Open-Meteo forecast (+ last 7 days, modelled) ----------

async function forecast(t: Trip) {
  const daily = [
    "snowfall_sum", "temperature_2m_max", "temperature_2m_min", "weather_code",
    "wind_speed_10m_max", "precipitation_probability_max",
  ].join(",");
  const q = (elev: number) =>
    `https://api.open-meteo.com/v1/forecast?latitude=${t.lat}&longitude=${t.lon}&elevation=${elev}` +
    `&daily=${daily}&timezone=auto&past_days=7&forecast_days=16`;
  const [mid, summit] = await Promise.all([getJson(q(t.midM)), getJson(q(t.summitM))]);

  // "Today" at the resort
  const nowLocal = new Date(Date.now() + mid.utc_offset_seconds * 1000);
  const today = isoDate(nowLocal);

  const d = mid.daily, s = summit.daily;
  const days = d.time.map((date: string, i: number) => ({
    date,
    snowCm: round1(d.snowfall_sum[i]),
    summitSnowCm: round1(s.snowfall_sum[i]),
    tMaxC: round1(d.temperature_2m_max[i]),
    tMinC: round1(d.temperature_2m_min[i]),
    summitTMinC: round1(s.temperature_2m_min[i]),
    code: d.weather_code[i],
    windMaxKmh: round1(d.wind_speed_10m_max[i]),
    precipProb: d.precipitation_probability_max?.[i] ?? null,
  }));
  const past = days.filter((x: any) => x.date < today);
  const future = days.filter((x: any) => x.date >= today);
  const sum = (arr: any[]) => round1(arr.reduce((a, x) => a + (x.snowCm ?? 0), 0));
  return {
    timezone: mid.timezone,
    today,
    modelSnowLast24hCm: past.length ? round1(past[past.length - 1].snowCm) : null,
    modelSnowLast7dCm: sum(past),
    next7dSnowCm: sum(future.slice(0, 7)),
    days: future,
  };
}

// ---------- Typical trip week, from station history ----------
// For each past season: snow depth on the first day of the trip, and new snow during the trip dates.
// US: SNOTEL daily snow depth (new snow = sum of daily depth gains). Japan: JMA daily snowfall totals.

function summarise(perYear: { year: number; startDepthCm: number | null; newSnowCm: number }[], method: string) {
  const ok = perYear.filter((p) => p.newSnowCm != null);
  const vals = ok.map((p) => p.newSnowCm);
  const depths = ok.map((p) => p.startDepthCm).filter((v): v is number => v != null).sort((a, b) => a - b);
  if (!vals.length) throw new Error("no historical data");
  return {
    method,
    years: `${ok[0].year}–${ok[ok.length - 1].year}`,
    seasons: ok.length,
    avgCm: round1(vals.reduce((a, b) => a + b, 0) / vals.length),
    minCm: Math.min(...vals),
    maxCm: Math.max(...vals),
    medianStartDepthCm: depths.length ? depths[Math.floor(depths.length / 2)] : null,
    perYear: ok,
  };
}

async function climatologySnotel(t: Trip, triplet: string) {
  const first = climatologyYears[0], last = climatologyYears[climatologyYears.length - 1];
  const data = await getJson(
    `${AWDB}/data?stationTriplets=${triplet}&elements=SNWD&duration=DAILY` +
      `&beginDate=${first - 1}-12-01&endDate=${last}-04-30&returnFlags=false`,
  );
  const vals: { date: string; value: number | null }[] = data[0]?.data?.[0]?.values ?? [];
  const byDate = new Map(vals.map((v) => [v.date.slice(0, 10), v.value]));
  const sm = t.start.slice(5), em = t.end.slice(5);
  const perYear = [];
  for (const y of climatologyYears) {
    const s = `${y}-${sm}`, e = `${y}-${em}`;
    let gain = 0, n = 0;
    for (let d = s; d <= e; d = addDays(d, 1)) {
      const a = byDate.get(addDays(d, -1)), b = byDate.get(d);
      if (a != null && b != null) { n++; if (b > a) gain += b - a; }
    }
    if (n < 5) continue;
    const sd = byDate.get(s);
    perYear.push({ year: y, startDepthCm: sd != null ? round1(sd * IN_TO_CM) : null, newSnowCm: round1(gain * IN_TO_CM)! });
  }
  return summarise(perYear, "SNOTEL daily snow depth gains");
}

const ETRN = "https://www.data.jma.go.jp/stats/etrn";

async function jmaBlockNo(precNo: number, name: string) {
  const html = await getText(`${ETRN}/select/prefecture.php?prec_no=${precNo}`);
  const m = html.match(new RegExp(`viewPoint\\('a','(\\d+)','${name}'`));
  if (!m) {
    const i = html.indexOf(name);
    throw new Error(`etrn block for ${name} not found; context: ${i >= 0 ? html.slice(Math.max(0, i - 300), i + 100).replace(/\s+/g, " ") : "name absent"}`);
  }
  return m[1];
}

function parseEtrnDaily(html: string) {
  // rows: <tr class="mtx" ...><td><div class="a_print"><a ...>DAY</a></div></td><td ...>v</td>...</tr>
  const rows: Record<number, { snowCm: number | null; depthCm: number | null }> = {};
  for (const tr of html.split('<tr class="mtx"').slice(1)) {
    const cells = [...tr.split("</tr>")[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
    const day = Number(cells[0]);
    if (!day) continue;
    const num = (s: string) => (s === "--" ? 0 : /\d/.test(s) ? Number(s.replace(/[^\d.]/g, "")) : null);
    // last two columns are snowfall (降雪 合計) and deepest snow depth (最深積雪)
    rows[day] = { snowCm: num(cells[cells.length - 2] ?? ""), depthCm: num(cells[cells.length - 1] ?? "") };
  }
  return rows;
}

async function climatologyJma(t: Trip, stationName: string) {
  const block = await jmaBlockNo(48, stationName);
  const months = [...new Set([t.start.slice(5, 7), t.end.slice(5, 7)])];
  const perYear = [];
  for (const y of climatologyYears) {
    const byDate = new Map<string, { snowCm: number | null; depthCm: number | null }>();
    for (const mm of months) {
      const html = await getText(`${ETRN}/view/daily_a1.php?prec_no=48&block_no=${block}&year=${y}&month=${Number(mm)}&day=&view=`);
      for (const [day, v] of Object.entries(parseEtrnDaily(html))) byDate.set(`${y}-${mm}-${String(day).padStart(2, "0")}`, v);
    }
    let total = 0, n = 0;
    for (let d = `${y}-${t.start.slice(5)}`; d <= `${y}-${t.end.slice(5)}`; d = addDays(d, 1)) {
      const v = byDate.get(d)?.snowCm;
      if (v != null) { total += v; n++; }
    }
    if (n < 5) continue;
    perYear.push({ year: y, startDepthCm: byDate.get(`${y}-${t.start.slice(5)}`)?.depthCm ?? null, newSnowCm: total });
  }
  return summarise(perYear, `JMA daily snowfall, etrn block ${block}`);
}

// ---------- USDA SNOTEL ----------

const AWDB = "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1";

async function snotel(t: Trip, triplet: string, label: string) {
  const end = isoDate(new Date());
  const begin = addDays(end, -14);
  const [meta] = await getJson(`${AWDB}/stations?stationTriplets=${triplet}&returnStationElements=false`);
  const data = await getJson(
    `${AWDB}/data?stationTriplets=${triplet}&elements=WTEQ,SNWD&duration=DAILY` +
      `&beginDate=${begin}&endDate=${end}&centralTendencyType=MEDIAN&returnFlags=false`,
  );
  const series: Record<string, { date: string; value: number | null; median?: number | null }[]> = {};
  for (const el of data[0]?.data ?? []) series[el.stationElement.elementCode] = el.values ?? [];

  const lastValid = (arr: any[] = []) => [...arr].reverse().find((v) => v.value != null);
  const valueOn = (arr: any[] = [], date: string) => arr.find((v) => v.date?.slice(0, 10) === date)?.value ?? null;

  const depth = lastValid(series.SNWD), swe = lastValid(series.WTEQ);
  const asOf = (depth ?? swe)?.date?.slice(0, 10) ?? null;
  const depthIn = depth?.value ?? null;
  const d1 = asOf ? valueOn(series.SNWD, addDays(asOf, -1)) : null;
  const d7 = asOf ? valueOn(series.SNWD, addDays(asOf, -7)) : null;
  const median = swe?.median ?? null;
  // new snow ≈ sum of daily depth gains (settling makes this a slight undercount)
  let gain7 = 0;
  if (asOf) for (let n = 0; n < 7; n++) {
    const a = valueOn(series.SNWD, addDays(asOf, -n - 1)), b = valueOn(series.SNWD, addDays(asOf, -n));
    if (a != null && b != null && b > a) gain7 += b - a;
  }
  return {
    source: "USDA NRCS SNOTEL",
    station: label,
    stationElevM: meta?.elevation != null ? Math.round(meta.elevation * FT_TO_M) : null,
    distanceKm: meta ? Math.round(haversineKm(t.lat, t.lon, meta.latitude, meta.longitude)) : null,
    asOf,
    depthCm: round1(depthIn != null ? depthIn * IN_TO_CM : null),
    depthChange24hCm: round1(depthIn != null && d1 != null ? (depthIn - d1) * IN_TO_CM : null),
    depthChange7dCm: round1(depthIn != null && d7 != null ? (depthIn - d7) * IN_TO_CM : null),
    newSnow24hCm: round1(depthIn != null && d1 != null ? Math.max(0, depthIn - d1) * IN_TO_CM : null),
    newSnow7dCm: round1(gain7 * IN_TO_CM),
    sweMm: round1(swe?.value != null ? swe.value * 25.4 : null),
    pctOfMedian: swe?.value != null && median ? Math.round((swe.value / median) * 100) : null,
  };
}

// ---------- Japan Meteorological Agency AMeDAS ----------

const JMA = "https://www.jma.go.jp/bosai/amedas";

async function jma(t: Trip, stationName: string, label: string) {
  const table = await getJson(`${JMA}/const/amedastable.json`);
  const entry = Object.entries<any>(table).find(([, v]) => v.kjName === stationName);
  if (!entry) throw new Error(`JMA station ${stationName} not found`);
  const [id, st] = entry;
  const lat = st.lat[0] + st.lat[1] / 60, lon = st.lon[0] + st.lon[1] / 60;

  const latest = (await getText(`${JMA}/data/latest_time.txt`)).trim(); // e.g. 2026-11-25T01:40:00+09:00
  const jst = latest.slice(0, 19); // local JST wall time
  const ymd = jst.slice(0, 10).replaceAll("-", "");
  const hh = Math.floor(Number(jst.slice(11, 13)) / 3) * 3;

  async function block(ymdStr: string, hour: number) {
    return getJson(`${JMA}/data/point/${id}/${ymdStr}_${String(hour).padStart(2, "0")}.json`).catch(() => ({}));
  }
  // values are [value, qualityFlag]; flag 0 = normal
  const pick = (rec: any, key: string): number | null => rec?.[key]?.[0] ?? null;

  const now = await block(ymd, hh);
  const keys = Object.keys(now).sort();
  // latest record that has a snow depth reading
  const lastKey = [...keys].reverse().find((k) => now[k]?.snow) ?? keys[keys.length - 1];
  const rec = lastKey ? now[lastKey] : null;
  const depth = pick(rec, "snow");
  const new24 = pick(rec, "snow24h");
  const hhmmss = lastKey?.slice(8) ?? "000000";

  // depth 1 and 7 days ago, plus 7-day sum of 24h snowfall
  const dayStr = (n: number) => addDays(jst.slice(0, 10), -n).replaceAll("-", "");
  let new7 = 0, have7 = 0, d1: number | null = null, d7: number | null = null;
  for (let n = 0; n < 7; n++) {
    const b = n === 0 ? now : await block(dayStr(n), hh);
    const r = b[`${dayStr(n)}${hhmmss}`];
    const v = pick(r, "snow24h");
    if (v != null) { new7 += v; have7++; }
    if (n === 1) d1 = pick(r, "snow");
  }
  const b7 = await block(dayStr(7), hh);
  d7 = pick(b7[`${dayStr(7)}${hhmmss}`], "snow");

  return {
    source: "Japan Meteorological Agency (AMeDAS)",
    station: label,
    stationElevM: st.alt ?? null,
    distanceKm: Math.round(haversineKm(t.lat, t.lon, lat, lon)),
    asOf: lastKey ? `${lastKey.slice(0, 4)}-${lastKey.slice(4, 6)}-${lastKey.slice(6, 8)}T${lastKey.slice(8, 10)}:${lastKey.slice(10, 12)}+09:00` : null,
    depthCm: depth,
    depthChange24hCm: depth != null && d1 != null ? depth - d1 : null,
    depthChange7dCm: depth != null && d7 != null ? depth - d7 : null,
    newSnow24hCm: new24,
    newSnow7dCm: have7 ? new7 : null,
    sweMm: null,
    pctOfMedian: null,
  };
}

// ---------- discovery (debug): nearest SNOTEL sites to each US resort ----------

async function discoverSnotel() {
  const stations = await getJson(`${AWDB}/stations?stationTriplets=*:CO:SNTL,*:MT:SNTL&returnStationElements=false&activeOnly=true`);
  const out: Record<string, any[]> = {};
  for (const t of trips.filter((x) => x.observation.kind === "snotel")) {
    out[t.id] = stations
      .map((s: any) => ({
        triplet: s.stationTriplet, name: s.name, elevFt: s.elevation, begin: s.beginDate,
        km: Math.round(haversineKm(t.lat, t.lon, s.latitude, s.longitude)),
      }))
      .sort((a: any, b: any) => a.km - b.km)
      .slice(0, 8);
  }
  return out;
}

// ---------- main ----------

async function main() {
  let previous: any = {};
  try { previous = JSON.parse(await readFile(OUT, "utf8")); } catch {}
  const prevTrip = (id: string) => previous.trips?.find((x: any) => x.id === id) ?? {};
  const errors: string[] = [];

  async function section<T>(name: string, t: Trip, fn: () => Promise<T>) {
    try {
      return { ...(await fn()), stale: false };
    } catch (err: any) {
      errors.push(`${t.id}/${name}: ${err?.message ?? err}`);
      const old = prevTrip(t.id)[name];
      return old ? { ...old, stale: true } : null;
    }
  }

  const out = [];
  for (const t of trips) {
    const o = t.observation;
    const [fc, climo, observed] = await Promise.all([
      section("forecast", t, () => forecast(t)),
      section("climatology", t, () => (o.kind === "snotel" ? climatologySnotel(t, o.triplet) : climatologyJma(t, o.stationName))),
      section("observed", t, () => (o.kind === "snotel" ? snotel(t, o.triplet, o.label) : jma(t, o.stationName, o.label))),
    ]);
    // Forecast snowfall that falls within the trip dates, once the trip is in range
    const tripDays = (fc as any)?.days?.filter((d: any) => d.date >= t.start && d.date <= t.end) ?? [];
    out.push({
      id: t.id, resort: t.resort, region: t.region, start: t.start, end: t.end,
      eventUrl: t.eventUrl, full: t.full, officialReportUrl: t.officialReportUrl,
      elevations: { baseM: t.baseM, midM: t.midM, summitM: t.summitM },
      observed, forecast: fc, climatology: climo,
      tripForecast: tripDays.length
        ? { days: tripDays.length, snowCm: round1(tripDays.reduce((a: number, d: any) => a + (d.snowCm ?? 0), 0)) }
        : null,
    });
  }

  const json = { generatedAt: new Date().toISOString(), trips: out, errors };
  await writeFile(OUT, JSON.stringify(json, null, 2) + "\n");
  // Same data wrapped in a function call, for pages whose security policy only allows <script> loads
  await writeFile(new URL("../docs/snow.js", import.meta.url), `window.bscSnowData && window.bscSnowData(${JSON.stringify(json)});\n`);
  console.log(`Wrote ${OUT.pathname}${errors.length ? ` with ${errors.length} error(s):\n  ` + errors.join("\n  ") : ""}`);

  if (process.env.DISCOVER) {
    await mkdir(DEBUG_DIR, { recursive: true });
    try {
      await writeFile(new URL("stations.json", DEBUG_DIR), JSON.stringify(await discoverSnotel(), null, 2));
    } catch (e: any) {
      await writeFile(new URL("stations.json", DEBUG_DIR), JSON.stringify({ error: String(e?.message ?? e) }));
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
