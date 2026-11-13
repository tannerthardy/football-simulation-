import { describe, it, expect } from 'vitest';
import { solveSoleImpact, solveSoleReaction, projectTangentImpulse, tangentMaximumDissipationResidual, normalComplementarityResidual, type SoleContactPoint } from '../../src/physics/sole-contact.js';
import { identityRigidBasis, type MaterialRigidState, v3Norm } from '../../src/physics/material-rigid.js';
const foot = (velocity = {x:0,y:0,z:-3}, angularMomentum = {x:0,y:0,z:0}): MaterialRigidState => ({mass:2,inertia:.05,position:{x:0,y:0,z:.1},velocity,angularMomentum,basis:identityRigidBasis()});
const sole = (friction:number):SoleContactPoint[] => [{id:'a',local:{x:-.2,y:-.1,z:-.1},friction},{id:'b',local:{x:.2,y:-.1,z:-.1},friction},{id:'c',local:{x:0,y:.2,z:-.1},friction}];
function ledger(r:ReturnType<typeof solveSoleImpact>) {
 expect(r.report.accepted, r.report.reason ?? '').toBe(true);
 expect(r.report.energyAfter).toBeLessThanOrEqual(r.report.energyBefore+1e-9);
 expect(Math.abs(r.report.workResidual)).toBeLessThan(1e-9);
 expect(v3Norm(r.report.linearMomentumResidual)).toBeLessThan(1e-9);
 expect(v3Norm(r.report.angularMomentumResidual)).toBeLessThan(1e-9);
 for(const c of r.report.contacts){expect(c.postVelocity.z).toBeGreaterThanOrEqual(-1e-9);expect(c.normalResidual).toBeLessThanOrEqual(1e-9);expect(c.tangentResidual).toBeLessThanOrEqual(1e-9);expect(c.frictionCapExcess).toBeLessThanOrEqual(1e-9);}
}
describe('finite material sole impact',()=>{
 it('plastic three-point drop stops actual normal motion and conserves the impulse ledger',()=>{
 const r=solveSoleImpact(foot(),sole(0));ledger(r);expect(Math.abs(r.state.velocity.z)).toBeLessThan(1e-9);expect(v3Norm(r.state.angularMomentum)).toBeLessThan(1e-9);expect(r.report.impulseWork).toBeCloseTo(-9,8);
 });
 it('cannot purchase normal load to brake a purely lateral unloaded impact',()=>{
 const r=solveSoleImpact(foot({x:4,y:2,z:0}),sole(2));ledger(r);expect(r.state.velocity).toEqual({x:4,y:2,z:0});expect(r.report.contacts.every(c=>v3Norm(c.impulse)===0)).toBe(true);
 });
 it('frictionless impact preserves lateral momentum while finite friction dissipates slip',()=>{
 const initial=foot({x:4,y:1,z:-3});const free=solveSoleImpact(initial,sole(0));ledger(free);expect(free.state.velocity.x).toBe(4);expect(free.state.velocity.y).toBe(1);
 const sliding=solveSoleImpact(initial,sole(.3));ledger(sliding);expect(sliding.report.energyAfter).toBeLessThan(free.report.energyAfter);expect(sliding.report.contacts.some(c=>Math.hypot(c.postVelocity.x,c.postVelocity.y)>1e-3)).toBe(true);
 });
 it('coupled spinning drop closes angular momentum and is invariant under translation and reflection',()=>{
 const initial=foot({x:1,y:.4,z:-3},{x:.08,y:-.06,z:.02});const base=solveSoleImpact(initial,sole(.4));ledger(base);
 const translated=structuredClone(initial);translated.position.x=10;translated.position.y=-7;const shifted=solveSoleImpact(translated,sole(.4));ledger(shifted);expect(v3Norm({x:shifted.state.velocity.x-base.state.velocity.x,y:shifted.state.velocity.y-base.state.velocity.y,z:shifted.state.velocity.z-base.state.velocity.z})).toBeLessThan(1e-9);
 const mirrored=foot({x:-1,y:.4,z:-3},{x:.08,y:.06,z:-.02});const contacts=sole(.4).map(c=>({...c,local:{...c.local,x:-c.local.x}}));const mirror=solveSoleImpact(mirrored,contacts);ledger(mirror);expect(mirror.state.velocity.x).toBeCloseTo(-base.state.velocity.x,8);expect(mirror.state.velocity.z).toBeCloseTo(base.state.velocity.z,8);
 });
 it('uses actual upside-down material top points rather than assuming a sole orientation',()=>{
 const initial=foot({x:.7,y:-.2,z:-2},{x:.03,y:.02,z:-.01});
 initial.basis=[{x:1,y:0,z:0},{x:0,y:-1,z:0},{x:0,y:0,z:-1}];
 const top=sole(.3).map(c=>({...c,local:{...c.local,z:.1}}));
 const r=solveSoleImpact(initial,top);ledger(r);expect(r.state.basis).toEqual(initial.basis);expect(r.report.contacts.every(c=>Math.abs(c.point.z)<1e-12)).toBe(true);
 });
 it('redundant contact loads may be nonunique while observable rows still converge',()=>{
 const contacts=sole(0);contacts.push({...contacts[0],id:'duplicate',local:{...contacts[0].local}});const r=solveSoleImpact(foot(),contacts);ledger(r);expect(Math.abs(r.state.velocity.z)).toBeLessThan(1e-9);
 });
 it('rejects off-plane geometry and incomplete solves atomically without snapping',()=>{
 const initial=foot();initial.position.z=.11;const original=structuredClone(initial);const r=solveSoleImpact(initial,sole(.3));expect(r.report.accepted).toBe(false);expect(r.state).toEqual(original);expect(initial).toEqual(original);
 const moving=foot({x:4,y:1,z:-3});const short=solveSoleImpact(moving,sole(.3),{maxIterations:1});expect(short.report.accepted).toBe(false);expect(short.state).toEqual(moving);expect(short.report.maxNormalResidual+short.report.maxTangentResidual).toBeGreaterThan(1e-9);
 });
 it('accelerates a retained coupled high-friction fixture without relaxing physical rows',()=>{
 const initial=foot({x:-.24753359612077475,y:-3.498403204139322,z:-3.8836548617109656},{x:-.05687765525653959,y:-.18468870241194965,z:-.06795506132766604});
 initial.mass=3.3422279935330153;initial.inertia=.039251016257330774;
 const r=solveSoleImpact(initial,sole(.9840891537023708));ledger(r);expect(r.report.acceleratedUpdates).toBeGreaterThan(0);
 });
 it('anisotropic disk prox satisfies maximum dissipation at its actual normal cap',()=>{
 const h={xx:2,xy:.4,yy:1},free={x:3,y:-2};const j=projectTangentImpulse(free,h,2,.3);const v={x:free.x+h.xx*j.x+h.xy*j.y,y:free.y+h.xy*j.x+h.yy*j.y};expect(Math.hypot(j.x,j.y)).toBeLessThanOrEqual(.6);expect(Math.abs(j.x*v.y-j.y*v.x)).toBeLessThan(1e-12);expect(j.x*v.x+j.y*v.y).toBeLessThan(0);expect(tangentMaximumDissipationResidual(j,v,h,2,.3)).toBeLessThan(1e-12);expect(normalComplementarityResidual(0,1,2)).toBe(0);
 });
});

describe('actual-pose instantaneous sole reactions',()=>{
 it('balances foot gravity plus a transmitted actual leg load without prescribed shares',()=>{
 const initial=foot({x:0,y:0,z:0});const r=solveSoleReaction(initial,sole(.5),{bodyForce:{x:0,y:0,z:-20},pointForces:[{local:{x:0,y:0,z:.1},force:{x:0,y:0,z:-50}}]});
 expect(r.accepted,r.reason??'').toBe(true);expect(r.contacts.reduce((n,c)=>n+c.force.z,0)).toBeCloseTo(70,7);expect(v3Norm(r.linearAcceleration)).toBeLessThan(1e-9);expect(v3Norm(r.angularAcceleration)).toBeLessThan(1e-8);expect(r.maxNormalResidual).toBeLessThanOrEqual(1e-9);expect(r.maxTangentResidual).toBeLessThanOrEqual(1e-9);expect(r.contactPower).toBe(0);
 });
 it('solves incipient lateral friction jointly with actual normals and rejects no positive load on lift',()=>{
 const initial=foot({x:0,y:0,z:0});const r=solveSoleReaction(initial,sole(.5),{bodyForce:{x:4,y:0,z:-20}});expect(r.accepted,r.reason??'').toBe(true);expect(v3Norm(r.linearAcceleration)).toBeLessThan(1e-9);expect(v3Norm(r.angularAcceleration)).toBeLessThan(1e-8);expect(r.maxNormalResidual).toBeLessThanOrEqual(1e-9);expect(r.maxTangentResidual).toBeLessThanOrEqual(1e-9);
 const noFriction=solveSoleReaction(initial,sole(0),{bodyForce:{x:4,y:0,z:-20}});expect(noFriction.accepted,noFriction.reason??'').toBe(true);expect(noFriction.linearAcceleration.x).toBeCloseTo(2,10);expect(r.contacts.some((c,i)=>Math.abs(c.force.z-noFriction.contacts[i].force.z)>.1)).toBe(true);
 const lift=solveSoleReaction(initial,sole(.5),{bodyForce:{x:0,y:0,z:10}});expect(lift.accepted,lift.reason??'').toBe(true);expect(lift.contacts.every(c=>v3Norm(c.force)===0)).toBe(true);expect(lift.linearAcceleration.z).toBe(5);
 });
 it('uses the actual kinetic slip direction and actual normal force, not a mean impulse',()=>{
 const initial=foot({x:2,y:1,z:0});const r=solveSoleReaction(initial,sole(.3),{bodyForce:{x:0,y:0,z:-20}});expect(r.accepted,r.reason??'').toBe(true);
 for(const c of r.contacts){expect(c.sliding).toBe(true);expect(Math.hypot(c.force.x,c.force.y)).toBeCloseTo(.3*c.force.z,9);expect(c.force.x*c.velocity.y-c.force.y*c.velocity.x).toBeCloseTo(0,9);expect(c.power).toBeLessThanOrEqual(0);expect(c.acceleration.z).toBeGreaterThanOrEqual(-1e-9);}
 expect(r.contactPower).toBeLessThan(0);expect(v3Norm(r.forceResidual)).toBeLessThan(1e-9);expect(v3Norm(r.torqueResidual)).toBeLessThan(1e-9);
 });
 it('includes centripetal acceleration and permits actual rotational unloading',()=>{
 const initial=foot({x:0,y:0,z:0},{x:.5,y:0,z:0});const points=[{id:'centre',local:{x:0,y:0,z:-.1},friction:0}];
 const r=solveSoleReaction(initial,points,{bodyForce:{x:0,y:0,z:-2}});expect(r.accepted,r.reason??'').toBe(true);expect(r.contacts[0].force.z).toBe(0);expect(r.contacts[0].acceleration.z).toBeCloseTo(9,12);
 });
 it('is nonmutating and rejects nonzero normal velocity rather than pretending it is sustained contact',()=>{
 const initial=foot();const snapshot=structuredClone(initial);const r=solveSoleReaction(initial,sole(.3),{bodyForce:{x:0,y:0,z:-20}});expect(r.accepted).toBe(false);expect(initial).toEqual(snapshot);
 });
});
