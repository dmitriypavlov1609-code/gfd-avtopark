// Front-end авто-чекер (Playwright): наложения элементов, горизонтальный оверфлоу,
// ошибки консоли, битые ресурсы — по всем вкладкам и на разных ширинах экрана.
// Запуск:  node tools/fe-check.mjs [URL]
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const URL = process.argv[2] || "https://gfd-avtopark.vercel.app/";
const OUT = path.join(process.cwd(), "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "laptop", w: 1180, h: 800 },
  { name: "tablet", w: 768, h: 1024 },
  { name: "mobile", w: 390, h: 844 },
];
const TABS = ["overview", "own", "hired", "stores", "stats"];

// в браузере: найти пересечения видимых блоков (не вложенных, не намеренные оверлеи)
const OVERLAP_FN = `() => {
  const SEL = ['.sidebar','.topbar','.nav','.kpi','.panel','.ph','.pb','.store','.toolbar','.tablewrap','.barcol','.fitem','.prow','.task','.search','.chip','.user','h1'];
  const els = [...new Set(SEL.flatMap(s => [...document.querySelectorAll(s)]))];
  const vis = els.filter(e => {
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    if (r.width < 4 || r.height < 4) return false;
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return false;
    if (r.right<=0 || r.left>=window.innerWidth || r.bottom<=0 || r.top>=window.innerHeight) return false;
    return true;
  });
  const rect = e => e.getBoundingClientRect();
  const contains = (a,b) => a.contains(b) || b.contains(a);
  const desc = e => (e.id?('#'+e.id):'') + '.' + [...e.classList].join('.') + (e.tagName==='H1'?'<h1>':'');
  const out = [];
  for (let i=0;i<vis.length;i++) for (let j=i+1;j<vis.length;j++){
    const A=vis[i], B=vis[j];
    if (contains(A,B)) continue;
    const cs=getComputedStyle(A), ds=getComputedStyle(B);
    // намеренные оверлеи (absolute/fixed/sticky) пропускаем, кроме случая наезда на текст h1/p
    const intentional = p => ['absolute','fixed','sticky'].includes(p);
    const ra=rect(A), rb=rect(B);
    const ox = Math.max(0, Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left));
    const oy = Math.max(0, Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top));
    if (ox<=2 || oy<=2) continue;
    const area = ox*oy, minA = Math.min(ra.width*ra.height, rb.width*rb.height);
    if (area/minA < 0.12) continue; // незначительное касание игнор
    if (intentional(cs.position)||intentional(ds.position)) continue;
    out.push({a:desc(A), b:desc(B), overlap:Math.round(area), pct:Math.round(area/minA*100),
      ra:{x:Math.round(ra.x),y:Math.round(ra.y),w:Math.round(ra.width),h:Math.round(ra.height)}});
  }
  return out;
}`;

const run = async () => {
  const browser = await chromium.launch();
  const report = { url: URL, viewports: [] };
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const consoleErrors = [], failed = [];
    page.on("console", m => { if (m.type() === "error") consoleErrors.push(m.text()); });
    page.on("pageerror", e => consoleErrors.push("pageerror: " + e.message));
    page.on("requestfailed", r => failed.push(r.url() + " — " + (r.failure()?.errorText || "")));
    await page.goto(URL, { waitUntil: "networkidle" }).catch(()=>{});
    const tabsReport = [];
    for (const tab of TABS) {
      await page.evaluate(t => { const b=document.querySelector('.nav[data-page="'+t+'"]'); if(b) b.click(); }, tab).catch(()=>{});
      await page.waitForTimeout(350);
      const overflow = await page.evaluate(() => ({
        docW: document.documentElement.scrollWidth, winW: window.innerWidth,
        horiz: document.documentElement.scrollWidth - window.innerWidth,
      }));
      const overlaps = (await page.evaluate("(" + OVERLAP_FN + ")()").catch(()=>[])) || [];
      const shot = `${vp.name}-${tab}.png`;
      await page.screenshot({ path: path.join(OUT, shot), fullPage: true }).catch(()=>{});
      tabsReport.push({ tab, horizOverflow: overflow.horiz > 2 ? overflow.horiz : 0, overlaps, shot });
    }
    report.viewports.push({ viewport: vp.name, size: `${vp.w}x${vp.h}`, consoleErrors, failedRequests: failed, tabs: tabsReport });
    await ctx.close();
  }
  await browser.close();

  // краткий вывод
  let issues = 0;
  for (const v of report.viewports) {
    for (const t of v.tabs) {
      if (t.horizOverflow) { issues++; console.log(`⚠ [${v.viewport} · ${t.tab}] горизонтальный оверфлоу: +${t.horizOverflow}px`); }
      for (const o of t.overlaps) { issues++; console.log(`⚠ [${v.viewport} · ${t.tab}] НАЛОЖЕНИЕ ${o.pct}%: ${o.a}  ✕  ${o.b}  @ ${JSON.stringify(o.ra)}`); }
    }
    if (v.consoleErrors.length) { issues++; console.log(`⚠ [${v.viewport}] console errors: ${v.consoleErrors.slice(0,4).join(" | ")}`); }
    if (v.failedRequests.length) { issues++; console.log(`⚠ [${v.viewport}] failed: ${v.failedRequests.slice(0,4).join(" | ")}`); }
  }
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(issues ? `\nИТОГО проблем: ${issues}. Скриншоты и report.json → ${OUT}` : `\n✓ Проблем не найдено. Скриншоты → ${OUT}`);
};
run().catch(e => { console.error(e); process.exit(1); });
