// Sim twin of back_flat_nfl.py: backs on called drop-backs (no screens / play action). Depth past the line and width
// outward from the ball at 0.5-2.5 s for back routes to the flat (routeOfAgent 'back:<id>', split by route id), and
// the earliest-cue table: for every back (route or protection), the first time his outward displacement from his
// snap spot reaches 0.5 / 1.0 / 1.5 yd with outward speed (0.2 s difference) over 1.0 / 1.5 yd/s, by his route.
// usage: npx tsx scripts/diag/risk/back-cue.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { routeOfAgent } from '../../../src/sim/behaviors/receiver.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const TS = [0.5, 1.0, 1.5, 2.0, 2.5], recs: any[] = [];
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this, pass = sim.offCall?.kind === 'pass' ? sim.offCall.pass : null;
  if (!pass || pass.family === 'screen' || pass.family === 'playaction') return run.call(this);
  const backs = sim.offense.filter((o: any) => (sim.offAlign.refOf[o.slot] ?? o.slot).startsWith('B'));
  const ly = sim.ballY, T: Map<any, any[]> = new Map(backs.map((b: any) => [b, []]));
  let t0 = -1;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (t0 < 0) t0 = sim.t; for (const b of backs) T.get(b)!.push({ t: sim.t - t0, x: b.pos.x - sim.los, y: b.pos.y }); };
  const r = run.call(this);
  for (const b of backs) recs.push({ route: routeOfAgent.get(b) ?? 'in', T: T.get(b), ly });
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
const at = (S: any[], t: number) => S.find(s => s.t >= t - 1e-9);
const rows = new Map<string, any>(), cues = new Map<string, Map<string, number[]>>();
for (const R of recs) {
  const S = R.T; if (S.length < 3) continue;
  const s0 = S[0], end = at(S, 2.5) ?? S[S.length - 1], side = end.y - s0.y >= 0 ? 1 : -1;
  if (/flat|out|swing|wheel|angle/.test(R.route)) {
    const m = rows.get(R.route) ?? new Map(); rows.set(R.route, m);
    for (const t of TS) { const p = at(S, t); if (p) (m.get(t) ?? m.set(t, []).get(t)).push([p.x, (p.y - R.ly) * side]); }
  }
  for (const d of [0.5, 1.0, 1.5]) for (const v of [1.0, 1.5]) {
    const k = `${d}/${v}`, m = cues.get(k) ?? new Map(); cues.set(k, m);
    for (let i = 0; i < S.length; i++) {
      const p = S[i], pp = S.slice(0, i).reverse().find((s: any) => p.t - s.t >= 0.2 - 1e-9); if (!pp || p.t < 0.1) continue;
      if ((p.y - s0.y) * side >= d && (p.y - pp.y) * side / (p.t - pp.t) >= v) { (m.get(R.route) ?? m.set(R.route, []).get(R.route)).push(p.t); break; }
    }
  }
}
console.log(`== sim seed ${seed}: backs on drop-backs ${recs.length}; route mix ${[...recs.reduce((m, r) => m.set(r.route, (m.get(r.route) ?? 0) + 1), new Map()).entries()].sort((a: any, b: any) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}`);
for (const [route, m] of rows) { console.log(`   ${route}: n ${m.get(1.0)?.length ?? 0}`); for (const t of TS) { const v = m.get(t) ?? []; console.log(`      ${t.toFixed(1)} s depth ${q(v.map((e: any) => e[0]))} width ${q(v.map((e: any) => e[1]))}`); } }
console.log('== earliest cue: time fired p25/50/75 by route');
for (const [k, m] of cues) { const n = [...m.values()].reduce((a, v) => a + v.length, 0), fl = [...m.entries()].filter(([r]) => /flat|out|swing|wheel/.test(r)).reduce((a, [, v]) => a + v.length, 0);
  console.log(`   out >= ${k.split('/')[0]} yd, speed >= ${k.split('/')[1]} yd/s: fired ${n}, flat-side ${fl} (${(fl / Math.max(1, n)).toFixed(2)}): ` + [...m.entries()].sort((a, b) => b[1].length - a[1].length).map(([r, v]) => `${r} ${v.length} (${q(v)})`).join(', ')); }
