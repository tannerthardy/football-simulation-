import {describe,it,expect} from 'vitest';
import {createMaterialPlaneCandidate,inspectMaterialPlane,type MaterialPlane} from '../../src/physics/material-plane.js';
import {identityRigidBasis,rigidMidpointState,type MaterialRigidState,type Vec3} from '../../src/physics/material-rigid.js';
const plane:MaterialPlane={normal:{x:0,y:0,z:1},height:0};
function fixture(z:number,local:Vec3,vz:number,h:number,omega:Vec3={x:2,y:0,z:0}){
 const before:MaterialRigidState={mass:2,inertia:1,position:{x:0,y:0,z},velocity:{x:0,y:0,z:vz},angularMomentum:omega,basis:identityRigidBasis()};
 const after=rigidMidpointState(before,h,before.velocity,omega);
 return {before,after,h,local,candidate:createMaterialPlaneCandidate(before,after,h,local,plane)};
}
function contains(roots:{lo:number;hi:number}[],t:number){expect(roots.some(r=>r.lo<=t&&r.hi>=t)).toBe(true);}
describe('fixed-candidate Cayley material-plane enclosures',()=>{
 it('isolates pure translation and certifies positive clear geometry',()=>{
 const f=fixture(1,{x:0,y:0,z:0},-2,1,{x:0,y:0,z:0});const r=inspectMaterialPlane(f.candidate);contains(r.roots,.5);expect(r.penetrationBeyondTolerance.certain).toBe(true);
 const clear=fixture(1,{x:0,y:0,z:0},1,1,{x:0,y:0,z:0});const c=inspectMaterialPlane(clear.candidate);expect(c.status).toBe('clear');expect(c.roots).toEqual([]);expect(c.penetrationBeyondTolerance).toEqual({possible:false,certain:false});
 });
 it('retains interior cross-return despite positive endpoint gaps',()=>{
 const f=fixture(.5,{x:0,y:-1,z:0},0,4);const r=inspectMaterialPlane(f.candidate);contains(r.roots,2-Math.sqrt(3));contains(r.roots,2+Math.sqrt(3));expect(r.penetrationBeyondTolerance.certain).toBe(true);expect(r.status).not.toBe('clear');
 });
 it('keeps double grazing ambiguous without claiming penetration beyond tolerance',()=>{
 const r=inspectMaterialPlane(fixture(1,{x:0,y:-1,z:0},0,2).candidate);contains(r.roots,1);expect(r.status).toBe('ambiguous');expect(r.penetrationBeyondTolerance.certain).toBe(false);expect(r.penetrationBeyondTolerance.possible).toBe(false);
 });
 it('does not misclassify zero-derivative triple crossing as a grazing proof',()=>{
 const r=inspectMaterialPlane(fixture(2,{x:0,y:-1,z:-1},-1,2).candidate);contains(r.roots,1);expect(r.penetrationBeyondTolerance.certain).toBe(true);expect(r.roots.every(b=>['entering','leaving','ambiguous'].includes(b.kind))).toBe(true);
 });
 it('does not label a wide merged triple-root enclosure as a resolved event time',()=>{
 const r=inspectMaterialPlane(fixture(2,{x:0,y:-1,z:-1},-1,2).candidate,{timeTolerance:1e-8});contains(r.roots,1);expect(r.maxBracketWidth).toBeGreaterThan(1e-8);expect(r.timeResolutionMet).toBe(false);expect(r.status).toBe('ambiguous');const tiny=inspectMaterialPlane(fixture(2,{x:0,y:-1,z:-1},-2e12,1e-12,{x:4e12,y:0,z:0}).candidate,{timeTolerance:1e-20});expect(tiny.timeResolutionMet).toBe(false);
 });
 it('retains every one of three distinct crossings',()=>{
 const r=inspectMaterialPlane(fixture(51/64,{x:0,y:5/32,z:-45/64},-1,1).candidate);for(const t of [.25,.5,.75])contains(r.roots,t);expect(r.roots).toHaveLength(3);expect(r.timeResolutionMet).toBe(true);expect(r.maxBracketWidth).toBeLessThanOrEqual(1e-8+16*Number.EPSILON);
 });
 it('reports exact coincidence separately from an isolated root',()=>{
 const r=inspectMaterialPlane(fixture(0,{x:0,y:0,z:0},0,1,{x:0,y:0,z:0}).candidate);expect(r.status).toBe('coincident');expect(r.roots).toEqual([]);const material=inspectMaterialPlane(fixture(1,{x:0,y:0,z:-1},0,1,{x:0,y:0,z:0}).candidate);expect(material.status).toBe('coincident');
 });
 it('preserves candidate roots under plane translation, positive scaling and proper coordinate rotation',()=>{
 const f=fixture(.5,{x:0,y:-1,z:0},0,4);const b=structuredClone(f.before),a=structuredClone(f.after);b.position.z+=10;a.position.z+=10;
 const translated=createMaterialPlaneCandidate(b,a,4,f.local,{normal:{x:0,y:0,z:7},height:70});const report=inspectMaterialPlane(translated);contains(report.roots,2-Math.sqrt(3));contains(report.roots,2+Math.sqrt(3));expect(report.penetrationBeyondTolerance.certain).toBe(true);
 const rotate=(v:Vec3):Vec3=>({x:v.z,y:v.x,z:v.y});
 const rb={...f.before,position:rotate(f.before.position),velocity:rotate(f.before.velocity),angularMomentum:rotate(f.before.angularMomentum),basis:f.before.basis.map(rotate) as MaterialRigidState['basis']};
 const ra=rigidMidpointState(rb,4,rb.velocity,rb.angularMomentum);const rotated=inspectMaterialPlane(createMaterialPlaneCandidate(rb,ra,4,f.local,{normal:rotate(plane.normal),height:0}));contains(rotated.roots,2-Math.sqrt(3));contains(rotated.roots,2+Math.sqrt(3));
 });
 it('respects axial angular velocity under reflection and normalized-time reparameterization',()=>{
 const f=fixture(.5,{x:0,y:-1,z:0},0,4);const mirrored={...f.before,angularMomentum:{x:-2,y:0,z:0}}; // y reflection reverses axial x
 const ma=rigidMidpointState(mirrored,4,mirrored.velocity,mirrored.angularMomentum);const mr=inspectMaterialPlane(createMaterialPlaneCandidate(mirrored,ma,4,{...f.local,y:-f.local.y},plane));contains(mr.roots,2-Math.sqrt(3));
 const twice=fixture(.5,{x:0,y:-1,z:0},0,8,{x:1,y:0,z:0});const tr=inspectMaterialPlane(twice.candidate);contains(tr.roots,2*(2-Math.sqrt(3)));contains(tr.roots,2*(2+Math.sqrt(3)));
 });
 it('retains near-zero topology ambiguity and rejects explicit exhausted budgets',()=>{
 const f=fixture(1,{x:0,y:-1,z:0},0,2);const short=inspectMaterialPlane(f.candidate,{maxNodes:1});expect(short.status).toBe('unsupported');expect(short.nodes).toBeLessThanOrEqual(1);expect(short.penetrationBeyondTolerance.possible).toBe(true);
 const near=fixture(1+Number.EPSILON,{x:0,y:-1,z:0},0,2);expect(inspectMaterialPlane(near.candidate).status).toBe('ambiguous');
 });
 it('reports unsupported finite overflow and keeps endpoint roots explicit',()=>{
 const huge=fixture(1,{x:0,y:0,z:1e308},0,1);expect(huge.candidate.supported).toBe(false);expect(inspectMaterialPlane(huge.candidate).status).toBe('unsupported');
 const start=inspectMaterialPlane(fixture(0,{x:0,y:0,z:0},1,1,{x:0,y:0,z:0}).candidate);contains(start.roots,0);
 const end=inspectMaterialPlane(fixture(1,{x:0,y:0,z:0},-1,1,{x:0,y:0,z:0}).candidate);contains(end.roots,1);
 });
 it('validates actual Cayley endpoints and never mutates input geometry',()=>{
 const f=fixture(1,{x:0,y:0,z:0},-2,1,{x:0,y:0,z:0});const before=structuredClone(f.before),after=structuredClone(f.after);inspectMaterialPlane(f.candidate);expect(f.before).toEqual(before);expect(f.after).toEqual(after);
 const bad=structuredClone(after);bad.position.x+=.01;expect(()=>createMaterialPlaneCandidate(before,bad,1,f.local,plane)).toThrow(RangeError);
 expect(()=>createMaterialPlaneCandidate(before,after,1,f.local,{normal:{x:0,y:0,z:0},height:0})).toThrow(RangeError);expect(()=>inspectMaterialPlane(f.candidate,{maxDepth:-1})).toThrow(RangeError);
 });
});
