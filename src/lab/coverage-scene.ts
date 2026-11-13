/**
 * A fixed coverage scene for rule work: one formation, scripted routes by
 * receiver number, one coverage call, the quarterback holding the ball. It
 * films what each coverage defender is doing (his job history, his rule's
 * locked mode) and where he is relative to the receivers at fixed times.
 * No outcome is scored; the question is who took whom, when.
 */
import { CENTER_Y } from '../core/field.js';
import { Rng } from '../core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../league/team.js';
import { COVERAGE_BY_ID } from '../playbook/coverages.js';
import { FRONT_BY_ID } from '../playbook/defense.js';
import { FORMATION_BY_ID } from '../playbook/formations.js';
import { ROUTES } from '../playbook/routes.js';
import type { DefensivePlayCall, DefPersonnelId, MotionCall, PassConcept, RouteDef } from '../playbook/types.js';
import { CoverageDefender } from '../sim/coverage/defender.js';
import { PlaySim } from '../sim/playsim.js';

/** Lab routes, not installed in any concept. */
export const LAB_ROUTES: Record<string, RouteDef> = {
  lab_curl7: { id: 'lab_curl7', family: 'intermediate', depth: 7, end: 'settle', points: [{ d: 7, l: 0, s: 0.2 }, { d: 6.5, l: -1, s: 0 }] },
  // The stop is a one-yard settle at the same depth: the route controller
  // skips a waypoint that lies behind the receiver on the way to the next.
  lab_stop_go: { id: 'lab_stop_go', family: 'deep', depth: 20, end: 'continue', points: [{ d: 6.5, l: 0, s: 0.1 }, { d: 6.5, l: 1, s: 0 }, { d: 50, l: 1.5 }] },
  /** Vertical stem, then flatten to the sideline at 12: a deep out. */
  /** A hitch that never clears the no-cover zone. */
  lab_hitch4: { id: 'lab_hitch4', family: 'quick', depth: 4, end: 'settle', points: [{ d: 4.5, l: 0, s: 0.2 }, { d: 4, l: 0.3, s: 0 }] },
  /** A square in at 9, inside a curl player's seam handoff. */
  lab_in9: { id: 'lab_in9', family: 'intermediate', depth: 9, end: 'continue', points: [{ d: 9, l: 0, s: 0.4 }, { d: 9.5, l: -16 }] },
  /** A 4-yard out that turns up the sideline: shows "In/Under" bait, then runs upfield. */
  lab_out_up4: { id: 'lab_out_up4', family: 'deep', depth: 20, end: 'continue', points: [{ d: 3, l: 0, s: 0.5 }, { d: 3, l: 3.5, s: 0.5 }, { d: 45, l: 4.5 }] },
  lab_out12: { id: 'lab_out12', family: 'intermediate', depth: 12, end: 'continue', points: [{ d: 12, l: 0, s: 0.4 }, { d: 11.5, l: 12, s: 0.9 }] },
};
Object.assign(ROUTES, LAB_ROUTES);

export interface SceneOptions {
  formation: string;
  coverage: string;
  /** Routes by receiver number to each side; anything unnamed runs a hitch. */
  strong?: Partial<Record<1 | 2 | 3 | 4, string>>;
  weak?: Partial<Record<1 | 2 | 3 | 4, string>>;
  /** Back assignment (route id, 'block'). */
  back?: string;
  personnel?: DefPersonnelId;
  /** Film until this time (s). */
  until?: number;
  seed?: number;
  flip?: boolean;
  ballY?: number;
  /** Extra call fields (shown look, check preference, pressure...). */
  call?: Partial<DefensivePlayCall>;
  /** Sample defender/receiver positions at these times (s). */
  sampleAt?: number[];
  /** Pre-snap motion (played only with MOTION=1). */
  motion?: MotionCall;
}

export interface DefenderFilm {
  slot: string;
  rule: string | null;
  /** Job history, `job@t`. */
  jobs: string[];
  /** Rule-mode transitions, `mode@t`. */
  modes: string[];
}

export interface SceneFilm {
  formation: string;
  called: string;
  played: string;
  /** Offensive slot of each receiver number (S1, W2, B...). */
  numbering: Record<string, string>;
  defenders: Record<string, DefenderFilm>;
  samples: Array<{ t: number; pos: Record<string, { x: number; y: number }> }>;
}

const offenseTeam = generateTeam(new Rng(21), 'Offense', 'OFF', { strength: 0.6 });
const defenseTeam = generateTeam(new Rng(22), 'Defense', 'DEF', { strength: 0.6 });

/** Build the scene's simulation without running it. */
export function sceneSim(o: SceneOptions): PlaySim {
  const formation = FORMATION_BY_ID[o.formation];
  if (!formation) throw new Error(`Unknown formation ${o.formation}`);
  const coverage = COVERAGE_BY_ID[o.coverage];
  if (!coverage) throw new Error(`Unknown coverage ${o.coverage}`);
  const fill = (r: Partial<Record<1 | 2 | 3 | 4, string>> = {}) => ({ 1: 'hitch', 2: 'hitch', 3: 'hitch', 4: 'hitch', ...r });
  const concept: PassConcept = { id: 'lab', name: 'lab', family: 'dropback', drop: 'gun5', strong: fill(o.strong), weak: fill(o.weak),
    back: o.back ?? 'block', progression: ['S1'], beats: [] };
  const personnel = o.personnel ?? 'nickel';
  const sim = new PlaySim({
    offense: pickOffense(offenseTeam, formation.personnel), defense: pickDefense(defenseTeam, personnel),
    offCall: { formation, flip: o.flip ?? false, kind: 'pass', pass: concept, label: 'lab', motion: o.motion },
    defCall: { personnel, front: FRONT_BY_ID.over, coverage, pressure: null, zoneStyle: 'match', label: 'lab', checkPick: 0, ...o.call },
    los: 40, ballY: o.ballY ?? CENTER_Y, firstDownX: 50, seed: o.seed ?? 5,
  });
  // The question is who takes whom as routes declare: the ball stays held.
  sim.throwBall = () => undefined;
  return sim;
}

/** Run a scene and film every coverage defender. */
export function filmScene(o: SceneOptions): SceneFilm & { sim: PlaySim } {
  const sim = sceneSim(o);
  const step = sim as unknown as { tick(): void };
  const until = o.until ?? 3.2;
  const sampleAt = o.sampleAt ?? [];
  const modes = new Map<string, string[]>();
  const samples: SceneFilm['samples'] = [];
  while (sim.phase === 'live' && sim.t < until && sim.throwAt < 0) {
    const t = sim.t;
    step.tick();
    for (const d of sim.defense) {
      const b = d.behavior;
      if (!(b instanceof CoverageDefender)) continue;
      const mode = b.recordedRule(t).mode ?? '-';
      const list = modes.get(d.slot) ?? [];
      if (list.length === 0 || !list[list.length - 1].startsWith(`${mode}@`)) list.push(`${mode}@${t.toFixed(2)}`);
      modes.set(d.slot, list);
    }
    if (sampleAt.some(s => Math.abs(s - t) < 1e-6))
      samples.push({ t: +t.toFixed(2), pos: Object.fromEntries(sim.agents.filter(a => a.slot !== 'QB' && !['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot))
        .map(a => [a.slot, { x: +(a.pos.x - sim.los).toFixed(2), y: +(a.pos.y - sim.ballY).toFixed(2) }])) });
  }
  const defenders: Record<string, DefenderFilm> = {};
  for (const d of sim.defense) {
    const b = d.behavior;
    if (b instanceof CoverageDefender) defenders[d.slot] = { slot: d.slot, rule: b.rule, jobs: b.history.map(h => `${h.job}@${h.t.toFixed(2)}`), modes: modes.get(d.slot) ?? [] };
    else defenders[d.slot] = { slot: d.slot, rule: null, jobs: [b.kind === 'man' ? `man:${(b as { target?: { slot: string } }).target?.slot ?? '?'}` : b.kind], modes: [] };
  }
  return { sim, formation: o.formation, called: o.coverage, played: sim.defCall.coverage.id,
    numbering: Object.fromEntries(Object.entries(sim.offAlign.numbering).filter(([, v]) => v)) as Record<string, string>, defenders, samples };
}

/** Jobs only (no times), for assertions. */
export const jobsOf = (f: SceneFilm, slot: string): string[] => (f.defenders[slot]?.jobs ?? []).map(j => j.split('@')[0]);
/** Final locked rule mode. */
export const modeOf = (f: SceneFilm, slot: string): string => (f.defenders[slot]?.modes.at(-1) ?? '-@0').split('@')[0];
