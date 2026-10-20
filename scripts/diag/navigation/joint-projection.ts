/** Staged two-neighbor command projection, using a saved real RT body/profile.
 * No native football outcome or recurrence is claimed. Both physical arms have
 * identical initial bodies and hold their complete requests for 0.6 seconds.
 * Peer pictures are explicit acquired inputs; live peer getters must not run.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enduranceFactor, fatigueFactor, followAccel, type Body } from '../../../src/physics/kinematics.js';
import { availability, newSupport, supportParams } from '../../../src/physics/support.js';
import { World, type Intent } from '../../../src/physics/world.js';
import type { Agent } from '../../../src/sim/agent.js';
import { movementObjective, withMovementObjective } from '../../../src/sim/movement-objective.js';
import type { Perceived } from '../../../src/sim/perception.js';
import { spaceTeammates } from '../../../src/sim/spacing.js';
import { sourceVersion } from '../../source-version.js';

type Kind = 'ordinary' | 'clear' | 'loaded' | 'obstruction';
interface Peer { idx: number; body: Body; seen: Perceived }
interface Limit { nx: number; ny: number; speed: number }
const fixturePath = new URL('../../../test/fixtures/joint-spacing.json', import.meta.url);

export function projectionScene(kind: Kind = 'ordinary') {
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))[0];
  const body: Body = structuredClone(fixture.body);
  // The saved JSON uses null for the upright body's -Infinity support time.
  if (body.support?.since === null) body.support.since = -Infinity;
  const raw: Intent = withMovementObjective({ ...fixture.raw, vel: { x: 2, y: 2 } },
    { kind: 'fixed', point: { x: body.pos.x + 6, y: body.pos.y + 6 } });
  const vectors = [{ x: 1, y: 0 }, { x: .5, y: Math.sqrt(3) / 2 }];
  const peers: Peer[] = vectors.map((normal, i) => {
    const distance = .9 * (body.profile.radius + body.profile.radius) + .02;
    const peer: Body = { pos: { x: body.pos.x + normal.x * distance, y: body.pos.y + normal.y * distance },
      vel: { x: i * normal.x, y: i * normal.y }, facing: i ? Math.PI / 3 : 0,
      energy: 1, profile: structuredClone(body.profile), support: newSupport() };
    return { idx: i + 1, body: peer, seen: { pos: { ...peer.pos }, vel: { ...peer.vel },
      facing: peer.facing, stance: null, age: 0, pose: 'up', carrying: false } };
  });
  if (kind === 'clear') for (const peer of peers) {
    peer.body.pos.x += 20; peer.seen.pos.x += 20;
  }
  if (kind === 'obstruction') {
    body.vel = { x: 4, y: 0 }; body.facing = 0;
    raw.vel = { x: 4, y: 0 };
    peers.splice(1);
    // An explicitly staged incoming runner, too close to remove momentum.
    return { kind, body, raw: withMovementObjective(raw,
      { kind: 'fixed', point: { x: body.pos.x + 6, y: body.pos.y } }), peers };
  }
  return { kind, body, raw, peers };
}

/** Derive only the two declared radial half-planes. This is an independent
 * algebraic oracle for a two-active-boundary projection, not a crowd planner.
 */
export function projectionOracle(scene: ReturnType<typeof projectionScene>) {
  const { body, raw, peers } = scene;
  const capacity = availability(body.support!, supportParams(body.profile), fatigueFactor(body.energy));
  const limits: Limit[] = peers.map(peer => {
    const dx = peer.seen.pos.x - body.pos.x, dy = peer.seen.pos.y - body.pos.y;
    const distance = Math.hypot(dx, dy), nx = dx / distance, ny = dy / distance;
    const gap = distance - .9 * (body.profile.radius + peer.body.profile.radius);
    const brake = followAccel(body, { x: -nx * 1e3, y: -ny * 1e3 }, raw.cutSkill ?? 1, capacity);
    const decel = Math.max(.1, -brake.x * nx - brake.y * ny);
    const allowed = Math.sqrt((decel * .3) ** 2 + 2 * decel * Math.max(0, gap)) - decel * .3;
    return { nx, ny, speed: allowed + peer.seen.vel.x * nx + peer.seen.vel.y * ny };
  });
  let ordinary = { ...raw.vel };
  for (const limit of limits) {
    const excess = ordinary.x * limit.nx + ordinary.y * limit.ny - limit.speed;
    if (excess > 0) ordinary = { x: ordinary.x - limit.nx * excess, y: ordinary.y - limit.ny * excess };
  }
  const cap = body.profile.vmax * fatigueFactor(body.energy) * enduranceFactor(body) * (1 - .08 * (body.squeeze ?? 0));
  const scale = Math.min(1, cap / Math.max(1e-9, Math.hypot(ordinary.x, ordinary.y)));
  ordinary = { x: ordinary.x * scale, y: ordinary.y * scale };
  const closest = scene.kind === 'clear' ? {...raw.vel} : limits.length === 2 ? {
    x: limits[0].speed,
    y: (limits[1].speed - limits[1].nx * limits[0].speed) / limits[1].ny,
  } : ordinary;
  return { limits, ordinary, closest, cap };
}

export function selectProjection(scene: ReturnType<typeof projectionScene>) {
  const body = structuredClone(scene.body), before = structuredClone(body);
  const picturesBefore = structuredClone(scene.peers.map(peer => peer.seen));
  const a = { idx: 0, team: 'O', behavior: { kind: 'run-block' }, body, profile: body.profile,
    get pos() { return body.pos; }, get vel() { return body.vel; },
    get speedScale() { return fatigueFactor(body.energy) * enduranceFactor(body) * (1 - .08 * (body.squeeze ?? 0)); },
    isDown() { return false; } } as unknown as Agent;
  const peers = scene.peers.map(peer => ({ idx: peer.idx, team: 'O', profile: peer.body.profile,
    get pos() { throw Error('Private peer position'); }, get vel() { throw Error('Private peer velocity'); },
    get body() { throw Error('Private peer body'); }, get engagement() { throw Error('Private peer engagement'); } } as unknown as Agent));
  const commands: Intent[] = [scene.raw, ...peers.map(() => ({ vel: { x: 0, y: 0 }, free: true }))];
  let reads = 0;
  spaceTeammates([a, ...peers], commands, (_a, peer) => {
    reads++; return scene.peers.find(p => p.idx === peer.idx)!.seen;
  }, { now: 1.25, constrained: scene.kind === 'loaded' ? new Set([body]) : undefined });
  return { command: commands[0], goal: movementObjective(commands[0]), reads,
    ownUnchanged: JSON.stringify(body) === JSON.stringify(before),
    picturesUnchanged: JSON.stringify(scene.peers.map(peer => peer.seen)) === JSON.stringify(picturesBefore) };
}

export function executeProjection(scene: ReturnType<typeof projectionScene>, command: Intent) {
  const own = structuredClone(scene.body), peers = scene.peers.map(peer => structuredClone(peer.body));
  const world = new World([own, ...peers]); world.time = 1.25;
  const commands: Intent[] = [command, ...peers.map(peer => ({ vel: { ...peer.vel }, facing: peer.facing }))];
  let contacts = 0, maxWorkResidual = 0, maxMotorExcess = 0, upright = true;
  for (let k = 0; k < 12; k++) {
    const report = world.step(commands, .05);
    contacts += report.contacts.filter(contact => contact.impulse > 0).length;
    maxWorkResidual = Math.max(maxWorkResidual, Math.abs(report.work.residual));
    maxMotorExcess = Math.max(maxMotorExcess, ...report.supportMotorWork.map((work, i) => work - report.supportMotorWorkLimit[i]));
    upright &&= own.support?.state === 'up';
  }
  const goal = movementObjective(scene.raw)!, speed = Math.hypot(scene.raw.vel.x, scene.raw.vel.y);
  return { own, peers, contacts, upright, maxWorkResidual, maxMotorExcess,
    progress: ((own.pos.x - scene.body.pos.x) * scene.raw.vel.x + (own.pos.y - scene.body.pos.y) * scene.raw.vel.y) / speed,
    goalError: Math.hypot(own.pos.x - goal.point.x, own.pos.y - goal.point.y) };
}

function main() {
  if (process.argv.length !== 3) throw Error('Specify one output JSON path');
  const started = performance.now(), source = sourceVersion();
  const rows = (['ordinary', 'clear', 'loaded', 'obstruction'] as const).map(kind => {
    const scene = projectionScene(kind), oracle = projectionOracle(scene), selected = selectProjection(scene);
    const ordinary = { ...scene.raw, vel: oracle.ordinary };
    return { kind, incoming: scene, oracle, selected,
      physical: kind === 'loaded' ? null : { ordinary: executeProjection(scene, ordinary),
        closest: executeProjection(scene, {...scene.raw,vel:oracle.closest}),selected: executeProjection(scene, selected.command) } };
  });
  if (sourceVersion() !== source) throw Error('Source changed during mechanical collection');
  const output = resolve(process.argv[2]); mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ scope: 'Staged fixed-request physical comparison, not reacting native football or recurrence evidence',
    source, node: process.version, fixtureSha256: createHash('sha256').update(readFileSync(fixturePath)).digest('hex'),
    rows, elapsedMs: performance.now() - started }, null, 2) + '\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
