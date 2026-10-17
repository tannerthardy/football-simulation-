/** Exact case factory extracted unchanged from Claude50f6a08. No batch runner. */
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { DefensivePlayCall, OffensivePlayCall } from '../../../src/playbook/types.js';
import { PlaySim } from '../../../src/sim/playsim.js';

export const LOOK_SPECS = [
  ['over3', 'base43', 'over', 'cover3', 'box', ''], ['under3', 'base43', 'under', 'cover3', 'spill', ''],
  ['wide9', 'nickel', 'wide9', 'cover3', 'spill', ''], ['tite4', 'base34', 'tite', 'cover4', 'box', ''],
  ['odd3', 'base34', 'odd', 'cover3', 'spill', ''], ['bear1', 'goalline', 'bear', 'cover1', 'box', ''],
  ['over2', 'base43', 'over', 'cover2', 'box', ''], ['over4', 'base43', 'over', 'cover4', 'box', ''],
  ['off1', 'base43', 'over', 'cover1_off', 'box', ''], ['mike1', 'base43', 'over', 'cover1', 'box', 'mike_a'],
] as const;
const CONCEPT: Record<string, string> = { iz: 'iz', oz: 'oz', wz: 'wz' };

export function rosters() {
  const out: Record<string, { offense: Record<string, any>; defense: Record<string, any> }> = {};
  for (const [id, os, ds] of [['pair11', 11, 12], ['pair31', 31, 32]] as const) {
    const o = generateTeam(new Rng(os), id + ' O', id + 'O', { strength: .55 });
    const d = generateTeam(new Rng(ds), id + ' D', id + 'D', { strength: .55 });
    out[id] = { offense: Object.fromEntries(['11', '12', '13', '21'].map(p => [p, pickOffense(o, p as '11')])),
      defense: Object.fromEntries(['base43', 'base34', 'nickel', 'goalline'].map(p => [p, pickDefense(d, p as 'base43')])) };
  }
  return out;
}
export function look(id: string): DefensivePlayCall {
  const s = LOOK_SPECS.find(l => l[0] === id)!;
  const [, personnel, front, coverage, edge, pressure] = s;
  return { personnel: personnel as any, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[coverage],
    pressure: pressure ? PRESSURE_BY_ID[pressure] : null, zoneStyle: 'match', runPolicy: { edge, linebacker: 'stack' }, label: id };
}
export interface LabCase { concept: string; dir: 'strong' | 'weak'; look: string; roster: string; seed: number; formation: string }
export const caseId = (c: LabCase) => [c.concept, c.dir, c.formation, c.look, c.roster, c.seed].join('/');

export function makeSim(c: LabCase, R = rosters(), record = false): PlaySim {
  const formation = structuredClone(FORMATION_BY_ID[c.formation]);
  const run = structuredClone(RUN_BY_ID[`${CONCEPT[c.concept] ?? c.concept}_${c.dir}`] ?? RUN_BY_ID[c.concept]);
  run.direction = c.dir;
  const offCall: OffensivePlayCall = { formation, flip: false, kind: 'run', run, label: c.concept };
  const defCall = look(c.look), r = R[c.roster];
  return new PlaySim({ offense: structuredClone(r.offense[formation.personnel]), defense: structuredClone(r.defense[defCall.personnel]),
    offCall, defCall, los: 40, ballY: 26.67, firstDownX: 50, down: 1, seed: c.seed, audibles: false, hurry: false, record });
}
