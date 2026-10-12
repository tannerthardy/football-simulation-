/** Replay the frozen World input without football reads or capacity edits.
 * A full 22-body replay checks whether omitted solver history matters; the
 * selected solo pair is a reduced mechanical experiment, not a native play. */
import { readFileSync, writeFileSync } from 'node:fs';
import { World, type HandJoint } from '../../../src/physics/world.js';
import type { Body } from '../../../src/physics/kinematics.js';
const path = process.argv[2];
const saved = JSON.parse(readFileSync(path, 'utf8'));
const bodies: Body[] = structuredClone(saved.bodies);
const world = new World(bodies, { handContact: saved.handContact });
world.time = saved.t;
world.joints = saved.joints.map((entry: Record<string, unknown>) => {
  const joint = { ...entry };
  for (const key of ['a', 'b', 'actor', 'holder']) if (typeof joint[key] === 'number') {
    const index = joint[key] as number;
    if (index < 0) delete joint[key]; else joint[key] = bodies[index];
  }
  return joint;
}) as HandJoint[];
for (const p of saved.pending ?? []) world.strike(bodies[p.a], bodies[p.b], { x: p.x, y: p.y }, p.height);
const report = world.step(saved.intents, saved.dt);
const maxDifference = Math.max(...bodies.flatMap((b, i) => [
  Math.abs(b.pos.x - saved.after[i].pos.x), Math.abs(b.pos.y - saved.after[i].pos.y),
  Math.abs(b.vel.x - saved.after[i].vel.x), Math.abs(b.vel.y - saved.after[i].vel.y),
  Math.abs(b.facing - saved.after[i].facing), Math.abs((b.spin ?? 0) - saved.after[i].spin)]));
const selected = (process.argv[3] ?? 'RG,DT_S').split(',').map(slot => saved.players.find((p: { slot: string }) => p.slot === slot).id);
const pair = selected.map(i => structuredClone(saved.bodies[i])) as Body[];
const reduced = new World(pair, { handContact: saved.handContact });
reduced.time = saved.t;
const hands = saved.joints.filter((j: { a: number; b: number; kind: string }) => j.kind === 'hands'
  && selected.includes(j.a) && selected.includes(j.b));
if (!hands.length) throw new Error('Selected group has no native hands');
const restored: HandJoint[] = hands.map((h: Record<string, any>) => {
  const hand: HandJoint = { ...h, kind: 'hands', a: pair[selected.indexOf(h.a)], b: pair[selected.indexOf(h.b)],
    extension: h.extension, push: h.push, hold: h.hold, steer: h.steer };
  for (const key of ['actor', 'holder'] as const) {
    if (selected.includes(h[key])) hand[key] = pair[selected.indexOf(h[key])]; else delete hand[key];
  }
  return hand;
});
reduced.joints = restored;
const pairReport = reduced.step(selected.map(i => saved.intents[i]), saved.dt);
const result = { t: saved.t, nativeFullStepMaxDifference: maxDifference,
  nativeSubsteps: saved.report.substeps, replaySubsteps: report.substeps,
  slots: selected.map(i => saved.players[i].slot), before: selected.map(i => saved.bodies[i]),
  requested: selected.map(i => saved.intents[i]), afterNative: selected.map(i => saved.after[i]),
  afterPair: pair, nativeHands: hands, pairHands: restored.map(h => ({ normal: h.normalForce, tangent: h.tangentForce })),
  reducedContacts: pairReport.contacts, reducedFalls: pairReport.falls,
  residual: report.work.residual, pairResidual: pairReport.work.residual,
  limits: 'One frozen 0.05-s input, unchanged bodies/capacities. Pair omits teammates and later control; not a football or capacity certificate.' };
writeFileSync(`${path}.replay.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ nativeFullStepMaxDifference: maxDifference, substeps: report.substeps,
  pairVy: pair.map(b => b.vel.y), reducedFalls: pairReport.falls,
  residual: report.work.residual, pairResidual: pairReport.work.residual }));
