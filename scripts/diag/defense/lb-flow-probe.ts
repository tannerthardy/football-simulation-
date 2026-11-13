/** Backer flow on designed runs: per 0.5 s window after the snap, each
 * second-level defender's requested and achieved play-side velocity, his
 * state (engaged, fit kind) and tags the fit sets (flow read, pull read,
 * declared runner). Same inputs as zone/path-probe. Observation only.
 * node --import tsx scripts/diag/defense/lb-flow-probe.ts [runs=power,counter] [seeds=3,7]
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { playSideSign } from '../../../src/sim/behaviors/blocking.js';

const runs = (process.argv[2] ?? 'power,counter').split(',');
const seeds = (process.argv[3] ?? '3,7').split(',').map(Number);
const W = [0.5, 1.0, 1.5, 2.0, 2.5];
const acc = new Map<string, { n: number; req: number; ach: number; pos: number; tags: Map<string, number> }>();
for (const run of runs) for (const seed of seeds) for (const [o, d] of [[31, 32], [41, 42], [51, 52]])
  for (const front of ['over', 'under']) for (const flip of [false, true]) {
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
      defense: pickDefense(generateTeam(new Rng(d), 'D', 'D', { strength: .55 }), 'base43'),
      offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
    const side = playSideSign(sim, RUN_BY_ID[run]);
    const lbs = sim.defense.filter((a) => a.slot.startsWith('LB'));
    const y0 = new Map(lbs.map((a) => [a, a.pos.y]));
    while (sim.phase === 'live' && sim.t < 2.5) {
      for (const a of lbs) a.tags.clear();
      (sim as unknown as { tick(): void }).tick();
      const w = W.find((x) => sim.t <= x + 1e-9); if (w === undefined) break;
      for (const a of lbs) {
        if (a.isDown(sim.t)) continue;
        const state = a.engagement ? 'engaged' : a.runFit ? `${a.runFit.kind}` : 'nofit';
        const key = `${run} <=${w.toFixed(1)}s ${a.slot.padEnd(4)} ${state}`;
        let g = acc.get(key); if (!g) { g = { n: 0, req: 0, ach: 0, pos: 0, tags: new Map() }; acc.set(key, g); }
        const r = (sim as any).intents[a.idx]?.vel ?? { x: 0, y: 0 };
        g.n++; g.req += r.y * side; g.ach += a.vel.y * side; g.pos += (a.pos.y - y0.get(a)!) * side;
        for (const t of a.tags) g.tags.set(t, (g.tags.get(t) ?? 0) + 1);
      }
    }
  }
const f = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
for (const [k, g] of [...acc].sort((p, q) => p[0].localeCompare(q[0]))) if (g.n >= 20)
  console.log(`${k.padEnd(38)} n ${String(g.n).padStart(4)} | play side req ${f(g.req / g.n)} ach ${f(g.ach / g.n)} | moved ${f(g.pos / g.n)} | tags ${[...g.tags].filter(([, c]) => c > g.n * .1).map(([t, c]) => `${t} ${(c / g.n).toFixed(2)}`).join(', ')}`);
