/** Static research check; no PlaySim, World, RNG or new observation calls.
 * OUT native-summary... . Four preregistered witnesses only. Preserve the
 * actual selected pressure actor, picture, profile and original held term.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { timeToReach } from '../../src/physics/reach.ts';
import { sweptContact, geometryWithOriginalHold } from './qb-contact-danger-model.ts';
import { sourceVersion } from '../source-version.ts';

const start = performance.now(), [out, ...inputs] = process.argv.slice(2);
const digest = p => createHash('sha256').update(readFileSync(p)).digest('hex');
const finite = x => Number.isFinite(x) ? x : null;
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
assert.equal(sourceVersion(), profile.sourceSha256);
assert.deepEqual(Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null])), profile.flags);
const wanted = ['R3101-S1001-P46', 'R3101-S1001-P39', 'R4202-S2001-P150', 'R4202-S2001-P67'];

// Geometry contracts concern the prediction, never the physical outcome.
const q = {pos: {x: 0, y: 0}, vel: {x: 0, y: 0}, radius: .3};
const mover = (x,y,vx,vy,age=0) => ({picture: {pos: {x,y}, vel: {x:vx,y:vy}, age, pose:'up'}});
let checks = 0;
const close = (a,b) => { assert.ok(Math.abs(a-b) < 1e-9, `${a} != ${b}`); checks++; };
close(sweptContact(q,mover(4,0,-4,0),1),.75);
assert.equal(sweptContact(q,mover(4,2,-4,0),1),Infinity);checks++;
assert.equal(sweptContact(q,mover(4,0,4,0),1),Infinity);checks++;
assert.equal(sweptContact(q,mover(.5,0,4,0),1),Infinity);checks++;
assert.equal(sweptContact(q,mover(4,0,0,0),1),Infinity);checks++;
close(sweptContact(q,mover(4,0,-4,0,.4),1),.75); // age already projected
close(sweptContact({...q,vel:{x:1,y:2}},mover(4,0,-3,2),1),.75);
assert.equal(sweptContact({...q,vel:{x:-4,y:0}},mover(4,0,-4,0),1),Infinity);checks++;

const rows = [];
for (const input of inputs) {
  const packet = JSON.parse(readFileSync(input,'utf8'));
  assert.equal(packet.provenance.sourceSha256, sourceVersion());
  assert.deepEqual(packet.provenance.flags, profile.flags);
  for (const r of packet.rows.filter(r => wanted.includes(r.id))) {
    assert.ok(!r.result.penalty && !r.gameDisposition.nullified);
    assert.equal(digest(r.film.path),r.film.sha256);
    const f = JSON.parse(gunzipSync(readFileSync(r.film.path)));
    assert.equal(f.signature,r.signature);
    const qb = f.players.find(a => a.slot === 'QB');
    const contact = r.result.events.find(e => e.type === 'carrier_contact' && (e.a === qb.i || e.b === qb.i));
    const samples = [];
    for (const s of f.steps) for (const p of s.pressure) {
      if (s.t < .5 || s.t > (contact?.t ?? r.measurement.pocketEnd) || p.i === null || p.time === null) continue;
      const picture = p.pictures.find(x => x.i === p.i)?.picture;
      assert.ok(picture,'The picture of the actual chosen defender must exist');
      const d = f.players[p.i], own = s.before[qb.i];
      const m = {picture,profile:d.profile,speedScale:s.before[p.i].speedScale};
      const oldTravel = timeToReach({pos:picture.pos,vel:picture.vel,profile:m.profile,speedScale:m.speedScale},own.pos,.8);
      const held = p.time - oldTravel; assert.ok(held >= -1e-9);
      const g = geometryWithOriginalHold({pos:own.pos,vel:own.vel,radius:qb.profile.radius},m,held);
      const boundTravel = timeToReach({pos:picture.pos,vel:picture.vel,profile:m.profile,speedScale:m.speedScale},own.pos,g.radius);
      const dx = picture.pos.x-own.pos.x, dy = picture.pos.y-own.pos.y, D = Math.hypot(dx,dy);
      const vx = picture.vel.x-own.vel.x, vy = picture.vel.y-own.vel.y;
      const closing = -(dx*vx+dy*vy)/D;
      samples.push({t:s.t,phase:p.phase,i:p.i,id:d.id,age:picture.age,
        actualDistance:p.dist,observedDistance:D,relativeClosing:closing,strain:closing/D,
        radialTime:closing>0?D/closing:null,held,original:p.time,
        radius:g.radius,radiusOnly:boundTravel+held,sweptOnly:finite(g.moving+held),
        redirectOnly:finite(g.redirect+held),combined:finite(g.time),
        ownVelocity:own.vel,observedVelocity:picture.vel});
    }
    // Retain the literal engine comparison beside a numerically stable
    // diagnostic comparison. The 50-ms intercept grid represents .45 as
    // .44999999999999996; that is not evidence of earlier football urgency.
    const firstRaw = key => samples.find(s => s[key] !== null && s[key] < .45) ?? null;
    const first = key => samples.find(s => s[key] !== null && s[key] < .45 - 1e-9) ?? null;
    rows.push({id:r.id,qb:{i:qb.i,id:qb.id},nativeSignature:r.signature,
      originalFilm:r.film,kind:r.measurement.kind,pocketEnd:r.measurement.pocketEnd,
      release:r.measurement.release,firstContact:contact??null,
      originalFirstImminent:first('original'),radiusFirstImminent:first('radiusOnly'),
      sweptFirstImminent:first('sweptOnly'),redirectFirstImminent:first('redirectOnly'),
      combinedFirstImminent:first('combined'),combinedLiteralFirstImminent:firstRaw('combined'),
      gridThresholdEdges:samples.filter(s=>s.combined!==null&&Math.abs(s.combined-.45)<1e-9),samples});
  }
}
assert.deepEqual(rows.map(r=>r.id).sort(),wanted.slice().sort());
const result = {schema:'qb-pressure-research-same-picture-v1',
  question:'Does relative-motion hand-contact geometry explain the saved danger mismatch while retaining protected and windup controls?',
  commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceSha256:sourceVersion(),
  collectorSha256:digest(import.meta.filename),modelSha256:digest(new URL('./qb-contact-danger-model.ts',import.meta.url)),
  flags:profile.flags,worldDefaults:profile.worldDefaults,
  inputs:inputs.map(path=>({path,sha256:digest(path)})),checks,rows,elapsedMs:performance.now()-start,
  newSimulations:0,newObservations:0,newRandomDraws:0,controllerInstalled:false,
  limits:['Same actor and consumed picture, not a new actor-selection or perception policy.',
    'Original live held penalty and speedScale deliberately retained to isolate geometry.',
    'Full reach is a possible-contact outer bound, not grip acquisition or a guaranteed sack.',
    'Interpolation feasibility checked; full speculative intercept may still underestimate physical arrival.',
    'The literal .45 comparison is retained separately from a 1e-9 tolerance; the latter is diagnosis, not a changed production gate.',
    'Original feet, release and physical endings are fixed; no candidate outcome or fresh-player transfer is claimed.',
    'Blocked/visible-lane information arm requires recording available teammate observations; it is not inferred from film truth.']};
mkdirSync(dirname(out),{recursive:true});writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({out,checks,newSimulations:0,rows:rows.map(r=>({id:r.id,
  original:r.originalFirstImminent?.t??null,radius:r.radiusFirstImminent?.t??null,
  swept:r.sweptFirstImminent?.t??null,redirect:r.redirectFirstImminent?.t??null,
  combined:r.combinedFirstImminent?.t??null,literalCombined:r.combinedLiteralFirstImminent?.t??null,
  phase:r.combinedFirstImminent?.phase??null,
  actor:r.combinedFirstImminent?.id??null,contact:r.firstContact?.t??null,release:r.release}))}));
