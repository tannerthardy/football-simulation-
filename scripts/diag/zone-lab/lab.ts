/** Zone lab: run IZ/OZ/WZ (both directions) on the run-action suite's exact
 * looks and rosters, record per-play outcome and 10 Hz film (positions,
 * engagements, blocker targets). Observation only.
 *
 * node --import tsx scripts/diag/zone-lab/lab.ts --out out/zone-lab/base.jsonl.gz
 *   [--concepts iz,oz,wz] [--dirs strong,weak] [--looks over3,...] [--rosters pair11,pair31]
 *   [--seeds 77,71001] [--formations ace_12] [--shard i/n] [--film]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { DefensivePlayCall, OffensivePlayCall } from '../../../src/playbook/types.js';
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import type { ReplayLevel } from '../../../src/sim/types.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
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

export function makeSim(c: LabCase, R = rosters(), record = false, recordLevel?: ReplayLevel): PlaySim {
  const formation = structuredClone(FORMATION_BY_ID[c.formation]);
  const run = structuredClone(RUN_BY_ID[`${CONCEPT[c.concept] ?? c.concept}_${c.dir}`] ?? RUN_BY_ID[c.concept]);
  run.direction = c.dir;
  const offCall: OffensivePlayCall = { formation, flip: false, kind: 'run', run, label: c.concept };
  const defCall = look(c.look), r = R[c.roster];
  return new PlaySim({ offense: structuredClone(r.offense[formation.personnel]), defense: structuredClone(r.defense[defCall.personnel]),
    offCall, defCall, los: 40, ballY: 26.67, firstDownX: 50, down: 1, seed: c.seed, audibles: false, hurry: false, record,
    ...(recordLevel ? { recordLevel } : {}) });
}

const r2 = (x: number) => Math.round(x * 100) / 100;
export function runCase(c: LabCase, R = rosters(), film = false, until = 20) {
  const sim = makeSim(c, R);
  const dir = sim.attackDir('O');
  const blockers = sim.offense.filter(a => a.behavior instanceof RunBlocker);
  const plan0 = Object.fromEntries(blockers.map(a => { const p = (a.behavior as RunBlocker).plan;
    return [a.slot, { kind: p.kind, target: p.target?.slot ?? null, climb: p.climbTo?.slot ?? null,
      combo: p.combination ? { members: p.combination.members.map(b => b.slot), defender: p.combination.defender.slot, backer: p.combination.backer?.slot ?? null } : null }]; }));
  const frames: any[] = [];
  const snapPos = sim.agents.map(a => [r2(a.pos.x), r2(a.pos.y)]);
  let tick = 0;
  const loadFirst: Record<string, number> = {};
  while (sim.phase === 'live' && sim.t < until) {
    sim.tick(); tick++;
    for (const e of sim.engagements) {
      const k = e.blocker.slot + '>' + e.defender.slot;
      const f = Math.hypot(e.hands?.normalForce ?? 0, e.hands?.tangentForce ?? 0);
      if (f > 1e-6 && loadFirst[k] === undefined) loadFirst[k] = r2(sim.t);
    }
    if (film && tick % 2 === 0) frames.push({ t: r2(sim.t),
      p: sim.agents.map(a => [r2(a.pos.x), r2(a.pos.y), Math.round(a.facing * 100) / 100, a.body.support?.state === 'up' ? 0 : 1]),
      c: sim.carrier?.idx ?? -1,
      e: sim.engagements.map(e => [e.blocker.idx, e.defender.idx, r2(e.win), e.helpers.map(h => h.idx)]),
      tg: blockers.map(a => [a.idx, (a.behavior as any).plan?.target?.idx ?? -1, (a.behavior as any).plan?.kind ?? a.behavior.kind]) });
  }
  const res = sim.buildResult();
  const first = sim.events.find(e => e.type === 'carrier_contact');
  const tackle = sim.events.find(e => e.type === 'tackle');
  const rb = sim.slot('RB')!;
  return {
    id: caseId(c), ...c, terminal: sim.phase !== 'live', outcome: res.outcome, gain: r2(res.offenseYards), t: r2(sim.t),
    handoff: sim.handoffAt >= 0 ? r2(sim.handoffAt) : null,
    firstContact: first ? { t: first.t, by: first.b !== undefined ? sim.agents[first.b].slot : null,
      x: first.pos ? r2((first.pos.x - sim.los) * dir) : null, y: first.pos ? r2(first.pos.y - sim.ballY) : null } : null,
    contactGain: sim.firstContactX === null ? null : r2((sim.firstContactX - sim.los) * dir),
    tackler: tackle?.a !== undefined ? sim.agents[tackle.a].slot : null,
    plan0, loadFirst, ps: (c.dir === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign), adir: dir,
    slots: sim.agents.map(a => a.slot), team: sim.agents.map(a => a.team), rbIdx: rb.idx, los: sim.los, ballY: sim.ballY,
    snapPos, frames: film ? frames : undefined,
  };
}

async function main() {
  const out = arg('--out', 'out/zone-lab/base.jsonl.gz');
  const [si, sn] = arg('--shard', '0/1').split('/').map(Number);
  const film = process.argv.includes('--film');
  const R = rosters();
  const cases: LabCase[] = [];
  for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
    for (const dir of list('--dirs', 'strong,weak') as Array<'strong' | 'weak'>) for (const lk of list('--looks', LOOK_SPECS.map(l => l[0]).join(',')))
      for (const roster of list('--rosters', 'pair11,pair31')) for (const seed of list('--seeds', '77,71001').map(Number))
        cases.push({ concept, dir, look: lk, roster, seed, formation });
  const mine = cases.filter((_, i) => i % sn === si);
  const rows: string[] = [];
  const t0 = performance.now();
  for (const c of mine) {
    try { rows.push(JSON.stringify(runCase(c, R, film))); }
    catch (e) { rows.push(JSON.stringify({ id: caseId(c), ...c, error: String(e) })); }
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, gzipSync(rows.join('\n') + '\n'));
  console.log(`${mine.length} plays in ${((performance.now() - t0) / 1000).toFixed(1)} s -> ${out}`);
}
if (process.argv[1]?.endsWith('lab.ts')) await main();
