import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {PlaySim,type PlaySetup} from '../src/sim/playsim.js';
import {PassRusher,runFit} from '../src/sim/behaviors/defense.js';
import {pursuitPoint,runThrough} from '../src/sim/behaviors/common.js';
const fixture=JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/power-edge-snap.json.gz',import.meta.url))).toString())as{setup:PlaySetup};
function scene(flip=false){const setup=structuredClone(fixture.setup);setup.offCall.flip=flip;const sim=new PlaySim(setup);sim.t=.35;return sim;}
afterEach(()=>vi.restoreAllMocks());

describe('installed power-edge entry before a run/pass declaration',()=>{
 it.each([false,true])('enters its called outside gap rather than crossing inside to the QB, flip=%s',flip=>{
  const sim=scene(flip),a=sim.slot('DE_S')!,rush=a.behavior as PassRusher;
  expect(rush.plan).toBe('power');expect(a.runFit!.kind).toBe('edge');expect(a.recog!.read).toBe('unsure');
  const before=structuredClone(a.body),rng=JSON.stringify(sim.rng),command=rush.update(a,sim);
  expect(command.vel.x).toBeLessThan(0);expect(command.vel.y*a.runFit!.side).toBeGreaterThan(0);
  expect(Math.hypot(command.vel.x,command.vel.y)).toBeCloseTo(a.profile.vmax,12);
  expect(a.body).toEqual(before);expect(JSON.stringify(sim.rng)).toBe(rng);
 });
 it('does not learn the offensive call or hidden runner intent from the new entry objective',()=>{
  const sim=scene(),a=sim.slot('DE_S')!,first=a.behavior.update(a,sim);
  sim.isPass=!sim.isPass;sim.offCall.kind='pass';sim.slot('RB')!.body.pos={x:95,y:5};sim.slot('RB')!.body.vel={x:9,y:4};
  expect(a.behavior.update(a,sim)).toEqual(first);expect(a.recog!.read).toBe('unsure');
 });
 it('keeps the original power pursuit after the existing line-entry boundary',()=>{
  const sim=scene(),a=sim.slot('DE_S')!;a.body.pos.x=sim.los-.6;
  const expected=runThrough(a,pursuitPoint(sim,a,sim.qb,1.5),{speed:1});
  expect(a.behavior.update(a,sim)).toEqual(expected);
 });
 it('keeps an interior power rusher on its existing QB approach',()=>{
  const sim=scene(),a=sim.slot('DT_S')!;expect((a.behavior as PassRusher).plan).toBe('power');
  const expected=runThrough(a,pursuitPoint(sim,a,sim.qb,1.5),{speed:1});expect(a.behavior.update(a,sim)).toEqual(expected);
 });
 it('does not replace an already acquired run fit with a rush lane',()=>{
  const sim=scene(),a=sim.slot('DE_S')!;a.recog!.read='run';
  const expected=runFit(a,sim,a.runFit!.gap,a.runFit!.side);expect(a.behavior.update(a,sim)).toEqual(expected);
 });
 it('does not bypass the accepted snap response or alter loaded contact',()=>{
  const sim=scene(),a=sim.slot('DE_S')!,ready=a.snapReadyAt;sim.t=0;
  const see=vi.spyOn(sim,'see');expect(a.behavior.update(a,sim).vel).toEqual({x:0,y:0});expect(see).not.toHaveBeenCalled();
  sim.t=.35;const y=sim.slot('Y')!;y.body.pos={x:a.pos.x-.65,y:a.pos.y};
  const e=sim.engage(y,a,'run',{x:1,y:0});expect(e).not.toBeNull();const hands=e!.hands,rng=JSON.stringify(sim.rng);see.mockClear();
  expect(a.behavior.update(a,sim).vel).toEqual({x:0,y:0});expect(see).not.toHaveBeenCalled();
  expect(e!.hands).toBe(hands);expect(a.snapReadyAt).toBe(ready);expect(JSON.stringify(sim.rng)).toBe(rng);
 });
});
