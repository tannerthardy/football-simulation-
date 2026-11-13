/**
 * Film for the match corner's "In"/"Under" release of #1 (MOD Quarters,
 * Cover 3 match; MEG as an unchanged control). One snap per case, the QB
 * holds the ball, #2 runs a hitch on both sides so no #2 vertical pulls
 * the corner. Prints the corner's jobs, his rule mode, and where he is
 * relative to #1 at fixed times.
 *
 *   node --import tsx scripts/corner-one-film.ts > out/corner-one-film.json
 */
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { COVERAGE_BY_ID } from '../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ROUTES } from '../src/playbook/routes.js';
import type { PassConcept } from '../src/playbook/types.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import { PlaySim } from '../src/sim/playsim.js';

/** Lab routes for #1, not installed: a 7-yd curl and a stop-and-go off a 6.5-yd stop. */
export const LAB_ROUTES = {
  lab_curl7: { id: 'lab_curl7', family: 'intermediate', depth: 7, end: 'settle', points: [{ d: 7, l: 0, s: 0.2 }, { d: 6.5, l: -1, s: 0 }] },
  // The stop is a one-yard settle at the same depth: the route controller
  // skips a waypoint that lies behind the receiver on the way to the next.
  lab_stop_go: { id: 'lab_stop_go', family: 'deep', depth: 20, end: 'continue', points: [{ d: 6.5, l: 0, s: 0.1 }, { d: 6.5, l: 1, s: 0 }, { d: 50, l: 1.5 }] },
} as const;
Object.assign(ROUTES, LAB_ROUTES);

const offense = generateTeam(new Rng(21), 'Offense', 'OFF', { strength: 0.6 });
const defense = generateTeam(new Rng(22), 'Defense', 'DEF', { strength: 0.6 });

function film(coverage: string, route: string, side: 'S' | 'W', until = 3.8) {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  const strong: Record<number, string> = { 1: 'go', 2: 'hitch' };
  const weak: Record<number, string> = { 1: 'go', 2: 'hitch' };
  (side === 'W' ? weak : strong)[1] = route;
  const concept: PassConcept = { id: 'lab', name: 'lab', family: 'dropback', drop: 'gun5', strong, weak, back: 'block', progression: ['S1'], beats: [] };
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: false, kind: 'pass', pass: concept, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, zoneStyle: 'match', label: 'lab', checkPick: 0 },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5,
  });
  sim.throwBall = () => undefined;
  const step = sim as unknown as { tick(): void };
  const cb = sim.slot(`CB_${side}`)!;
  const one = sim.slot(sim.offAlign.numbering[`${side}1`]!)!;
  const modes: Array<{ t: number; mode: string | null; release?: string; depth?: number }> = [];
  const samples: Array<{ t: number; oneDepth: number; cbDepth: number; separation: number }> = [];
  const at = [2.4, 3.0, 3.6];
  while (sim.phase === 'live' && sim.t < until && sim.throwAt < 0) {
    const t = sim.t;
    step.tick();
    const rule = (cb.behavior as CoverageDefender).recordedRule(t);
    const rd = rule.reads.find(r => r.target === one.idx);
    if (modes.length === 0 || modes[modes.length - 1].mode !== rule.mode)
      modes.push({ t: +t.toFixed(2), mode: rule.mode, release: rd?.release, depth: rd && +rd.depth.toFixed(2) });
    if (at.some(s => Math.abs(s - t) < 1e-6)) samples.push({ t: +t.toFixed(2), oneDepth: +(one.pos.x - sim.los).toFixed(2),
      cbDepth: +(cb.pos.x - sim.los).toFixed(2), separation: +Math.hypot(cb.pos.x - one.pos.x, cb.pos.y - one.pos.y).toFixed(2) });
  }
  const jobs = (cb.behavior as CoverageDefender).history.map(h => ({ t: +h.t.toFixed(2), job: h.job }));
  return { coverage, route, side, corner: cb.slot, one: one.slot, jobs, modes, samples };
}

const cases = [];
for (const coverage of ['cover4', 'cover3_match', 'cover4_meg'])
  for (const route of ['lab_curl7', 'lab_stop_go', 'quick_out', 'slant', 'flat'])
    for (const side of ['W', 'S'] as const) cases.push(film(coverage, route, side));
console.log(JSON.stringify(cases, null, 1));
