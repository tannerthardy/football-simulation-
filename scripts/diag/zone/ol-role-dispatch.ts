/** Inspect existing controller dispatch without constructing or stepping World.
 * Role substitutions are synthetic controls, never native matchup results. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Intent } from '../../../src/physics/world.js';
import type { MoveCommand } from '../../../src/physics/kinematics.js';
import type { Agent } from '../../../src/sim/agent.js';
import { RunBlocker, type RunBlockKind, type RunBlockPlan } from '../../../src/sim/behaviors/blocking.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

type DiagnosticMethods = {
  withBase(a: Agent, command: MoveCommand): Intent;
  zoneEligible(a: Agent, sim: PlaySim): boolean;
};
const command: MoveCommand = { vel: { x: 1, y: -2 }, facing: -.5 };
const cases: Array<{ slot: string; kind: RunBlockKind; combination?: boolean }> = [
  { slot: 'RT', kind: 'reach' },
  { slot: 'Y', kind: 'reach' },
  { slot: 'H', kind: 'reach' },
  { slot: 'X', kind: 'drive' },
  { slot: 'RT', kind: 'climb' },
  { slot: 'Y', kind: 'climb' },
  { slot: 'RT', kind: 'pull' },
  { slot: 'RT', kind: 'reach', combination: true },
  { slot: 'Y', kind: 'reach', combination: true },
];
const original = JSON.stringify(command);
const rows = cases.map(c => {
  const plan = { kind: c.kind, target: null, drive: { x: 1, y: -1 },
    ...(c.combination ? { combination: { released: false } } : {}) } as RunBlockPlan;
  const behavior = new RunBlocker(plan) as unknown as DiagnosticMethods;
  // These two dispatch functions consume only slot, engagement, plan kind,
  // combination status and World joint identity. No body or perception is read.
  const actor = { slot: c.slot, engagement: null } as unknown as Agent;
  const sim = { offCall: { run: { scheme: 'wideZone' } }, world: { joints: [] } } as unknown as PlaySim;
  const result = behavior.withBase(actor, command);
  if (JSON.stringify(command) !== original || JSON.stringify(result.vel) !== JSON.stringify(command.vel)
    || result.facing !== command.facing) throw new Error('Dispatch observation changed the movement request');
  return { ...c, postureRequest: result.posture ?? null,
    adaptiveSoloReachEligible: behavior.zoneEligible(actor, sim),
    movementRequestUnchanged: true };
});
const files = ['src/sim/behaviors/blocking.ts', 'src/sim/playsim.ts', 'src/physics/world.ts',
  'test/run-base.test.ts'];
const sourceHashes = Object.fromEntries(files.map(path => [path,
  createHash('sha256').update(readFileSync(path)).digest('hex')]));
const worldSource = readFileSync('src/physics/world.ts', 'utf8');
const defaultMatch = worldSource.match(/const DEFAULT_POSTURE = ([0-9.]+);/);
if (!defaultMatch) throw new Error('Missing World default posture declaration; review measurement');
const output = {
  protocol: 'ol-role-dispatch-v1',
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  productionAuditPin: 'a1b16e666a9ee7d1bc1d2aecba141fc535863b24',
  historicalComparisonPin: '4ded6b600fd3785e65034aa5623d7a9f8f3c5db1',
  node: process.version, sourceHashes, worldDefaultPostureTarget: Number(defaultMatch[1]),
  inputMovement: command, rows, worldTicks: 0, newPlays: 0,
  scope: 'Current controller dispatch only. Synthetic role controls isolate a slot gate; no body, capability, roster, policy, perception, contact or native outcome is changed.',
  conclusions: [
    'Attached TE first-level reach has no explicit approach posture request; World supplies its existing default with finite posture adjustment.',
    'Solo OL reach is eligible for adaptive reach/runoff; an unreleased combination and TE reach are excluded.',
    'WR drive and second-level/pulling approaches retain their existing no-override contracts.',
    'These omissions do not establish a football rescue or calibrate an appropriate TE posture. Controller candidate remains gated on contact review.',
  ],
};
const destination = process.argv[2] ?? 'out/ol-technique/role-dispatch.json';
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, JSON.stringify(output, null, 2) + '\n');
process.stdout.write(JSON.stringify({ saved: destination, rows: rows.length, worldTicks: 0 }) + '\n');
