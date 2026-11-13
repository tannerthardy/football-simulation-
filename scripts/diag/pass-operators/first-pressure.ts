// Same operator as nfl_backblock.py; plus pressure attribution: first defender within 2 yd of the QB before the throw.
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { restoreSetup } from '../saved-play.js';
const cnt: Record<string, number> = {}; const out: Record<string, number[]> = {}; const pr: Record<string, number> = {};
for (const seed of ['7', '11']) for (let k = 0; k < 4; k++) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; const sim = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    const dice = sim.dice.bind(sim), made = new Set<string>();
    (sim as any).dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    if (sim.offCall.pass?.fake || sim.offCall.pass?.family === 'screen') return;
    const backs = sim.offense.filter(o => ['RB', 'FB'].includes((o as any).player.position) && sim.los - o.pos.x >= 3);
    const grp = new Map(backs.map(b => [b.idx, b.behavior instanceof RouteRunner || (b.behavior as any).passOption ? 'route' : 'stays in']));
    const x0 = new Map(backs.map(b => [b.idx, { ...b.pos }])); const st = new Map(backs.map(b => [b.idx, { run: 0, best: 0, first: -1, rel: -1, assigned: new Set<number>(), engaged: new Set<number>() }]));
    const touched = new Set<number>(); let press: any = null; const tick = sim.tick.bind(sim);
    (sim as any).tick = () => { tick(); if (sim.throwAt >= 0 || sim.carrier !== sim.qb) return;
      for (const o of sim.offense) if (o.engagement) touched.add(o.engagement.defender.idx);
      for (const b of backs) { const s = st.get(b.idx)!; if (s.rel >= 0) continue; const o = x0.get(b.idx)!;
        if (b.pos.x - sim.los > 0 || Math.abs(b.pos.y - o.y) > 5) { s.rel = sim.t; continue; }
        const beh: any = b.behavior; const asg = beh?.coord?.assigned?.get?.(b); if (asg) s.assigned.add(asg.idx); if (b.engagement) s.engaged.add(b.engagement.defender.idx);
        if (sim.defense.some(d => Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) < 1.0)) { s.run++; if (s.run === 2 && s.first < 0) s.first = sim.t; s.best = Math.max(s.best, s.run); } else s.run = 0; }
      if (!press) { const c = sim.defense.find(d => Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) <= 2); if (c) press = { d: c.idx, t: sim.t, free: !touched.has(c.idx) }; } };
    sim.run();
    for (const b of backs) { const g = grp.get(b.idx)!; const s = st.get(b.idx)!; cnt[g + '|n'] = (cnt[g + '|n'] ?? 0) + 1; const steps = Math.round(sim.dt ? 0.1 / sim.dt : 2);
      const bestS = s.best * sim.dt; if (bestS >= 0.2) { cnt[g + '|c'] = (cnt[g + '|c'] ?? 0) + 1; (out[g + '|dur'] ??= []).push(bestS); (out[g + '|start'] ??= []).push(s.first); } if (g === 'route' && s.rel >= 0) (out.rel ??= []).push(s.rel); }
    if (press) { const backAssigned = backs.some(b => st.get(b.idx)!.assigned.has(press.d)); const backEngaged = backs.some(b => st.get(b.idx)!.engaged.has(press.d)); const released = backs.some(b => st.get(b.idx)!.rel >= 0 && st.get(b.idx)!.rel < press.t);
      const key = !press.free ? 'pressure by a blocked man' : backAssigned ? 'free, assigned to the back at some point' : released && backs.length ? 'free, back already released' : backs.length ? 'free, back in but never on him' : 'free, no back';
      pr[key] = (pr[key] ?? 0) + 1; pr.total = (pr.total ?? 0) + 1; } }); }
const q = (v: number[] = [], x: number) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(x * (v.length - 1))].toFixed(2) : '-';
for (const g of ['route', 'stays in']) { const n = cnt[g + '|n'] ?? 0; console.log(`sim back ${g.padEnd(8)} n ${n} | contact before release ${((cnt[g + '|c'] ?? 0) / Math.max(1, n) * 100).toFixed(0)}% | contact start p50 ${q(out[g + '|start'], .5)} s, longest contact p50 ${q(out[g + '|dur'], .5)} s${g === 'route' ? ` | release p50 ${q(out.rel, .5)}` : ''}`); }
console.log('first pressure (defender within 2 yd of the QB before the throw):', JSON.stringify(pr));
