/** The covered center against outside zone (lab; observation only, flags from
 * the environment). For every engaged run rep whose blocker is the center,
 * at 0.5 / 0.75 / 1.0 s: the play side (where the line has gone by 1.5 s),
 * the defender's lateral offset from his own aim (aim - position), the held
 * flow he reads from the blocker, his requested and achieved lateral speed,
 * the blocker's requested lateral speed and the blocker's lateral offset from
 * the defender, all toward the play side; and the fit's gap side.
 * node --import tsx scripts/diag/depth/nosereach.ts [--n 20] */
import { HASH_LEFT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const n = Number(arg('--n', '20'));
const rng = new Rng(7);
const off = generateTeam(rng, 'O', 'OFF', { strength: .55 }), def = generateTeam(rng, 'D', 'DEF', { strength: .55 });
const T = [.5, .75, 1.0];
type S = { aimOff: number; held: number; dReq: number; dGot: number; bReq: number; bOff: number; gapSide: number };
const rows: S[][] = T.map(() => []);
for (const form of ['ace_11', 'i_pro_21']) for (const front of ['over', 'under']) for (let i = 0; i < n; i++) {
  const formation = FORMATION_BY_ID[form], personnel = formation.personnel === '21' ? 'base43' : 'nickel';
  const seed = [...`${form}|${front}|${i}`].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, personnel),
    offCall: { formation, flip: i % 2 === 1, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'oz' },
    defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
    los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed });
  const line = sim.offense.filter(o => ['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot)).map(o => [o, o.pos.y] as const);
  const raw: Array<[number, S]> = [];
  let next = 0, last: Record<string, unknown> | null = null;
  runContactObservers.set(sim, (e, phase, data) => { if (phase === 'movement' && e.blocker.slot === 'C') last = { ...(data as object), e }; });
  let side = 0;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    last = null;
    tick();
    if (!side && sim.t >= 1.5) side = Math.sign(line.reduce((m, [o, y]) => m + o.pos.y - y, 0)) || 1;
    if (next < T.length && sim.t >= T[next] - 1e-9) {
      const m = last as (Record<string, any> & { e: any }) | null;
      if (m) {
        const d = m.e.defender, b = m.e.blocker;
        raw.push([next, { aimOff: m.defensiveAim.y - d.pos.y, held: m.heldTargetFlow ?? m.heldFlow ?? 0, dReq: sim.intents[d.idx]?.vel.y ?? 0, dGot: d.vel.y,
          bReq: sim.intents[b.idx]?.vel.y ?? 0, bOff: b.pos.y - d.pos.y, gapSide: d.runFit?.side ?? 0 }]);
      }
      next++;
    }
  };
  sim.run();
  for (const [k, r] of raw) {
    const s = side || 1;
    rows[k].push({ aimOff: r.aimOff * s, held: r.held * s, dReq: r.dReq * s, dGot: r.dGot * s, bReq: r.bReq * s, bOff: r.bOff * s, gapSide: r.gapSide * s });
  }
}
const mean = (v: number[]) => v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '-';
for (let k = 0; k < T.length; k++) {
  const R = rows[k];
  console.log(`t ${T[k]} n ${R.length}: defender aim offset ${mean(R.map(r => r.aimOff))} | held flow ${mean(R.map(r => r.held))} | defender req ${mean(R.map(r => r.dReq))} got ${mean(R.map(r => r.dGot))} | center req ${mean(R.map(r => r.bReq))}, center offset from him ${mean(R.map(r => r.bOff))} | fit side toward play ${mean(R.map(r => r.gapSide))}`);
}
