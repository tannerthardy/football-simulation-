/** Who limits lateral flow in engaged run reps? For each engaged run rep
 * (blocker on a defender), per 0.5 s window after the snap: the play-side
 * velocity each side requests (final intent after contact and spacing) and
 * achieves, the defender's request source, and the felt load. Same inputs as
 * path-probe. Observation only.
 * node --import tsx scripts/diag/zone/flow-probe.ts [runs=oz_strong,wz_strong] [seeds=3,7]
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';

const runs = (process.argv[2] ?? 'oz_strong,wz_strong').split(',');
const seeds = (process.argv[3] ?? '3,7').split(',').map(Number);
const W = [0.5, 1.0, 1.5, 2.0, 2.5];
type Acc = { c: number; cneg: number; csat: number; n: number; bReq: number; bAch: number; dReq: number; dAch: number; free: number; freeReq: number; freeAch: number; fn: number };
const acc = new Map<string, Acc>();
const get = (k: string) => { let a = acc.get(k); if (!a) { a = { c: 0, cneg: 0, csat: 0, n: 0, bReq: 0, bAch: 0, dReq: 0, dAch: 0, free: 0, freeReq: 0, freeAch: 0, fn: 0 }; acc.set(k, a); } return a; };

for (const run of runs) for (const seed of seeds) for (const [o, d] of [[31, 32], [41, 42], [51, 52]])
  for (const front of ['over', 'under']) for (const flip of [false, true]) {
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
      defense: pickDefense(generateTeam(new Rng(d), 'D', 'D', { strength: .55 }), 'base43'),
      offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
    const side = playSideSign(sim, RUN_BY_ID[run]);
    const dl = sim.defense.filter((a) => /^(DE|DT|NT)/.test(a.slot));
    while (sim.phase === 'live' && sim.t < 2.5) {
      (sim as unknown as { tick(): void }).tick();
      const w = W.find((x) => sim.t <= x + 1e-9); if (w === undefined) break;
      for (const e of sim.engagements) {
        if (e.type !== 'run' || !dl.includes(e.defender)) continue;
        const kind = process.env.BY_KIND ? ` ${(e.blocker.behavior as any).plan?.kind ?? '?'}${e.helpers.length ? '+help' : ''}` : '';
        const a = get(`${run} <=${w.toFixed(1)}s${kind}`);
        const bi = (sim as any).intents[e.blocker.idx]?.vel, di = (sim as any).intents[e.defender.idx]?.vel;
        if (!bi || !di) continue;
        a.c += e.control; if (e.control < 0) a.cneg++; if (Math.abs(e.control) > .95) a.csat++;
        a.n++; a.bReq += bi.y * side; a.bAch += e.blocker.vel.y * side; a.dReq += di.y * side; a.dAch += e.defender.vel.y * side;
      }
      const a = get(`${run} <=${w.toFixed(1)}s free`);
      for (const x of dl) if (!x.engagement && !x.isDown(sim.t)) {
        const di = (sim as any).intents[x.idx]?.vel; if (!di) continue;
        a.fn++; a.freeReq += di.y * side; a.freeAch += x.vel.y * side;
      }
    }
  }
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
console.log('play-side velocity, yd/s: requested / achieved (mean over engaged DL reps and ticks)');
for (const [k, a] of [...acc].sort((p, q) => p[0].localeCompare(q[0]))) if (a.n || a.fn) console.log(`${k.padEnd(18)} control mean ${(a.c / Math.max(1, a.n)).toFixed(2)} defender ${(a.cneg / Math.max(1, a.n)).toFixed(2)} saturated ${(a.csat / Math.max(1, a.n)).toFixed(2)} | engaged n ${String(a.n).padStart(4)} | blocker ${f(a.bReq / a.n)} / ${f(a.bAch / a.n)} | DL ${f(a.dReq / a.n)} / ${f(a.dAch / a.n)} | unblocked DL n ${a.fn} ${f(a.freeReq / Math.max(1, a.fn))} / ${f(a.freeAch / Math.max(1, a.fn))}`);
