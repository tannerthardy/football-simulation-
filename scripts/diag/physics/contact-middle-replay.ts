/** Separate actual internal loading from running's response in one saved trace.
 * The no-contact arm replays the same runner request tape from the same body.
 * It is a mechanical counterfactual, not a reacting football continuation.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Body } from '../../../src/physics/kinematics.js';
import { World, type Intent } from '../../../src/physics/world.js';
import { sourceVersion } from '../../source-version.js';

const [input, output] = process.argv.slice(2);
assert.equal(process.argv.length, 4, 'Usage: contact-middle-replay.ts INPUT.json OUTPUT.json');
const raw = readFileSync(input), trace = JSON.parse(raw.toString());
const start = trace.states.findIndex((f: any) => f.holds.length > 0
  && Math.hypot(f.internalImpulse.x, f.internalImpulse.y) > 1e-7);
assert.ok(start > 0, 'Need acquired physical loading after the untouched prefix');
const frames = trace.states.slice(start - 1).filter((f: any) => f.t < 5.2);
const body: Body = structuredClone(frames[0].before.body);
assert.ok(body?.profile && body.support && Number.isFinite(body.energy), 'Need a complete attained body');
assert.equal(body.support.foot, undefined, 'Start before the acquired lower hold creates its coordinate');
const world = new World([body]); world.time = frames[0].t;
const speed = (v: {x:number;y:number}) => Math.hypot(v.x,v.y);
const unit = (v: {x:number;y:number}) => ({x:v.x/(speed(v)||1),y:v.y/(speed(v)||1)});
const along = (v: {x:number;y:number},u: {x:number;y:number}) => v.x*u.x+v.y*u.y;
const incoming = unit(body.vel), mass = body.profile.massKg;
const wall = performance.now(), cpu = process.cpuUsage();
let internalAlong = 0, groundAlong = 0;
const rows = frames.map((f: any) => {
  const u = unit(f.before.vel);
  internalAlong += along(f.internalImpulse,u)/mass;
  groundAlong += along(f.ground,u)/mass;
  const report = world.step([structuredClone(f.request) as Intent], .05);
  assert.equal(report.contacts.length,0);
  const delta = {x:body.pos.x-f.after.pos.x,y:body.pos.y-f.after.pos.y};
  return { t:f.t, end:f.end, native: {pos:f.after.pos,vel:f.after.vel,speed:speed(f.after.vel),
      xi:f.after.support.xi,availability:f.after.availability,state:f.after.support.state},
    withoutContact:{pos:{...body.pos},vel:{...body.vel},speed:speed(body.vel),
      support:structuredClone(body.support)},
    speedDeficit:speed(body.vel)-speed(f.after.vel), distanceDeficitAlongIncoming:along(delta,incoming),
    displacementDifference:delta, cumulativeNativeInternalAlong:internalAlong,
    cumulativeNativeGroundAlong:groundAlong, workResidual:report.work.residual };
});
// Removing peers also selects World's isolated one-step path. Bound that
// numerical confound with the accepted adaptive island's 12/16-step limits.
// A zero-capacity far connection selects subdivision without applying load.
const refinement = [12,16].map(substeps => {
  const runner: Body = structuredClone(frames[0].before.body);
  const dummy: Body = {profile:structuredClone(runner.profile),pos:{x:1000,y:1000},
    vel:{x:0,y:0},facing:0,energy:1};
  const w = new World([runner,dummy],{substeps}); w.time=frames[0].t;
  w.joints.push({kind:'hands',a:runner,b:dummy,extension:2000,push:0,hold:0,steer:0});
  let maxPositionDifference=0,maxVelocityDifference=0;
  for (let i=0;i<frames.length;i++) {
    const r=w.step([structuredClone(frames[i].request),{vel:{x:0,y:0},free:true}],.05);
    assert.equal(r.contacts.length,0); assert.equal(r.work.hands,0);
    const clear=rows[i].withoutContact;
    maxPositionDifference=Math.max(maxPositionDifference,Math.hypot(runner.pos.x-clear.pos.x,runner.pos.y-clear.pos.y));
    maxVelocityDifference=Math.max(maxVelocityDifference,Math.hypot(runner.vel.x-clear.vel.x,runner.vel.y-clear.vel.y));
  }
  const last=frames.at(-1).after;
  return {substeps,maximumPositionDifferenceVsIsolated:maxPositionDifference,
    maximumVelocityDifferenceVsIsolated:maxVelocityDifference,
    finalSpeedDeficit:speed(runner.vel)-speed(last.vel),
    finalDisplacementDifference:{x:runner.pos.x-last.pos.x,y:runner.pos.y-last.pos.y}};
});
const used = process.cpuUsage(cpu);
const receipt = { source:sourceVersion(), input, inputSha256:createHash('sha256').update(raw).digest('hex'),
  toolSha256:createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'), node:process.version,
  nativeSource:trace.source, initialBody:frames[0].before.body,
  measurement:'Sum of each exact internal/ground impulse projected onto that tick incoming velocity, divided by mass. These moving-axis sums are not an exact scalar speed difference. No-contact replay holds the native commands fixed; it is not a reacting play or an achievable avoidance policy.',
  window:[frames[0].t,frames.at(-1).end],refinement,
  summary: { minimumNativeSpeed:Math.min(...rows.map((r:any)=>r.native.speed)),
    maximumNativeXi:Math.max(...rows.map((r:any)=>speed(r.native.xi))),
    minimumNativeAvailability:Math.min(...rows.map((r:any)=>r.native.availability)),
    actualTorsoContactTicks:frames.filter((f:any)=>f.contacts.length).length,
    nativeInternalAlong:internalAlong,nativeGroundAlong:groundAlong,
    maximumSpeedDeficit:Math.max(...rows.map((r:any)=>r.speedDeficit)),
    finalSpeedDeficit:rows.at(-1).speedDeficit,
    finalDistanceDeficitAlongIncoming:rows.at(-1).distanceDeficitAlongIncoming,
    finalDisplacementDifference:rows.at(-1).displacementDifference,
    maximumAbsoluteReplayWorkResidual:Math.max(...rows.map((r:any)=>Math.abs(r.workResidual))) }, rows,
  runtime:{wallSeconds:(performance.now()-wall)/1000,cpuSeconds:(used.user+used.system)/1e6} };
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({output,window:receipt.window,summary:receipt.summary,refinement,runtime:receipt.runtime},null,2));
