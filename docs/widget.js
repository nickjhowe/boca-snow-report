/* Boca Ski Club snow report widget.
 * Paste into a Wild Apricot Custom HTML gadget:
 *   <div id="bsc-snow"></div>
 *   <script src="https://nickjhowe.github.io/boca-snow-report/widget.js" defer></script>
 * Data: snow.json in the same folder, rebuilt every morning by a GitHub Action.
 */
(function () {
  var script = document.currentScript;
  var BASE = script && script.src ? script.src.replace(/[^/]*$/, "") : "./";
  var root = document.getElementById("bsc-snow");
  if (!root) return;

  // ---------- styles (all scoped under #bsc-snow so the site theme is untouched) ----------
  var fonts = document.createElement("link");
  fonts.rel = "stylesheet";
  fonts.href =
    "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Atkinson+Hyperlegible:wght@400;700&display=swap";
  document.head.appendChild(fonts);

  var css = `
#bsc-snow{--ink:#16324F;--ink2:#4E6274;--snow:#FFFFFF;--field:#EEF4F8;--ice:#BFDDEE;--ice2:#7FB6D6;--stake:#C8102E;--good:#2E7D4F;--warn:#B76E00;--low:#B3261E;
  font-family:"Atkinson Hyperlegible",system-ui,sans-serif;color:var(--ink);font-size:17px;line-height:1.5;max-width:960px;margin:0 auto}
#bsc-snow *{box-sizing:border-box}
#bsc-snow .bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 18px}
#bsc-snow .updated{color:var(--ink2);font-size:15px;margin:0}
#bsc-snow .units{display:inline-flex;border:2px solid var(--ink);border-radius:999px;overflow:hidden}
#bsc-snow .units button{font:inherit;font-size:15px;font-weight:700;background:none;border:0;color:var(--ink);padding:4px 14px;cursor:pointer}
#bsc-snow .units button[aria-pressed="true"]{background:var(--ink);color:#fff}
#bsc-snow button:focus-visible,#bsc-snow a:focus-visible{outline:3px solid var(--ice2);outline-offset:2px}

#bsc-snow .trip{display:grid;grid-template-columns:120px 1fr;gap:0 28px;background:var(--field);border-radius:6px 28px 6px 6px;padding:26px 28px 22px;margin:0 0 26px;position:relative;overflow:hidden}
#bsc-snow .trip::after{content:"";position:absolute;left:0;right:0;bottom:0;height:10px;background:var(--ice)}
#bsc-snow h3.name{font-family:Archivo,sans-serif;font-stretch:68%;font-weight:850;font-size:clamp(40px,7vw,64px);line-height:.92;letter-spacing:-.5px;margin:0;color:var(--ink)}
#bsc-snow .where{font-size:16px;color:var(--ink2);margin:6px 0 0}
#bsc-snow .when{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;margin:10px 0 0}
#bsc-snow .dates{font-weight:700;font-size:18px}
#bsc-snow .count{font-family:Archivo,sans-serif;font-stretch:100%;font-weight:700;font-size:16px;background:var(--ink);color:#fff;border-radius:999px;padding:1px 12px}

/* snow stake */
#bsc-snow .stake{grid-row:1 / span 4;align-self:start}
#bsc-snow .stake svg{display:block;width:120px;height:auto}
#bsc-snow .stake .depth{font-family:Archivo,sans-serif;font-stretch:80%;font-weight:850;font-size:34px;line-height:1;text-align:center;margin:8px 0 0}
#bsc-snow .stake .cap{font-size:13px;color:var(--ink2);text-align:center;margin:2px 0 0;line-height:1.3}

#bsc-snow .now{display:flex;flex-wrap:wrap;gap:10px 28px;margin:18px 0 0;padding:0;list-style:none}
#bsc-snow .now li{min-width:96px}
#bsc-snow .now b{display:block;font-family:Archivo,sans-serif;font-stretch:90%;font-weight:800;font-size:26px;line-height:1.1}
#bsc-snow .now span{font-size:14px;color:var(--ink2)}
#bsc-snow .now .pack{display:inline-block;font-weight:700;font-size:14px;border-radius:4px;padding:1px 8px;color:#fff;margin-top:4px}

#bsc-snow h4{font-family:Archivo,sans-serif;font-stretch:90%;font-weight:800;font-size:19px;margin:22px 0 8px}
#bsc-snow .days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;align-items:end}
#bsc-snow .day{text-align:center;font-size:14px}
#bsc-snow .day .dn{font-weight:700}
#bsc-snow .day svg.wx{width:30px;height:30px;display:block;margin:2px auto}
#bsc-snow .day .col{height:70px;display:flex;align-items:flex-end;justify-content:center}
#bsc-snow .day .fill{width:70%;max-width:34px;background:var(--snow);border:2px solid var(--ice2);border-bottom:0;border-radius:6px 6px 0 0;min-height:2px}
#bsc-snow .day .amt{font-family:Archivo,sans-serif;font-weight:800;font-size:16px;border-top:2px solid var(--ink);padding-top:2px}
#bsc-snow .day .t{color:var(--ink2);font-size:13px;white-space:nowrap}
#bsc-snow .day.snowy .fill{background:linear-gradient(#fff,var(--ice));border-color:#2F6E95;border-width:3px}
#bsc-snow .day.snowy .amt{color:#1F5F8B;font-size:19px}
#bsc-snow .day.snowy .dn{color:#1F5F8B}
#bsc-snow .incoming{display:flex;gap:12px;align-items:center;background:#16324F;color:#fff;border-radius:6px;padding:10px 16px;margin:18px 0 0}
#bsc-snow .incoming svg{flex:none;width:30px;height:30px}
#bsc-snow .incoming p{margin:0;font-size:16px}
#bsc-snow .incoming b{font-family:Archivo,sans-serif;font-stretch:90%;font-weight:800;font-size:22px}
#bsc-snow .week{background:var(--snow);border-radius:6px;padding:12px 16px;margin:18px 0 0}
#bsc-snow .week p{margin:0}
#bsc-snow .week .big{font-family:Archivo,sans-serif;font-stretch:90%;font-weight:800;font-size:22px}
#bsc-snow .note{font-size:13px;color:var(--ink2);margin:4px 0 0}
#bsc-snow .actions{display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;margin:18px 0 6px}
#bsc-snow a.go{display:inline-block;background:var(--stake);color:#fff;font-weight:700;text-decoration:none;border-radius:999px;padding:9px 22px}
#bsc-snow a.go.full{background:var(--ink)}
#bsc-snow a.more{color:var(--ink);font-weight:700}
#bsc-snow .src{font-size:13px;color:var(--ink2);margin:14px 0 0}
#bsc-snow .content{min-width:0}
@media (max-width:640px){
  #bsc-snow .trip{grid-template-columns:78px 1fr;gap:0 16px;padding:20px 16px 20px}
  #bsc-snow .stake svg{width:78px}
  #bsc-snow .stake .depth{font-size:26px}
  #bsc-snow .stake{grid-row:1 / span 2}
  #bsc-snow .rest{grid-column:1 / -1}
  #bsc-snow .day .t span{display:block}
  #bsc-snow .day .t .sl{display:none}
  #bsc-snow .day .amt{font-size:14px}
  #bsc-snow .day svg.wx{width:24px;height:24px}
}
@media (min-width:641px){#bsc-snow .rest{grid-column:2}}
`;
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // Set true to show snowpack badges even when they're below normal (hidden for now at the club's request)
  var SHOW_LOW_SNOWPACK = false;

  // ---------- units ----------
  var units = "us";
  try { units = localStorage.getItem("bscSnowUnits") || "us"; } catch (e) {}
  var US = function () { return units === "us"; };
  function depth(cm) {
    if (cm == null) return "–";
    return US() ? Math.round(cm / 2.54) + "″" : Math.round(cm) + " cm";
  }
  function snow(cm) {
    if (cm == null) return "–";
    var v = US() ? cm / 2.54 : cm;
    if (v === 0) return "0";
    if (v < 0.5) return US() ? "<½″" : "<1 cm";
    return Math.round(v) + (US() ? "″" : " cm");
  }
  function temp(c) {
    if (c == null) return "–";
    return US() ? Math.round(c * 9 / 5 + 32) + "°" : Math.round(c) + "°";
  }
  function signed(cm) {
    if (cm == null) return "–";
    var s = depth(Math.abs(cm));
    return (cm > 0 ? "+" : cm < 0 ? "−" : "±") + s;
  }

  // ---------- dates ----------
  var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function d(iso) { var p = iso.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function range(a, b) {
    var x = d(a), y = d(b);
    return MON[x.getMonth()] + " " + x.getDate() + " to " + (x.getMonth() === y.getMonth() ? "" : MON[y.getMonth()] + " ") + y.getDate() + ", " + y.getFullYear();
  }
  function daysUntil(iso) {
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((d(iso) - t) / 864e5);
  }

  // ---------- weather icons (WMO codes) ----------
  function icon(code) {
    var cloud = '<path d="M9 22h14a5 5 0 0 0 0-10 7 7 0 0 0-13.4 1.6A4.3 4.3 0 0 0 9 22z" fill="#fff" stroke="#4E6274" stroke-width="1.8"/>';
    var sun = '<circle cx="12" cy="12" r="5" fill="#F2B705"/><g stroke="#F2B705" stroke-width="2" stroke-linecap="round"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></g>';
    var flakes = '<g fill="#7FB6D6"><circle cx="11" cy="27" r="1.7"/><circle cx="17" cy="29" r="1.7"/><circle cx="23" cy="27" r="1.7"/></g>';
    var drops = '<g stroke="#4E6274" stroke-width="1.8" stroke-linecap="round"><path d="M12 25l-1 4M18 25l-1 4M24 25l-1 4"/></g>';
    var body;
    if (code === 0) body = '<g transform="translate(4 4)">' + sun + "</g>";
    else if (code <= 2) body = '<g transform="translate(-1 -2) scale(.8)">' + sun + "</g>" + cloud;
    else if ((code >= 71 && code <= 77) || code === 85 || code === 86) body = cloud + flakes;
    else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) body = cloud + drops;
    else if (code >= 95) body = cloud + '<path d="M18 23l-3 5h4l-3 4" fill="none" stroke="#F2B705" stroke-width="2"/>';
    else body = cloud;
    return '<svg class="wx" viewBox="0 0 34 34" aria-hidden="true">' + body + "</svg>";
  }
  function codeText(code) {
    if (code === 0) return "Sunny";
    if (code <= 2) return "Partly cloudy";
    if (code === 3) return "Cloudy";
    if (code === 45 || code === 48) return "Fog";
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Snow";
    if (code >= 95) return "Thunderstorms";
    if (code >= 51) return "Rain";
    return "Cloudy";
  }

  // ---------- snow stake ----------
  function stake(cm) {
    var maxCm = Math.max(150, Math.ceil(((cm || 0) * 1.15) / 50) * 50);
    var H = 260, top = 10, bottom = 250, h = bottom - top;
    var y = function (v) { return bottom - (v / maxCm) * h; };
    var ticks = "";
    var step = US() ? 12 * 2.54 : 50; // a foot, or 50 cm
    var minor = US() ? 6 * 2.54 : 25;
    for (var v = minor; v <= maxCm; v += minor) {
      var major = Math.abs(v / step - Math.round(v / step)) < 1e-6;
      ticks += '<line x1="' + (major ? 40 : 46) + '" x2="60" y1="' + y(v) + '" y2="' + y(v) + '" stroke="#fff" stroke-width="' + (major ? 3 : 2) + '"/>';
      if (major) ticks += '<text x="70" y="' + (y(v) + 4) + '" font-size="12" font-family="Archivo,sans-serif" font-weight="700" fill="#16324F">' + (US() ? Math.round(v / 30.48) + " ft" : Math.round(v)) + "</text>";
    }
    var snowTop = cm ? y(Math.min(cm, maxCm)) : bottom;
    return (
      '<svg viewBox="0 0 120 ' + H + '" role="img" aria-label="Snow depth ' + depth(cm) + '">' +
      '<rect x="40" y="' + top + '" width="20" height="' + h + '" fill="#C8102E" rx="2"/>' + ticks +
      '<path d="M0 ' + snowTop + " Q 20 " + (snowTop - 8) + " 40 " + (snowTop - 3) + " L60 " + (snowTop - 3) + " Q 90 " + (snowTop + 6) + " 120 " + (snowTop - 2) + " L120 " + H + " L0 " + H + ' Z" fill="#fff" stroke="#7FB6D6" stroke-width="2"/>' +
      "</svg>"
    );
  }

  function packBadge(pct) {
    if (pct == null) return "";
    var c = pct >= 110 ? "var(--good)" : pct >= 85 ? "#2F6E95" : pct >= 60 ? "var(--warn)" : "var(--low)";
    var word = pct >= 110 ? "above normal" : pct >= 85 ? "near normal" : "below normal";
    return '<span class="pack" style="background:' + c + '">' + pct + "% of normal, " + word + "</span>";
  }

  // ---------- render ----------
  var data = null;

  function card(t) {
    var o = t.observed || {}, f = t.forecast || {}, c = t.climatology, n = daysUntil(t.start), left = daysUntil(t.end);
    var countdown = n > 1 ? n + " days to go" : n === 1 ? "Tomorrow" : left >= 0 ? "Happening now" : "";
    var depthCap = o.depthCm == null ? "No reading yet" : o.depthCm === 0 ? "No snow on the ground yet" : "on the ground";
    var stationLine = o.station
      ? o.station + (o.stationElevM ? ", " + (US() ? Math.round(o.stationElevM / 0.3048).toLocaleString() + " ft" : o.stationElevM + " m") : "") +
        (o.distanceKm != null ? ", " + (US() ? Math.round(o.distanceKm * 0.621) + " mi" : o.distanceKm + " km") + " from the resort" : "")
      : "";

    var newSnow24 = o.newSnow24hCm != null ? o.newSnow24hCm : f.modelSnowLast24hCm;
    var newSnow7 = o.newSnow7dCm != null ? o.newSnow7dCm : f.modelSnowLast7dCm;

    var days = (f.days || []).slice(0, 7);
    var sf = function (x) { return x.summitSnowCm != null ? Math.max(x.summitSnowCm, x.snowCm || 0) : x.snowCm; };
    var total7 = days.reduce(function (a, x) { return a + (sf(x) || 0); }, 0);
    var best = days.reduce(function (b, x) { return (sf(x) || 0) > (sf(b) || 0) ? x : b; }, days[0] || {});
    var maxSnow = Math.max(10, Math.max.apply(null, days.map(function (x) { return sf(x) || 0; })));
    var strip = days.map(function (x, i) {
      var cm = sf(x) || 0;
      var hPct = Math.round((cm / maxSnow) * 100);
      var label = i === 0 ? "Today" : DOW[d(x.date).getDay()];
      return (
        '<div class="day' + (cm >= 1.27 ? " snowy" : "") + '" title="' + codeText(x.code) + '"><div class="dn">' + label + "</div>" + icon(x.code) +
        '<div class="col"><div class="fill" style="height:' + hPct + '%"></div></div>' +
        '<div class="amt">' + snow(cm) + '</div><div class="t"><span>' + temp(x.tMaxC) + '</span><span class="sl"> / </span><span>' + temp(x.tMinC) + "</span></div></div>"
      );
    }).join("");

    var week;
    if (t.tripForecast && t.tripForecast.days >= 3) {
      week = '<p class="big">' + snow(t.tripForecast.snowCm) + " forecast for your trip dates</p>" +
        '<p class="note">Covers the first ' + t.tripForecast.days + " days of the trip. Forecasts more than a week out often change.</p>";
    } else if (c && c.avgCm != null) {
      week = '<p class="big">Typically about ' + snow(c.avgCm) + " of new snow during the trip</p>" +
        '<p class="note">Measured at ' + (o.station || "the nearest station") + " for " + range(t.start, t.end).replace(/, \d{4}$/, "") + " in each season " + c.years +
        " (least " + snow(c.minCm) + ", most " + snow(c.maxCm) + ")." +
        (c.medianStartDepthCm != null ? " Typical snow on the ground there when the trip starts: " + depth(c.medianStartDepthCm) + "." : "") +
        " A real forecast replaces this about two weeks before the trip.</p>";
    } else week = "";

    return (
      '<article class="trip" aria-labelledby="bsc-' + t.id + '">' +
      '<div class="stake">' + stake(o.depthCm) + '<p class="depth">' + depth(o.depthCm) + '</p><p class="cap">' + depthCap + "</p></div>" +
      '<div class="content"><h3 class="name" id="bsc-' + t.id + '">' + t.resort + '</h3><p class="where">' + t.region + "</p>" +
      '<div class="when"><span class="dates">' + range(t.start, t.end) + "</span>" + (countdown ? '<span class="count">' + countdown + "</span>" : "") + "</div></div>" +
      '<div class="rest">' +
      '<ul class="now">' +
      "<li><b>" + snow(newSnow24) + "</b><span>new snow, 24 hours</span></li>" +
      "<li><b>" + snow(newSnow7) + "</b><span>new snow, 7 days</span></li>" +
      (o.depthChange7dCm > 0 ? "<li><b>" + signed(o.depthChange7dCm) + "</b><span>deeper than a week ago</span></li>" : "") +
      (SHOW_LOW_SNOWPACK || o.pctOfMedian >= 85 ? (o.pctOfMedian != null ? "<li><span>Snowpack</span><br>" + packBadge(o.pctOfMedian) + "</li>" : "") : "") +
      "</ul>" +
      (total7 >= 2.54 ? '<div class="incoming"><svg viewBox="0 0 30 30" aria-hidden="true"><g stroke="#BFDDEE" stroke-width="2.4" stroke-linecap="round"><path d="M15 3v24M4.6 9l20.8 12M4.6 21 25.4 9"/><path d="M11 5l4 3 4-3M11 25l4-3 4 3"/></g></svg><p><b>' + snow(total7) +
        "</b> of fresh snow forecast this week" + (best && best.date ? ", most of it " + (best === days[0] ? "today" : "on " + ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d(best.date).getDay()]) + " (" + snow(sf(best)) + ")" : "") + ".</p></div>" : "") +
      "<h4>Next 7 days on the mountain</h4><div class=\"days\">" + strip + "</div>" +
      '<p class="note">Snowfall at the summit, temperatures at mid-mountain, ' + (US() ? Math.round(t.elevations.midM / 0.3048).toLocaleString() + " ft" : t.elevations.midM + " m") +
      ".</p>" +
      (week ? '<div class="week">' + week + "</div>" : "") +
      '<div class="actions"><a class="go' + (t.full ? " full" : "") + '" href="' + t.eventUrl + '">' + (t.full ? "View trip (full)" : "Sign up for this trip") + "</a>" +
      '<a class="more" href="' + t.officialReportUrl + '" target="_blank" rel="noopener">Official ' + t.resort + " snow report</a></div>" +
      '<p class="src">Snow on the ground: ' + stationLine + (o.asOf ? ", reading of " + fmtAsOf(o.asOf) : "") + (o.stale ? " (not updated today)" : "") +
      ". Forecast: Open-Meteo" + (f.stale ? " (not updated today)" : "") + ".</p>" +
      "</div></article>"
    );
  }

  function fmtAsOf(s) {
    var x = d(s.slice(0, 10));
    return MON[x.getMonth()] + " " + x.getDate();
  }

  function render() {
    if (!data) return;
    var trips = data.trips.filter(function (t) { return daysUntil(t.end) >= 0; });
    var gen = new Date(data.generatedAt);
    var updated = gen.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }) + " ET";
    root.innerHTML =
      '<div class="bar"><p class="updated">Updated ' + updated + "</p>" +
      '<div class="units" role="group" aria-label="Units"><button type="button" data-u="us" aria-pressed="' + US() + '">in / °F</button>' +
      '<button type="button" data-u="metric" aria-pressed="' + !US() + '">cm / °C</button></div></div>' +
      (trips.length ? trips.map(card).join("") : "<p>The season's trips are over. Check back when next season's trips are announced.</p>");
  }

  root.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button[data-u]");
    if (!b) return;
    units = b.getAttribute("data-u");
    try { localStorage.setItem("bscSnowUnits", units); } catch (e2) {}
    render();
  });

  function failed() {
    root.innerHTML = '<p>Today\'s snow report didn\'t load. Try refreshing the page, or check the resorts\' own reports: ' +
      '<a href="https://www.vail.com/the-mountain/mountain-conditions/snow-and-weather-report.aspx">Vail</a>, ' +
      '<a href="https://www.steamboat.com/the-mountain/mountain-report">Steamboat</a>, ' +
      '<a href="https://skiwhitefish.com/snowreport/">Whitefish</a>, ' +
      '<a href="https://www.hakubavalley.com/en/">Hakuba Valley</a>.</p>';
  }
  // Data arrives as snow.js calling window.bscSnowData(...) — a plain <script> load, which works under
  // strict site security policies and needs no CORS.
  window.bscSnowData = function (j) { data = j; render(); };
  var bust = new Date().toISOString().slice(0, 13); // refresh at most hourly
  var tag = document.createElement("script");
  tag.src = BASE + "snow.js?v=" + bust;
  tag.onerror = failed;
  document.head.appendChild(tag);
})();
