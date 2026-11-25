// Underneath zone settle width (curl-flat and hook seats, zone-landmark / zone-settle labels before the throw): width from
// the ball against the landmark's, the lateral request, and what the curl-flat was doing when he entered the settle.
// Read-only.   [LANE_LEVERAGE=1] node --import tsx scripts/diag/coverage/settle-width-trace.mts
const W = process.cwd();
import { readFileSync } from 'node:fs';
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { ZoneCoverage } = await import(`${W}/src/sim/behaviors/defense.ts`);
const rows: any[] = []; const entries: any[] = [];
const up0 = ZoneCoverage.prototype.update;
ZoneCoverage.prototype.update = function (a: any, sim: any) { const c = up0.call(this, a, sim);
  const L = facingTechnique(c)?.label ?? ''; const z = (this as any).zone as string;
  const prevL = (a as any).__prevL; (a as any).__prevL = L;
  if (/^curl_flat/.test(z) && L === 'zone-settle' && prevL && prevL !== L && sim.ball?.kind === 'held') {
    entries.push({ from: prevL, w: Math.abs(a.pos.y - sim.ballY), t: sim.t }); }
  if (/^(curl_flat|hook)/.test(z) && /^(zone-settle|zone-landmark)$/.test(L) && sim.ball?.kind === 'held' && sim.ball.carrier === sim.qb) {
    const out = Math.sign(a.pos.y - sim.ballY) || 1;
    rows.push({ z: z.startsWith('hook') ? 'hook' : 'cf', L, t: sim.t, w: Math.abs(a.pos.y - sim.ballY), lmw: Math.abs((this as any).landmark.y - sim.ballY),
      vout: c.vel.y * out, tsince: (this as any).settledAt >= 0 ? sim.t - (this as any).settledAt : -1 });
  } return c; };
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && !c.screen).map(([id]) => id);
for (const concept of concepts) for (const coverage of ['cover3', 'cover3_buzz', 'cover4', 'cover6', 'cover2']) for (let seed = 1; seed <= 2; seed++) for (const flip of [false, true]) {
  let setup: any; try { setup = nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }); } catch { continue; }
  try { new PlaySim(setup).run(); } catch { continue; }
}
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return +(s[Math.floor(p * (s.length - 1))] ?? NaN).toFixed(2); };
for (const z of ['cf', 'hook']) for (const L of ['zone-landmark', 'zone-settle']) {
  const r = rows.filter((x) => x.z === z && x.L === L); if (!r.length) continue;
  console.log(z, L, 'n', r.length, 'width p50', q(r.map((x) => x.w), .5), 'landmark width p50', q(r.map((x) => x.lmw), .5),
    'gap (lm-w) p10/p50/p90', q(r.map((x) => x.lmw - x.w), .1), q(r.map((x) => x.lmw - x.w), .5), q(r.map((x) => x.lmw - x.w), .9),
    'lateral request outward p50', q(r.map((x) => x.vout), .5), 'time p50', q(r.map((x) => x.t), .5));
}

const by: Record<string, { n: number; w: number[] }> = {};
for (const e of entries) { const b = by[e.from] ??= { n: 0, w: [] }; b.n++; b.w.push(e.w); }
console.log('curl-flat entering zone-settle, from (n, width at entry p50):');
for (const [k, v] of Object.entries(by).sort((x, y) => y[1].n - x[1].n).slice(0, 12)) console.log('  ', k, v.n, q(v.w, .5));
