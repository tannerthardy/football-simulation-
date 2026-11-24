/** Believed body, gate 3 (Flex, 2026-11-24; docs/reviews/2026-11-24-believed-body.md §10): an off corner in man coverage on a
 * receiver who is truly faster than his build says (his forty lowered; no film: experience 0). The same scene, seed and bodies
 * each rep; the receiver runs a go and the ball is held. Per rep: what the corner believes of the receiver's top speed at the
 * snap and at the end, and the cushion (corner's depth past the receiver, yd) through the rep.
 *   rep 1: build only.  rep 2: the same corner after his own look on rep 1.
 *   teammate: the corners' players swapped so the other man has him, after the huddle (told) or with no huddle (not told).
 * Run it twice: BELIEVED_BODY=1 and without (the corner reads the man's true capacities).
 * usage: [BELIEVED_BODY=1] node --import tsx scripts/diag/belief/staged-cushion.mts */
import { Rng } from '../../../src/core/rng.js';
import { CENTER_Y } from '../../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { PassConcept } from '../../../src/playbook/types.js';
import { BELIEVED_BODY, BeliefStore, PRIOR_FIT } from '../../../src/sim/believed-body.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import type { Agent } from '../../../src/sim/agent.js';

const off = generateTeam(new Rng(21), 'Offense', 'OFF', { strength: 0.6 });
const def = generateTeam(new Rng(22), 'Defense', 'DEF', { strength: 0.6 });
const formation = FORMATION_BY_ID.gun_doubles_11;
const roster = pickOffense(off, formation.personnel);
const fast = roster.X!;
fast.experience = 0;
fast.measurables = { ...fast.measurables, forty: fast.measurables.forty - 0.27 };
const concept: PassConcept = { id: 'lab', name: 'lab', family: 'dropback', drop: 'gun5', strong: { 1: 'hitch', 2: 'hitch', 3: 'hitch', 4: 'hitch' },
  weak: { 1: 'go', 2: 'hitch', 3: 'hitch', 4: 'hitch' }, back: 'block', progression: ['S1'], beats: [] };

const defense = pickDefense(def, 'nickel');
const swapped = { ...defense, CB_S: defense.CB_W, CB_W: defense.CB_S };
function rep(store: BeliefStore | undefined, flip: boolean, teammate = false) {
  const sim = new PlaySim({
    offense: roster, defense: teammate ? swapped : defense,
    offCall: { formation, flip, kind: 'pass', pass: { ...concept, ...(flip ? { strong: concept.weak, weak: concept.strong } : {}) }, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1_off, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5, beliefs: store,
  });
  sim.throwBall = () => undefined;
  const R = sim.offense.find((o) => o.player === fast)!;
  const corner = sim.defense.find((d) => (d.behavior as { target?: Agent }).target === R);
  const bel = () => (BELIEVED_BODY && sim.beliefs && corner ? sim.beliefs.belief(corner, R).get('vmax') : null);
  const at0 = bel();
  const cushion: Record<string, string> = {};
  const step = sim as unknown as { tick(): void };
  while (sim.phase === 'live' && sim.t < 4.6) {
    step.tick();
    for (const t of [1.0, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5]) if (Math.abs(sim.t - t) < sim.dt / 2 && corner) cushion[t.toFixed(2)] = (corner.pos.x - R.pos.x).toFixed(2);
  }
  return { sim, corner: corner ? `${corner.slot} (${corner.player.lastName})` : '-', truth: R.profile.vmax, at0, end: bel(), cushion };
}
const fmt = (b: { mean: number; sd: number; floor: number } | null) => (b ? `${b.mean.toFixed(2)} ± ${b.sd.toFixed(2)}${Number.isFinite(b.floor) ? ` (floor ${b.floor.toFixed(2)})` : ''}` : 'truth');
const m = fast.measurables, u = (m.weightLb - 250) / 50, h = (m.heightIn - 74) / 2, c = PRIOR_FIT.vmax.c;
console.log(`BELIEVED_BODY=${BELIEVED_BODY ? 1 : 0}; receiver ${m.weightLb} lb ${m.heightIn} in, build prior vmax ${(c[0] + c[1] * u + c[2] * u * u + c[3] * h).toFixed(2)}`);
const row = (name: string, r: ReturnType<typeof rep>) =>
  console.log(`| ${name} | ${r.corner} | ${r.truth.toFixed(2)} | ${fmt(r.at0)} | ${fmt(r.end)} | ${Object.entries(r.cushion).map(([t, v]) => `${t}s ${v}`).join(', ')} |`);
console.log('| rep | corner | true vmax | believed at snap | believed at end | cushion (corner past receiver, yd) |');
console.log('|---|---|---|---|---|---|');
const store = BELIEVED_BODY ? new BeliefStore('stage') : undefined;
const r1 = rep(store, false); row('1: build only', r1);
const huddle = (s: BeliefStore | undefined, sim: PlaySim) => s?.huddle([sim.defense.map((a) => ({ id: a.player.id, awareness01: 1 }))]);
huddle(store, r1.sim);
row('2: same corner, after his look', rep(store, false));
// The teammate: rep 2 with the corners' players swapped, so the other man has him; after the huddle (told) or with none.
const told = BELIEVED_BODY ? new BeliefStore('stage-t') : undefined, untold = BELIEVED_BODY ? new BeliefStore('stage-u') : undefined;
const t1 = rep(told, false); huddle(told, t1.sim);
rep(untold, false); untold?.huddle([]);
row('teammate, told in the huddle', rep(told, false, true));
row('teammate, not told', rep(untold, false, true));
