/** Assignment-only inspection. No ticks, games, movement or outcome scoring. */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATIONS } from '../../src/playbook/formations.js';
import type { RunConcept } from '../../src/playbook/types.js';
import type { Agent } from '../../src/sim/agent.js';
import { planRunBlocking, type RunBlockPlan } from '../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../src/sim/playsim.js';

const home = generateTeam(new Rng(31), 'Assignment O', 'O', { strength: .55 });
const away = generateTeam(new Rng(32), 'Assignment D', 'D', { strength: .55 });
const zones = ['iz_strong', 'oz_strong', 'wz_strong', 'duo', 'draw', 'iz_weak', 'oz_weak', 'wz_weak', 'toss'];
const gaps = ['power', 'counter', 'trap'];
const looks = [
  ['over', 'nickel', 'cover0', 'zero_6'], ['wide9', 'nickel', 'cover1', null],
  ['under', 'base43', 'cover1_off', null], ['tite', 'base34', 'cover4', null],
  ['odd', 'base34', 'cover3', null], ['bear', 'goalline', 'cover0', null],
] as const;

function summarize(sim: PlaySim, plans: Map<Agent, RunBlockPlan>) {
  const core = [...plans].filter(([, p]) => p.kind !== 'stalk');
  const owners = new Map<Agent, string[]>();
  const own = (d: Agent | null | undefined, role: string) => {
    if (d) owners.set(d, [...(owners.get(d) ?? []), role]);
  };
  for (const [a, p] of core) {
    own(p.target, `${a.slot}:${p.kind}`);
    own(p.climbTo, `${a.slot}:climbTo`);
    if (p.combination) own(p.combination.backer, `combo(${p.combination.members.map(x => x.slot).join('+')}):backer`);
  }
  const stalks = [...plans].filter(([, p]) => p.kind === 'stalk');
  const stalkOwned = new Set(stalks.map(([, p]) => p.target));
  const shallowFree = sim.defense.filter(d => d.pos.x - sim.los < 2 && Math.abs(d.pos.y - sim.ballY) < 9 && !owners.has(d));
  const assignments = [...plans].map(([a, p]) => ({ blocker: a.slot, kind: p.kind, target: p.target?.slot ?? null,
    position: [a.pos.x, a.pos.y], targetPosition: p.target ? [p.target.pos.x, p.target.pos.y] : null,
    distance: p.target ? Math.hypot(a.pos.x - p.target.pos.x, a.pos.y - p.target.pos.y) : null,
    climbTo: p.climbTo?.slot ?? null, pullRole: p.pullRole ?? null, drive: p.drive,
    combination: p.combination ? { members: p.combination.members.map(x => x.slot),
      defender: p.combination.defender.slot, backer: p.combination.backer?.slot ?? null } : null }));
  const missedNearby = stalks.flatMap(([a, p]) => shallowFree.filter(d => !stalkOwned.has(d)
    && (!p.target || Math.hypot(a.pos.x - d.pos.x, a.pos.y - d.pos.y) < Math.hypot(a.pos.x - p.target.pos.x, a.pos.y - p.target.pos.y)))
    .map(d => ({ blocker: a.slot, chosen: p.target?.slot ?? null, omitted: d.slot,
      distance: Math.hypot(a.pos.x - d.pos.x, a.pos.y - d.pos.y) })));
  const crossings = stalks.flatMap(([a, p], i) => stalks.slice(i + 1).filter(([b, q]) => p.target && q.target
    && (a.pos.y - b.pos.y) * (p.target.pos.y - q.target.pos.y) < 0)
    .map(([b, q]) => ({ a: a.slot, targetA: p.target!.slot, b: b.slot, targetB: q.target!.slot })));
  return { assignments, unownedShallow: shallowFree.map(d => ({ defender: d.slot, position: [d.pos.x, d.pos.y],
    stalkOwner: stalks.find(([, p]) => p.target === d)?.[0].slot ?? null })), missedNearby, crossings,
    coreReservations: [...owners].map(([d, o]) => ({ defender: d.slot, owners: [...new Set(o)] })) };
}

const rows: unknown[] = [];
for (const [i, formation] of FORMATIONS.entries()) for (const variant of [0, 1]) for (const flip of [false, true]) {
  const look = looks[(i + variant * 3) % looks.length];
  let run: RunConcept = RUN_BY_ID[variant ? gaps[i % gaps.length] : zones[i % zones.length]];
  if (!variant && ['gun_wing_12', 'heavy_13', 'offset_i_21'].includes(formation.id)) run = RUN_BY_ID.split_zone;
  // Empty has no RB exchange: inspect an explicitly installed QB draw instead.
  if (formation.tags.includes('empty')) run = { ...RUN_BY_ID.draw, id: 'qb_draw_control', scheme: 'qbDraw' };
  const sim = new PlaySim({ offense: pickOffense(home, formation.personnel), defense: pickDefense(away, look[1]),
    offCall: { formation, flip, kind: 'run', run, label: run.id },
    defCall: { personnel: look[1], front: FRONT_BY_ID[look[0]], coverage: COVERAGE_BY_ID[look[2]],
      pressure: look[3] ? PRESSURE_BY_ID[look[3]] : null, label: look[0] },
    los: 40, ballY: 26.67, firstDownX: 50, seed: 3, audibles: false });
  rows.push({ id: `${formation.id}/${run.id}/${look[0]}/${look[2]}/${flip}`, formation: formation.id,
    run: run.id, front: look[0], coverage: look[2], flip, ...summarize(sim, planRunBlocking(sim, run)) });
}

const saved = JSON.parse(readFileSync(new URL('../../test/fixtures/receiver-run-assignment-g1-p018.json', import.meta.url), 'utf8'));
for (const mirror of [false, true]) {
  const formation = FORMATIONS.find(f => f.id === saved.formation)!;
  const sim = new PlaySim({ offense: pickOffense(home, formation.personnel), defense: pickDefense(away, 'nickel'),
    offCall: { formation, flip: mirror ? !saved.installationFlip : saved.installationFlip, kind: 'run', run: RUN_BY_ID[saved.run], label: saved.run },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover0,
      pressure: PRESSURE_BY_ID.zero_6, label: 'saved geometry' },
    los: saved.los, ballY: saved.ballY, firstDownX: 55, seed: 3, audibles: false });
  for (const a of sim.agents) {
    const [x, y] = saved.positions[a.slot];
    a.body.pos = { x, y: mirror ? 2 * saved.ballY - y : y };
  }
  rows.push({ id: `G1-P018-rounded/${mirror}`, savedGeometry: true, mirror, ...summarize(sim, planRunBlocking(sim, RUN_BY_ID[saved.run])) });
}
const path = process.argv[2] ?? 'out/receiver-run-assignments/panel.json';
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, JSON.stringify({ schema: 'receiver-assignment-panel-v1', cases: rows.length, engineTicks: 0,
  note: 'Distance/crossing screens are review leads, not achieved-motion or outcome claims.', rows }, null, 2) + '\n');
console.log(`Wrote ${rows.length} assignment-only cases, zero engine ticks: ${path}`);
