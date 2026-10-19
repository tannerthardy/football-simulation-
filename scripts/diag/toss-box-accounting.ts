/** Observe installed vs current second-level jobs; no extra see() or RNG calls.
 * Default: 34 constructor-only cases (zero ticks). --case=<id> runs exactly one
 * frozen case to its first carrier crossing or 4.5 seconds, whichever is first.
 * Inputs reproduce Claude run-v3 lab.ts's published look/roster definitions.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { RunBlocker, isOL } from '../../src/sim/behaviors/blocking.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import type { Agent } from '../../src/sim/agent.js';
type DefensePersonnel = Parameters<typeof pickDefense>[1];

const o = generateTeam(new Rng(31), 'pair31 O', 'pair31O', { strength: .55 });
const d = generateTeam(new Rng(32), 'pair31 D', 'pair31D', { strength: .55 });
const looks = {
  over3: ['base43', 'over', 'cover3', 'box', ''], under3: ['base43', 'under', 'cover3', 'spill', ''],
  odd3: ['base34', 'odd', 'cover3', 'spill', ''], bear1: ['goalline', 'bear', 'cover1', 'box', ''],
} as const;
type Case = { concept: string; formation: string; look: keyof typeof looks; direction: 'strong' | 'weak'; flip: boolean };
const cases: Case[] = [];
for (const formation of ['ace_12', 'i_pro_21']) for (const look of Object.keys(looks) as (keyof typeof looks)[])
  for (const concept of ['iz', 'oz', 'power', 'counter']) cases.push({ concept, formation, look, direction: 'strong', flip: false });
for (const look of ['over3', 'under3'] as const) cases.push({ concept: 'toss', formation: 'ace_12', look, direction: 'strong', flip: false });
const id = (c: Case) => `${c.concept}/${c.direction}/${c.formation}/${c.look}/pair31/77${c.flip ? '/flip' : ''}`;
function setup(c: Case): PlaySetup {
  const form = structuredClone(FORMATION_BY_ID[c.formation]);
  const [personnel, front, coverage, edge, pressure] = looks[c.look];
  const run = structuredClone(RUN_BY_ID[`${c.concept}_${c.direction}`] ?? RUN_BY_ID[c.concept]);
  run.direction = c.direction;
  return { offense: pickOffense(o, form.personnel), defense: pickDefense(d, personnel as DefensePersonnel),
    offCall: { formation: form, run, flip: c.flip, kind: 'run', label: c.concept },
    defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[coverage],
      pressure: pressure ? PRESSURE_BY_ID[pressure] : null, zoneStyle: 'match', runPolicy: { edge, linebacker: 'stack' }, label: c.look },
    los: 40, ballY: 26.67, firstDownX: 50, down: 1, seed: 77, audibles: false, hurry: false, record: false };
}
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
function plans(sim: PlaySim) {
  return sim.offense.flatMap(a => {
    if (!(a.behavior instanceof RunBlocker)) return [];
    const p = a.behavior.plan;
    return [{ blocker: a.slot, kind: p.kind, target: p.target?.slot ?? null, climb: p.climbTo?.slot ?? null,
      combo: p.combination ? { members: p.combination.members.map(b => b.slot), defender: p.combination.defender.slot,
        backer: p.combination.backer?.slot ?? null, released: p.combination.released } : null }];
  });
}
const owns = (p: ReturnType<typeof plans>[number], slot: string) => p.target === slot || p.climb === slot || p.combo?.backer === slot;
function initial(sim: PlaySim) {
  const ledger = plans(sim), bucket = (a: Agent) => a.pos.x - sim.los < 2 && Math.abs(a.pos.y - sim.ballY) < 9 ? 'down'
    : a.pos.x - sim.los < 7.5 && Math.abs(a.pos.y - sim.ballY) < 8 ? 'backer' : 'secondary';
  const defenders = sim.defense.map(a => ({ slot: a.slot, pos: { ...a.pos }, bucket: bucket(a), owners: ledger.filter(p => owns(p, a.slot)).map(p => p.blocker) }));
  const core = sim.offense.filter(a => isOL(a) || sim.offAlign.spots[a.slot]?.inline || sim.offAlign.spots[a.slot]?.backfield && a.slot === 'F').length;
  return { ledger, defenders, coreBlockers: core,
    coreThreats: defenders.filter(a => a.bucket !== 'secondary').length,
    unownedLBs: defenders.filter(a => a.slot.startsWith('LB') && !a.owners.length).map(a => a.slot) };
}
function run(c: Case) {
  const input = setup(c), sim = new PlaySim(structuredClone(input)), installed = initial(sim), changes: unknown[] = [];
  let previous = hash(installed.ledger), crossing: unknown = null;
  while (sim.phase === 'live' && sim.t < 4.5) {
    sim.tick();
    const ledger = plans(sim), h = hash(ledger);
    if (h !== previous) {
      changes.push({ t: sim.t, ledger, events: sim.events.filter(e => Math.abs(e.t - sim.t) < .051),
        lb: sim.defense.filter(a => a.slot.startsWith('LB')).map(a => ({ slot: a.slot, pos: { ...a.pos }, vel: { ...a.vel },
          engagedBy: a.engagement?.blocker.slot ?? null, owners: ledger.filter(p => owns(p, a.slot)).map(p => p.blocker) })) });
      previous = h;
    }
    const car = sim.carrier;
    if (!car || car.team !== 'O' || car === sim.qb || (car.pos.x - sim.los) * sim.attackDir('O') < 0) continue;
    crossing = { t: sim.t, carrier: car.slot, pos: { ...car.pos }, ledger,
      nearby: sim.defense.filter(a => a.slot.startsWith('LB') && !a.isDown(sim.t) && Math.hypot(a.pos.x - car.pos.x, a.pos.y - car.pos.y) <= 4)
        .map(a => ({ slot: a.slot, pos: { ...a.pos }, vel: { ...a.vel }, engagedBy: a.engagement?.blocker.slot ?? null,
          installedOwners: installed.ledger.filter(p => owns(p, a.slot)).map(p => p.blocker),
          currentOwners: ledger.filter(p => owns(p, a.slot)).map(p => p.blocker) })) };
    break;
  }
  return { id: id(c), inputHash: hash(input), input, installed, crossing, changes, t: sim.t, phase: sim.phase,
    events: sim.events, stoppingRule: 'first carrier crossing or 4.5s; no full-play yardage claim' };
}
const only = process.argv.find(a => a.startsWith('--case='))?.slice(7);
const dest = process.argv.find(a => a.startsWith('--out='))?.slice(6) ?? 'out/toss-box/accounting.json';
mkdirSync('out/toss-box', { recursive: true });
let result: unknown;
if (only) {
  const [concept, direction, formation, look] = only.split('/');
  const c: Case = { concept, direction: direction as 'strong', formation, look: look as keyof typeof looks, flip: only.endsWith('/flip') };
  result = run(c);
} else result = cases.map(c => { const input = setup(c), sim = new PlaySim(structuredClone(input)); return { id: id(c), inputHash: hash(input), ...initial(sim) }; });
writeFileSync(dest, JSON.stringify(result, null, 2) + '\n');
console.log(only ? `one bounded continuation -> ${dest}` : `34 installations, zero ticks -> ${dest}`);
