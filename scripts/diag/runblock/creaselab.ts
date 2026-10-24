/** Inside-run crease lab: the same bodies, calls and seeds per rep, so two
 * engine arms differ only where a mechanism acts (observation only; flags
 * from the environment). Inside zone, duo, power, counter and trap from ace,
 * I and gun doubles against Over and Under, both flips, at the middle and
 * the left hash.
 *
 * Per play: yards; at the tick the carrier crosses the line, the defender
 * opening around him (nearest defender each side within 1.5 yd of his depth,
 * as creasewho.py and run-hole.py) and, for each framer engaged then, his
 * lateral velocity toward the hole requested and achieved over the last 1 s.
 *
 * node --import tsx scripts/diag/runblock/creaselab.ts [--reps 6] [--seed 7] [--out out/creaselab.json] */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y, HASH_LEFT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const reps = Number(arg('--reps', '6')), seed = Number(arg('--seed', '7')), out = arg('--out', '');
const rng = new Rng(seed);
const home = generateTeam(rng.fork('offense'), 'Offense', 'OFF', { strength: 0.55 });
const away = generateTeam(rng.fork('defense'), 'Defense', 'DEF', { strength: 0.55 });
type Play = { cell: string; concept: string; yards: number; open?: number; near?: number; framers: Array<{ req: number; got: number }>; free: Array<{ req: number; got: number; slot: string; off: number }> };
const plays: Play[] = [];
for (const form of ['ace_11', 'i_pro_21', 'gun_doubles_11']) {
  const formation = FORMATION_BY_ID[form];
  const personnel = formation.personnel === '11' ? 'nickel' : 'base43';
  for (const concept of ['iz_strong', 'duo', 'power', 'counter', 'trap']) for (const front of ['over', 'under'])
    for (const flip of [false, true]) for (const ballY of [CENTER_Y, HASH_LEFT_Y]) for (let i = 0; i < reps; i++) {
      const cell = `${form}:${concept}:${front}:${flip}:${ballY}`;
      const sim = new PlaySim({ offense: pickOffense(home, formation.personnel), defense: pickDefense(away, personnel),
        offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[concept], label: concept },
        defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
        los: 40, ballY, firstDownX: 50, seed: rng.fork(`${cell}:${i}`) });
      const hist = new Map<Agent, Array<{ t: number; y: number; vy: number; ivy: number }>>();
      type Crossing = { t: number; hole: number; open?: number; near?: number; engaged: Agent[]; free: Agent[] };
      let crossing: Crossing | null = null;
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        tick();
        for (const d of sim.defense) {
          const h = hist.get(d) ?? [];
          h.push({ t: sim.t, y: d.pos.y, vy: d.vel.y, ivy: sim.intents[d.idx]?.vel.y ?? 0 });
          if (h.length > 200) h.shift();
          hist.set(d, h);
        }
        const c = sim.carrier;
        if (crossing || !c || c.team !== 'O' || c === sim.qb || (c.pos.x - sim.los) * sim.attackDir('O') < 0) return;
        const near = sim.defense.filter(d => Math.abs(d.pos.x - c.pos.x) <= 1.5 && Math.abs(d.pos.y - c.pos.y) <= 8);
        const sides = [-1, 1].map(s => near.filter(d => (d.pos.y - c.pos.y) * s > 0)
          .sort((p, q) => Math.abs(p.pos.y - c.pos.y) - Math.abs(q.pos.y - c.pos.y))[0]);
        const dist = sides.filter(Boolean).map(d => Math.abs(d!.pos.y - c.pos.y));
        crossing = { t: sim.t, hole: c.pos.y, open: dist.length === 2 ? dist[0] + dist[1] : undefined,
          near: dist.length ? Math.min(...dist) : undefined, engaged: sides.filter((d): d is Agent => !!d?.engagement),
          free: sides.filter((d): d is Agent => !!d && !d.engagement) };
      };
      const r = sim.run();
      const at = crossing as Crossing | null;
      const framers = (at?.engaged ?? []).map(d => {
        const h = hist.get(d)!.filter(s => s.t > at!.t - 1.0 && s.t <= at!.t);
        const toward = (y: number) => Math.sign(at!.hole - y);
        return { req: h.reduce((a, s) => a + s.ivy * toward(s.y), 0) / h.length, got: h.reduce((a, s) => a + s.vy * toward(s.y), 0) / h.length };
      });
      const free = (at?.free ?? []).map(d => {
        const h = hist.get(d)!.filter(s => s.t > at!.t - 1.0 && s.t <= at!.t);
        const toward = (y: number) => Math.sign(at!.hole - y);
        return { req: h.reduce((a, s) => a + s.ivy * toward(s.y), 0) / h.length, got: h.reduce((a, s) => a + s.vy * toward(s.y), 0) / h.length,
          slot: d.slot, off: Math.abs(d.pos.y - at!.hole) };
      });
      plays.push({ cell, concept, yards: r.offenseYards, open: at?.open, near: at?.near, framers, free });
    }
}
if (out) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify({ seed, reps, plays }) + '\n'); }
const q = (v: number[], f = .5) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(f * (w.length - 1))] : NaN; };
const f2 = (x: number) => x.toFixed(2);
console.log('concept   plays  mean  p25/p50/p75      10+%  stuff%  opening  near  blocked framers req/got | free framers req/got toward hole (yd/s), off the hole');
for (const concept of ['all', 'iz_strong', 'duo', 'power', 'counter', 'trap']) {
  const P = plays.filter(p => concept === 'all' || p.concept === concept), y = P.map(p => p.yards), F = P.flatMap(p => p.framers);
  console.log(`${concept.padEnd(10)}${String(P.length).padStart(5)} ${f2(y.reduce((a, b) => a + b, 0) / y.length).padStart(5)}  ${f2(q(y, .25))}/${f2(q(y))}/${f2(q(y, .75))}`
    + `  ${(100 * y.filter(v => v >= 10).length / y.length).toFixed(1).padStart(5)}  ${(100 * y.filter(v => v <= 0).length / y.length).toFixed(1).padStart(5)}`
    + `   ${f2(q(P.map(p => p.open ?? NaN)))}   ${f2(q(P.map(p => p.near ?? NaN)))}  ${f2(q(F.map(f => f.req)))}/${f2(q(F.map(f => f.got)))} (n${F.length})`
    + ` | ${f2(q(P.flatMap(p => p.free).map(f => f.req)))}/${f2(q(P.flatMap(p => p.free).map(f => f.got)))} at ${f2(q(P.flatMap(p => p.free).map(f => f.off)))} (n${P.flatMap(p => p.free).length})`);

}
const slots = new Map<string, number>();
for (const f of plays.flatMap(p => p.free)) slots.set(f.slot.replace(/_.*/, ''), (slots.get(f.slot.replace(/_.*/, '')) ?? 0) + 1);
console.log('free framers by position:', [...slots].map(([k, n]) => `${k} ${n}`).join(', '));
