/** Frozen spacing fold, using only already consumed teammate pictures. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { fatigueFactor, enduranceFactor, followAccel } from '../../../src/physics/kinematics.ts';
import { availability, supportParams } from '../../../src/physics/support.ts';

function fold(input, peers = input.peers) {
  const { body: a, request: ia } = input;
  const capacity = availability(a.support, supportParams(a.profile), fatigueFactor(a.energy));
  let vx = ia.vel.x, vy = ia.vel.y;
  const cuts = [];
  for (const peer of peers) {
    const { seen, touch } = peer;
    const dx = seen.pos.x - a.pos.x, dy = seen.pos.y - a.pos.y, d = Math.hypot(dx, dy), gap = d - touch;
    if (d < 1e-6) continue;
    const nx = dx / d, ny = dy / d;
    const brake = followAccel(a, { x: -nx * 1e3, y: -ny * 1e3 }, ia.cutSkill ?? 1, capacity);
    const decel = Math.max(.1, -brake.x * nx - brake.y * ny);
    const current = Math.max(0, (a.vel.x - seen.vel.x) * nx + (a.vel.y - seen.vel.y) * ny);
    const stopping = current * .3 + current * current / (2 * decel);
    if (gap > Math.max(1.2, stopping)) continue;
    const rx = vx - seen.vel.x, ry = vy - seen.vel.y, closing = rx * nx + ry * ny;
    const speed2 = rx * rx + ry * ry, closest = speed2 > 1e-9 ? Math.max(0, (dx * rx + dy * ry) / speed2) : 0;
    const closestDistance = Math.hypot(dx - rx * closest, dy - ry * closest);
    if (gap > 0 && closestDistance > touch) continue;
    const allowed = Math.sqrt((decel * .3) ** 2 + 2 * decel * Math.max(0, gap)) - decel * .3;
    if (closing > allowed) {
      const before = { x: vx, y: vy }, cut = closing - allowed;
      vx -= nx * cut; vy -= ny * cut;
      cuts.push({ slot: peer.slot, seen, touch, gap, closing, allowed, closestDistance, before, after: { x: vx, y: vy } });
    }
  }
  if (vx !== ia.vel.x || vy !== ia.vel.y) {
    const speedScale = fatigueFactor(a.energy) * enduranceFactor(a) * (1 - .08 * (a.squeeze ?? 0));
    const scale = Math.min(1, a.profile.vmax * speedScale / Math.max(1e-9, Math.hypot(vx, vy)));
    vx *= scale; vy *= scale;
  }
  // These actors are engaged; the separate unloaded turn forecast is ineligible.
  return { velocity: { x: vx, y: vy }, cuts };
}
let manifest;
if (process.argv[2]) manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'));
else {
  const native = JSON.parse(gunzipSync(readFileSync('../football-contact-law-isolation/out/contact-isolation/protection.json.gz')));
  const probe = JSON.parse(gunzipSync(readFileSync('out/ace-protection/delivery.json.gz')));
  const cases = [];
  for (const [row, t, actor] of [[0, 1.25, 2], [0, 1.5, 2], [1, 2.2, 5], [1, 2.35, 5], [1, 2.4, 5]]) {
    const f = native.panel[row].frames.find(f => f.t === t), p = probe.panel[row];
    const write = p.writes.find(w => w.t === t && w.actor === actor && /helperIntents|stepRunRep/.test(w.caller));
    const body = f.worldInput.beforeBodies[actor];
    const cues = f.cues.filter(q => q.actor === actor && q.target < 11).slice(-10);
    assert.equal(cues.length, 10);
    assert.equal(new Set(cues.map(q => q.target)).size, 10);
    cases.push({ id: p.input.id, t, actor: f.agents[actor].slot, body, request: write.intent,
      peers: cues.map(q => ({ slot: f.agents[q.target].slot, seen: q.seen,
        touch: .9 * (body.profile.radius + f.worldInput.beforeBodies[q.target].profile.radius) })),
      expectedWorldVelocity: f.worldInput.intents[actor].vel });
  }
  manifest = { protocol: 'ace-protection-spacing-input-v1', sourceCommit: probe.commit,
    scope: 'Already consumed final teammate pictures. Pure local fold, engaged actors; no new perceptions, forecasts, bodies or live runs.', cases };
  writeFileSync('docs/reviews/ace-protection-spacing-controls.json', JSON.stringify(manifest, null, 2) + '\n');
}
const rows = manifest.cases.map(input => {
  const result = fold(input), error = Math.hypot(result.velocity.x - input.expectedWorldVelocity.x, result.velocity.y - input.expectedWorldVelocity.y);
  assert(error < 1e-12, 'Consumed-picture fold must reproduce actual delivered intent');
  const clear = input.peers.map(p => ({ ...p, seen: { ...p.seen, pos: { x: p.seen.pos.x + 30, y: p.seen.pos.y + 30 } } }));
  const opposing = fold(input, clear);
  assert.deepEqual(opposing.velocity, input.request.vel, 'Clear lane must retain the requested contact movement');
  return { id: input.id, t: input.t, actor: input.actor, request: input.request, expectedWorldVelocity: input.expectedWorldVelocity,
    error, ...result, clearLaneControl: opposing.velocity };
});
const destination = process.argv[3] ?? 'out/ace-protection/spacing.json';
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, JSON.stringify({ protocol: 'ace-protection-spacing-review-v1', rows,
  scope: 'Diagnostic fold reproduces existing spacing, not a spacing replacement or proposed traffic bypass. Clear lane is an opposing local control.' }, null, 2) + '\n');
console.log(JSON.stringify(rows.map(({ id, t, actor, error, cuts }) => ({ id, t, actor, error,
  cuts: cuts.map(({ slot, gap, closing, allowed, closestDistance, touch }) => ({ slot, gap, closing, allowed, closestDistance, touch })) }))));
