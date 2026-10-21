/** Diagnostic-only, read-only support samples after each world tick.
 * Set SUPPORT_TELEMETRY_OUTPUT and preload after enable-virtual-foot.ts.
 * No controller calls, RNG use or body/joint state writes. Tick samples
 * cannot certify instantaneous force peaks or gross-positive substep work.
 */
import { writeFileSync } from 'node:fs';
import { World } from '../../src/physics/world.js';
const original = World.prototype.step;
const summary = {
  note:'Sampled once after each world tick, not a substep peak. Signed motor-work totals cannot establish gross-positive per-substep work bounds.',
  worldTicks:0, bodyTicks:0, feetBodyTicks:0, nonfiniteSamples:0,
  maxSupportOffsetYd:0, maxAnchorDistanceFromComYd:0, maxRequestedCorrectionSpeedYdS:0,
  maxAchievedCorrectionSpeedYdS:0, maxActiveCommandFraction:0, maxExternalLoadFraction:0,
  maxXiYd:0, maxMotorPositiveTickWorkFraction:0, positiveMotorTickWork:0, negativeMotorTickWork:0,
  supportOffsetsAboveBodyRadius:0, longestPlacingSeconds:0,
};
const times = new WeakMap<object,number>();
World.prototype.step = function(intents,dt) {
  const report=original.call(this,intents,dt);
  summary.worldTicks++;
  for(let i=0;i<this.bodies.length;i++) {
    const body=this.bodies[i]; summary.bodyTicks++;
    const support=body.support, foot=support?.foot;
    if(!foot) continue;
    summary.feetBodyTicks++;
    const offset=Math.hypot(foot.offset.x,foot.offset.y);
    const request=Math.hypot(foot.desired.x,foot.desired.y);
    const achieved=Math.hypot(foot.achieved.x,foot.achieved.y);
    const anchorDistance=Math.hypot(foot.anchor.x-body.pos.x,foot.anchor.y-body.pos.y);
    const xi=Math.hypot(support!.xi.x,support!.xi.y);
    if(![offset,request,achieved,anchorDistance,xi,foot.capacity,foot.mobility].every(Number.isFinite)) summary.nonfiniteSamples++;
    summary.maxSupportOffsetYd=Math.max(summary.maxSupportOffsetYd,offset);
    summary.maxAnchorDistanceFromComYd=Math.max(summary.maxAnchorDistanceFromComYd,anchorDistance);
    summary.maxRequestedCorrectionSpeedYdS=Math.max(summary.maxRequestedCorrectionSpeedYdS,request);
    summary.maxAchievedCorrectionSpeedYdS=Math.max(summary.maxAchievedCorrectionSpeedYdS,achieved);
    summary.maxXiYd=Math.max(summary.maxXiYd,xi);
    if(foot.capacity>1e-9&&foot.mobility>1e-9) {
      summary.maxActiveCommandFraction=Math.max(summary.maxActiveCommandFraction,request/foot.mobility/foot.capacity);
      summary.maxExternalLoadFraction=Math.max(summary.maxExternalLoadFraction,Math.hypot(foot.force.x,foot.force.y)/foot.capacity);
    }
    if(offset>body.profile.radius) summary.supportOffsetsAboveBodyRadius++;
    const placing=foot.state==='placing'?(times.get(body)??0)+dt:0;
    times.set(body,placing);summary.longestPlacingSeconds=Math.max(summary.longestPlacingSeconds,placing);
    const motor=report.supportMotorWork[i];
    summary.positiveMotorTickWork+=Math.max(0,motor);
    summary.negativeMotorTickWork+=Math.min(0,motor);
    if(report.supportMotorWorkLimit[i]>1e-9) summary.maxMotorPositiveTickWorkFraction=Math.max(summary.maxMotorPositiveTickWorkFraction,motor/report.supportMotorWorkLimit[i]);
  }
  return report;
};
process.once('exit',()=>{if(process.env.SUPPORT_TELEMETRY_OUTPUT) writeFileSync(process.env.SUPPORT_TELEMETRY_OUTPUT,JSON.stringify(summary,null,2)+'\n');});
