/** Offline same-state comparisons, never a live decision or new observation.
 * Uses only each captured actor's physical state and the peer pictures that
 * spacing already consumed. A held-command forecast is not a coupled result.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import type { Body } from '../../src/physics/kinematics.js';
import { previewFreeMovement, type MovementSample } from '../../src/physics/movement-preview.js';
import type { Intent } from '../../src/physics/world.js';
import type { CommandObservation } from '../../src/sim/command-observer.js';
import type { Perceived } from '../../src/sim/perception.js';

const root = process.argv[2] ?? 'out/mesh-attribution';
const read = (path: string) => JSON.parse(gunzipSync(readFileSync(path)).toString());
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
interface Peer { idx: number; seen: Perceived; touch: number }
function clearance(body: Body, samples: MovementSample[], p: Peer): number {
  let x = body.pos.x - p.seen.pos.x, y = body.pos.y - p.seen.pos.y, minimum = Math.hypot(x, y) - p.touch;
  for (const s of samples) {
    const rx = s.pos.x - p.seen.pos.x - p.seen.vel.x * s.t, ry = s.pos.y - p.seen.pos.y - p.seen.vel.y * s.t;
    const ex = rx - x, ey = ry - y, u = Math.max(0, Math.min(1, -(x * ex + y * ey) / Math.max(1e-12, ex * ex + ey * ey)));
    minimum = Math.min(minimum, Math.hypot(x + ex * u, y + ey * u) - p.touch); x = rx; y = ry;
  }
  return minimum;
}
const selections = [
  { phase: 'accepted', scenes: [['A020', 2.2], ['A020', 2.25], ['A020', 2.3], ['A044', 2.2], ['A044', 2.25], ['A044', 2.35], ['A044', 2.55], ['A008', 2.2], ['A032', 2.2]] },
  { phase: 'rejected-v1', scenes: [['A044', 2.25], ['A044', 2.3], ['A044', 2.35], ['A044', 2.55]] },
  { phase: 'rejected-v2', scenes: [['A044', 2.35], ['A044', 2.4], ['A044', 2.55]] },
];
const rows = [];
for (const { phase, scenes } of selections) for (const [id, clock] of scenes) {
  const t = clock as number, meta = read(`${root}/capture-v1/${id}.json.gz`);
  const events: CommandObservation[] = phase === 'accepted' ? meta.observations : phase === 'rejected-v1'
    ? read(`${root}/failed-transition/A044-bend.json.gz`).stages : read(`${root}/bend-v2/A044-bend.json.gz`).stages;
  const actor = id === 'A008' || id === 'A032' ? 19 : 21, observations = events.filter(e => e.t === t && e.actor === actor);
  const original = observations.find(e => e.stage === 'behavior')!, world = observations.find(e => e.stage === 'world-input')!;
  const body = original.body as Body, raw = original.command as Intent, chosen = world.command as Intent;
  const peers: Peer[] = observations.filter(e => e.stage === 'spacing-picture').map(e => ({ idx: e.peer as number,
    seen: e.used as Perceived, touch: .9 * (body.profile.radius + meta.actors[e.peer as number].profile.radius) }));
  if (peers.length !== 10) throw Error('Incomplete consumed teammate set');
  const choices: Array<{ name: string; command: Intent }> = [
    { name: 'raw', command: raw }, { name: 'chosen', command: chosen },
    { name: 'half', command: { ...raw, vel: { x: raw.vel.x * .5, y: raw.vel.y * .5 } } },
    { name: 'gather', command: { ...raw, vel: { x: 0, y: 0 } } },
    ...[-30, -15, 15, 30].map(degrees => {
      const a = degrees * Math.PI / 180;
      return { name: `bend${degrees}`, command: { ...raw,
        vel: { x: raw.vel.x * Math.cos(a) - raw.vel.y * Math.sin(a), y: raw.vel.x * Math.sin(a) + raw.vel.y * Math.cos(a) } } };
    }),
  ];
  const before = hash(body), mag = Math.hypot(raw.vel.x, raw.vel.y);
  const candidates = choices.map(({ name, command }) => {
    const samples = previewFreeMovement(body, command, t, 12), last = samples.at(-1)!;
    return { name, command, allUp: samples.every(s => s.support === 'up'), first: samples[0], last,
      progress: ((last.pos.x - body.pos.x) * raw.vel.x + (last.pos.y - body.pos.y) * raw.vel.y) / mag,
      clearances: peers.map(p => ({ peer: p.idx, clearance: clearance(body, samples, p) })).sort((a, b) => a.clearance - b.clearance) };
  });
  if (hash(body) !== before) throw Error('Offline forecast changed source body');
  rows.push({ phase, caseId: id, t, actor, bodySha256: before, peersSha256: hash(peers),
    turnGate: Math.abs(raw.vel.x * body.vel.y - raw.vel.y * body.vel.x) / Math.hypot(body.vel.x, body.vel.y), candidates });
}
writeFileSync(`${root}/same-state-alternatives.json`, JSON.stringify({ schema: 'mesh-same-state-alternatives-v1',
  nativeSimulations: 0, predictions: rows.length * 8, horizon: .6, rows }, null, 2) + '\n');
console.log(JSON.stringify({ nativeSimulations: 0, scenes: rows.length, predictions: rows.length * 8 }));
