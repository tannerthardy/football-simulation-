/** Down linemen in the first 0.8 s of outside zone (lab; observation only,
 * flags from the environment). The same seeds per arm. Every 0.1 s: lateral
 * velocity toward the play side (where the offensive line has gone by 1.5 s)
 * requested and achieved; and per lineman the
 * time he first moves (0.3 yd/s), the time the blocker in front of him first
 * steps across (0.35 yd/s, true).
 * node --import tsx scripts/diag/depth/dlstart.ts [--n 30] */
import { HASH_LEFT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const n = Number(arg('--n', '30'));
const rng = new Rng(7);
const off = generateTeam(rng, 'O', 'OFF', { strength: .55 }), def = generateTeam(rng, 'D', 'DEF', { strength: .55 });
const T = [.1, .2, .3, .4, .5, .6, .7, .8];
const req: number[][] = T.map(() => []), got: number[][] = T.map(() => []);
const moved: number[] = [], stepped: number[] = [];
const DL = /^(DE|DT|NT)/, LINE = ['LT', 'LG', 'C', 'RG', 'RT'];
for (const form of ['ace_11', 'i_pro_21']) for (const front of ['over', 'under']) for (let i = 0; i < n; i++) {
  const formation = FORMATION_BY_ID[form], personnel = formation.personnel === '21' ? 'base43' : 'nickel';
  const seed = [...`${form}|${front}|${i}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, personnel),
    offCall: { formation, flip: i % 2 === 1, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'oz' },
    defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
    los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed });
  let side = 0;
  const raw: Array<[number, number, number]> = [];
  const line0 = sim.offense.filter(o => LINE.includes(o.slot)).map(o => [o, o.pos.y] as const);
  const dls = sim.defense.filter(d => DL.test(d.slot));
  const key = new Map<Agent, Agent>(dls.map(d => [d, sim.offense.filter(o => LINE.includes(o.slot)).reduce((p, q) => Math.abs(q.pos.y - d.pos.y) < Math.abs(p.pos.y - d.pos.y) ? q : p)]));
  const first = new Map<Agent, { moved?: number; stepped?: number }>(dls.map(d => [d, {}]));
  let next = 0;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const t = sim.t;
    for (const d of dls) {
      const f = first.get(d)!, b = key.get(d)!;
      if (f.moved === undefined && d.speed > .3) f.moved = t;
      if (f.stepped === undefined && Math.abs(b.vel.y) > .35) f.stepped = t;
    }
    if (!side && t >= 1.5) side = Math.sign(line0.reduce((s, [o, y]) => s + o.pos.y - y, 0)) || 1;
    if (next < T.length && t >= T[next] - 1e-9) {
      for (const d of dls) raw.push([next, sim.intents[d.idx]?.vel.y ?? 0, d.vel.y]);
      next++;
    }
  };
  sim.run();
  for (const [k, r, g] of raw) { req[k].push(r * (side || 1)); got[k].push(g * (side || 1)); }
  for (const f of first.values()) { if (f.moved !== undefined) moved.push(f.moved); if (f.stepped !== undefined) stepped.push(f.stepped); }
}
const mean = (v: number[]) => v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '-';
const med = (v: number[]) => { const w = [...v].sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
console.log('t        ' + T.map(t => t.toFixed(1).padStart(6)).join(''));
console.log('lat req  ' + req.map(v => mean(v).padStart(6)).join(''));
console.log('lat got  ' + got.map(v => mean(v).padStart(6)).join(''));
console.log(`first move p50 ${med(moved)} s | key blocker first steps across p50 ${med(stepped)} s (${moved.length} linemen)`);
