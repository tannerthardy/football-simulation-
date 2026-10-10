/** Real controller wrap feedback, identical pre-wrap trajectory at each resolution.
 * No new perceptions, decisions or random draws. Private-method observation is
 * confined to this diagnostic, not a production controller or reusable save.
 * node --import tsx scripts/diag/wrap-feedback.ts out/wrap-feedback.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { World, type Intent, type StepReport } from '../../src/physics/world.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { redirect } from '../../src/lab/scenarios.js';
import { sourceVersion } from '../source-version.js';

interface DebugWorld {
  feet(this: World, i: number, intent: Intent, plan: unknown, h: number, remaining: number, report: StepReport): void;
  substep(this: World, ids: number[], intents: Intent[], plans: unknown[], h: number, remaining: number,
    report: StepReport, pairs: unknown, contact: boolean): void;
}
// Private methods are deliberately observed through a structural runtime view.
const proto = World.prototype as unknown as DebugWorld;
const originalStep = World.prototype.step, originalFeet = proto.feet,
  originalSubstep = proto.substep, originalTick = PlaySim.prototype.tick;
let current: PlaySim | undefined, active: World | undefined, wrapAt = -1;
let rows: unknown[] = [], feetDelta = new Map<number, {x: number; y: number}>();
PlaySim.prototype.tick = function() { current = this; return originalTick.call(this); };
proto.feet = function(i, intent, plan, h, remaining, report) {
  const xi = { ...this.bodies[i].support!.xi };
  originalFeet.call(this, i, intent, plan, h, remaining, report);
  const after = this.bodies[i].support!.xi;
  if (this === active) feetDelta.set(i, {x: after.x-xi.x, y: after.y-xi.y});
};
function actors(world: World) {
  return world.bodies.map((b, i) => ({slot: current!.agents[i].slot, pos: {...b.pos}, vel: {...b.vel},
    support: structuredClone(b.support), feetXi: feetDelta.get(i)}))
    .filter(a => ['QB','DE_S','RT'].includes(a.slot));
}
function grips(world: World) {
  return world.joints.filter(j => j.kind === 'grasp').map(j => {
    const {a,b,...state} = j;
    return {holder:current!.agents[world.indexOf(a)].slot, carrier:current!.agents[world.indexOf(b)].slot,
      distance:Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y), ...structuredClone(state)};
  });
}
proto.substep = function(ids, intents, plans, h, remaining, report, pairs, contact) {
  const observe = this === active && this.time-wrapAt < .55;
  const before = observe ? {actors:actors(this),grips:grips(this)} : undefined;
  if (observe) feetDelta.clear();
  originalSubstep.call(this, ids, intents, plans, h, remaining, report, pairs, contact);
  if (observe) rows.push({t:this.time, simT:current!.t,h,remaining,before,
    after:{actors:actors(this),grips:grips(this)}});
};

const trials = [];
try {
  for (const after of [6,12,24,48,96,192]) {
    active=undefined;wrapAt=-1;rows=[];feetDelta.clear();
    const ticks:unknown[]=[];
    World.prototype.step=function(intents,dt) {
      if (current?.world === this && !active && this.joints.some(j => j.kind==='grasp' && !j.broken)) {
        active=this;wrapAt=this.time;this.substeps=after;
      }
      const observe=this===active && this.time-wrapAt<.55;
      const before=observe?actors(this):undefined;
      const r=originalStep.call(this,intents,dt);
      if(observe) ticks.push({t:this.time,simT:current!.t,intents:current!.agents.map(a=>({slot:a.slot,intent:structuredClone(intents[a.idx])}))
        .filter(a=>['QB','DE_S','RT'].includes(a.slot)),before,after:actors(this),grips:grips(this),
        falls:r.falls.map(i=>current!.agents[i].slot),workResidual:r.work.residual,
        leanResidual:r.maxLeanReleaseResidual??null,leanIterations:r.maxLeanReleaseIterations??null,
        events:structuredClone(current!.events.slice(-4))});
      return r;
    };
    const result=redirect({seed:3,rusherPower:1,substeps:192});
    if(!active)throw new Error('Expected a live wrap');
    trials.push({before:192,after,wrapAt,result,ticks,substeps:rows});
  }
} finally {
  World.prototype.step=originalStep;proto.feet=originalFeet;proto.substep=originalSubstep;
  PlaySim.prototype.tick=originalTick;
}
const out=process.argv[2]??'out/wrap-feedback.json';mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify({sourceSha256:sourceVersion(),note:'Seed3/power1, real football controllers/officiating. All pre-wrap paths use192; switch only the first incoming grasp step. Same pre-wrap RNG/trajectory, no new observation calls. Rows record feet-phase xi transfer separately from support update, geometry/loads/filtered support, and chosen tick intents. Runtime prototypes restored after diagnostic.',trials},null,2)+'\n');
console.table(trials.map(t=>({after:t.after,wrapAt:t.wrapAt,falls:t.result.falls.join(','),
  ticks:t.ticks.length,substeps:t.substeps.length})));
