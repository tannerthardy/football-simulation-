import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import type {ActiveGripInput} from '../src/physics/active-grip.js';
import {nativeSpanInterval} from '../scripts/diag/physics/grip-native-span-interval.js';
import {nativeTransitionInterval} from '../scripts/diag/physics/grip-native-slip.js';
import {nativeCenteredReference} from '../scripts/diag/physics/grip-native-centered-reference.js';
import {nativeReelEventReference} from '../scripts/diag/physics/grip-native-reel-reference.js';
import {nativeSpanModel,nativeReel} from '../scripts/diag/physics/grip-native-span-model.js';
import {spanEventForce} from '../scripts/diag/physics/grip-span-event-force.js';
import {pressureGeometry} from '../scripts/diag/physics/grip-pressure-rate.js';
import {nativeForceFixture} from '../scripts/diag/physics/grip-native-world-fixtures.js';
const cases=JSON.parse(readFileSync('config/grip-native-reel-stop-inputs.json','utf8')).cases as Array<{history:string;input:ActiveGripInput}>;
describe('native reel-stop scope, preserving the existing World law',()=>{
  it.each(cases)('refuses the actual below-stop positive-reel query and both references: $history',({input:q})=>{
    for(const solve of [nativeSpanInterval,nativeTransitionInterval,(q:ActiveGripInput)=>nativeCenteredReference(q,1024),(q:ActiveGripInput)=>nativeReelEventReference(q,1024)])
      expect(()=>solve(q)).toThrow('Native reel-stop scope');
    const p=structuredClone(q);p.pullSpeed=0;
    expect(nativeSpanInterval(p).reelDose).toBe(0);
  });
  it('rechecks moving material geometry at force stages, not only input and endpoint',()=>{
    const c=JSON.parse(readFileSync('config/grip-native-force-inputs.json','utf8')).cases[0],q=c.input,
      m=nativeSpanModel(q,spanEventForce(1/q.a.mass+1/q.b.mass)),y=m.initial.slice(),g=pressureGeometry(q,y);
    expect(nativeReel(q,g)).toBeGreaterThan(0);expect(g.d).toBeGreaterThan(q.minimumDistance/1.12);
    // Keep velocities, material and force requests; move the holder toward
    // the current attachment, as can occur at an intermediate RK stage.
    const d=.5*q.minimumDistance/1.12;y[0]=y[6]+g.rbx-g.nx*d;y[1]=y[7]+g.rby-g.ny*d;
    expect(()=>m.derivative(y)).toThrow('Native reel-stop scope');
    const closed=pressureGeometry(q,y);closed.vn=-10;
    expect(nativeReel(q,closed)).toBe(0); // No positive demand to suppress.
  });
  it('uses the native atomic fallback without applying an earlier partial proposal',()=>{
    const a=nativeForceFixture(undefined,16,'combined',()=>nativeTransitionInterval(cases[0].input)),b=nativeForceFixture(undefined,16,'owned');
    const r=a.advance(),s=b.advance(),{activeGrip,...rest}=r;
    expect(activeGrip.accepted).toBe(0);expect(activeGrip.fallbacks).toBe(1);expect(rest).toEqual(s);
    expect(a.w.bodies).toEqual(b.w.bodies);expect(a.w.attachments.get(a.joint)).toEqual(b.w.attachments.get(b.joint));
  });
});
