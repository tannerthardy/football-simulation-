/** Does the runner's read (runReadAim) ask for the covered or the free side of
 * an engaged defender? At each 'aim' read while the back is 3 yd behind to
 * 0.5 yd past the line, every defender 0-3 yd ahead of him and within 3 yd
 * laterally whom he sees body to body with an upright blocker (the read's own
 * 'locked' test) splits the candidate entries within 2.5 yd of him into the
 * blocker's side (covered) and the other (free). Reports which side the
 * selected entry lies on, and the best risk and score on each side, split by
 * whether the blocker holds the man's play side or backside.
 * usage: EXTRA="FLAG=1" bash out/raw.sh scripts/diag/gap/coverside.ts OUT.json concepts formations [seeds] */
import { writeFileSync } from 'node:fs';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { runReadObservers } from '../../../src/sim/run-read-observer.js';
import { makeSim, rosters, LOOK_SPECS } from '../zone-lab/lab.js';
const [out = 'out/gap/coverside.json', conceptsS = 'iz,oz,wz', formationsS = 'ace_12', seedsS = '77,71001'] = process.argv.slice(2);
const R = rosters();
type Parts = { obstruct: number; m1: number; m2: number; first: number | null };
type Rec = { pc?: Parts; pf?: Parts; firstC?: string; lev: 'ps' | 'bs'; sel: 'covered' | 'free' | 'away'; riskC: number; riskF: number; scoreC: number; scoreF: number; prefSide: number };
const recs: Rec[] = [];
const passes: Array<{ lev: 'ps' | 'bs'; last: string; actual: string }> = [];
for (const seed of seedsS.split(',').map(Number)) for (const concept of conceptsS.split(',')) for (const formation of formationsS.split(','))
for (const dir of ['strong', 'weak'] as const) for (const [look] of LOOK_SPECS) {
  let sim;
  try { sim = makeSim({ concept, dir, formation, look, roster: 'pair11', seed } as never, R); } catch { continue; }
  const ps = playSideSign(sim, sim.offCall.run!), ad = sim.attackDir('O');
  const last = new Map<number, { lev: 'ps' | 'bs'; sel: string; cs: number }>(), done = new Set<number>();
  runReadObservers.set(sim, (ev: any) => {
    if (ev.phase !== 'aim' || !ev.selected) return;
    const a = sim.agents[ev.actor], depth = (a.pos.x - sim.los) * ad;
    if (depth < -3 || depth > .5) return;
    for (const d of sim.defense) {
      const s = sim.see(a, d);
      const ahead = (s.pos.x - a.pos.x) * ad;
      if (ahead < 0 || ahead > 3 || Math.abs(s.pos.y - a.pos.y) > 3 || s.pose === 'down') continue;
      const o = sim.offense.find(o => o !== a && o !== sim.qb && sim.see(a, o).pose !== 'down'
        && Math.hypot(sim.see(a, o).pos.x - s.pos.x, sim.see(a, o).pos.y - s.pos.y) < o.profile.radius + d.profile.radius + .15);
      if (!o) continue;
      const cs = Math.sign(sim.see(a, o).pos.y - s.pos.y);
      if (!cs) continue;
      const near = (ev.candidates as Array<{ entry: { x: number; y: number }; risk: number; score: number; parts: Parts }>).filter(c => Math.abs(c.entry.y - s.pos.y) < 2.5);
      const cov = near.filter(c => (c.entry.y - s.pos.y) * cs > 0), free = near.filter(c => (c.entry.y - s.pos.y) * cs < 0);
      if (!cov.length || !free.length) continue;
      const dy = (ev.selected.y - s.pos.y) * cs;
      last.set(d.idx, { lev: cs * ps > 0 ? 'ps' : 'bs', sel: Math.abs(ev.selected.y - s.pos.y) >= 2.5 ? 'away' : dy > 0 ? 'covered' : 'free', cs });
      const bc = cov.reduce((p, q) => q.risk < p.risk ? q : p), bf = free.reduce((p, q) => q.risk < p.risk ? q : p);
      const who = (i: number | null) => i === null ? 'none' : i === d.idx ? 'this man' : sim.agents[i].slot;
      recs.push({ pc: bc.parts, pf: bf.parts, firstC: who(bc.parts.first) + ' / ' + who(bf.parts.first), lev: cs * ps > 0 ? 'ps' : 'bs', sel: Math.abs(ev.selected.y - s.pos.y) >= 2.5 ? 'away' : dy > 0 ? 'covered' : 'free',
        riskC: Math.min(...cov.map(c => c.risk)), riskF: Math.min(...free.map(c => c.risk)),
        scoreC: Math.min(...cov.map(c => c.score)), scoreF: Math.min(...free.map(c => c.score)),
        prefSide: Math.sign((ev.preferred - s.pos.y) * cs) });
    }
  });
  while (sim.phase === 'live' && sim.t < 6) {
    sim.tick();
    const c = sim.carrier;
    if (!c || c.team !== 'O' || c === sim.qb) continue;
    for (const [idx, L] of last) {
      if (done.has(idx)) continue;
      const d = sim.agents[idx];
      if ((c.pos.x - d.pos.x) * ad < 0) continue;
      done.add(idx);
      if (Math.abs(c.pos.y - d.pos.y) > 3) { passes.push({ lev: L.lev, last: L.sel, actual: 'wide' }); continue; }
      const o = sim.offense.filter(o => o !== c && o !== sim.qb).sort((p, q) => Math.hypot(p.pos.x - d.pos.x, p.pos.y - d.pos.y) - Math.hypot(q.pos.x - d.pos.x, q.pos.y - d.pos.y))[0];
      const engaged = o && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) < 1.2;
      const side = Math.sign((c.pos.y - d.pos.y) * L.cs);
      passes.push({ lev: L.lev, last: L.sel, actual: !engaged ? 'released' : side > 0 ? 'covered' : 'free' });
    }
  }
}
const med = (v: number[]) => { const b = [...v].filter(Number.isFinite).sort((x, y) => x - y); return b.length ? Math.round(b[b.length >> 1] * 100) / 100 : null; };
const summary: Record<string, unknown> = {};
for (const lev of ['ps', 'bs'] as const) {
  const r = recs.filter(x => x.lev === lev);
  summary[lev] = { n: r.length, selCovered: r.filter(x => x.sel === 'covered').length, free: r.filter(x => x.sel === 'free').length, away: r.filter(x => x.sel === 'away').length,
    riskC: med(r.map(x => x.riskC)), riskF: med(r.map(x => x.riskF)), scoreC: med(r.map(x => x.scoreC)), scoreF: med(r.map(x => x.scoreF)),
    preferredOnCovered: r.filter(x => x.prefSide > 0).length,
    covered: { obstruct: med(r.map(x => x.pc!.obstruct)), m1: med(r.map(x => x.pc!.m1)), m2: med(r.map(x => x.pc!.m2)) },
    freeSide: { obstruct: med(r.map(x => x.pf!.obstruct)), m1: med(r.map(x => x.pf!.m1)), m2: med(r.map(x => x.pf!.m2)) },
    firstCoveredSlash: Object.entries(r.reduce((m, x) => { const k = x.firstC!.split(' / ')[0].replace(/_.*/, ''); m[k] = (m[k] ?? 0) + 1; return m; }, {} as Record<string, number>)).sort((p, q) => q[1] - p[1]).slice(0, 6) };
}
const cross: Record<string, number> = {};
for (const p of passes) cross[`${p.lev} read ${p.last} -> passed ${p.actual}`] = (cross[`${p.lev} read ${p.last} -> passed ${p.actual}`] ?? 0) + 1;
summary.passes = Object.fromEntries(Object.entries(cross).sort());
writeFileSync(out, JSON.stringify({ summary, recs, passes }));
console.log(out, JSON.stringify(summary));
