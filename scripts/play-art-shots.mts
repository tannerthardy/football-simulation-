// @ts-nocheck
/** Screenshots of the play-art view for a spread of plays (cover 1/2/3/4/6, play-action, screens, runs).
 *   node --import tsx scripts/play-art-shots.mts out/art/t2.html out/art/shots [N] */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [file, outDir, nArg] = process.argv.slice(2);
const html = readFileSync(file, 'utf8');
const i0 = html.indexOf('{"meta"');
let depth = 0, i = i0, inStr = false, esc = false;
for (; i < html.length; i++) { const c = html[i]; if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; } if (c === '"') inStr = true; else if (c === '{') depth++; else if (c === '}' && --depth === 0) break; }
const data = JSON.parse(html.slice(i0, i + 1));
const plays: any[] = data.plays.filter((p: any) => p.art && p.frames);
const pick: any[] = [];
const used = new Set<string>();
const add = (p: any | undefined) => { if (p && !used.has(p.id)) { used.add(p.id); pick.push(p); } };
const fam = (p: any) => p.art.defense.family;
for (const f of ['cover1', 'cover2', 'cover3', 'cover4', 'cover6', 'tampa2', 'cover0']) { const c = plays.filter((p) => p.kind === 'pass' && fam(p) === f && !/pa$|\+pa/.test(p.plan?.concept ?? '')); add(c[0]); add(c[Math.floor(c.length / 2)]); }
add(plays.find((p) => p.kind === 'pass' && /\+pa/.test(p.plan?.concept ?? '')));
add(plays.filter((p) => p.kind === 'pass' && /\+pa/.test(p.plan?.concept ?? ''))[3]);
add(plays.find((p) => p.concept.family === 'screen'));
add(plays.filter((p) => p.concept.family === 'screen')[2]);
add(plays.find((p) => p.kind === 'run' && p.concept.family === 'zone'));
add(plays.find((p) => p.kind === 'run' && p.concept.family === 'gap'));
const N = Number(nArg ?? pick.length);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('file://' + (file.startsWith('/') ? file : process.cwd() + '/' + file));
const log: string[] = [];
for (const p of pick.slice(0, N)) {
  await page.evaluate((id) => { const e = document.getElementById('search') as HTMLInputElement; e.value = id; e.dispatchEvent(new Event('input')); }, p.id);
  await page.waitForTimeout(250);
  const title = await page.textContent('#clip-title');
  const ok = title?.startsWith(p.id);
  await page.waitForTimeout(250);
  const el = await page.$('#field');
  await el!.screenshot({ path: `${outDir}/${p.id}.png` });
  const rows = await page.$$eval('.art-row', (r) => r.length);
  log.push(`${p.id} ${ok ? 'ok' : 'NOT LOADED (' + title + ')'} · ${p.art.offense.name} / ${p.art.defense.coverage} (${p.art.defense.family}) · art rows ${rows}`);
}
await page.evaluate((id) => { const e = document.getElementById('search') as HTMLInputElement; e.value = id; e.dispatchEvent(new Event('input')); }, pick[0].id); await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/_page.png`, fullPage: true });
writeFileSync(`${outDir}/_log.txt`, log.join('\n') + '\n' + (errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors'));
console.log(log.join('\n')); console.log(errors.length ? errors.join('\n') : 'no page errors');
await browser.close();
