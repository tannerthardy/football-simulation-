import {describe,expect,it} from 'vitest';
import {meshExperiment} from '../scripts/diag/run-tempo-mesh.js';

describe('inside-zone mesh is an exchange on the move',()=>{
 it('preserves identical starting bodies and earns an earlier moving transfer',()=>{
  const old=meshExperiment(false,0),next=meshExperiment(null,0);
  expect(next.initial).toEqual(old.initial);expect(next.installedRolling).toBe(true);
  expect(next.handoff).not.toBeNull();expect(old.handoff).not.toBeNull();
  expect(next.handoff!.t).toBeLessThan(old.handoff!.t);
  expect(next.handoff!.rbSpeed).toBeGreaterThan(old.handoff!.rbSpeed);
  expect(next.handoff!.distance).toBeLessThanOrEqual(next.handoff!.physicalReach);
 });
 it('reacts to a genuinely delayed QB without a distant timed transfer',()=>{
  const clear=meshExperiment(null,0),delayed=meshExperiment(null,1),stopped=meshExperiment(null,4);
  expect(delayed.handoff!.t).toBeGreaterThan(clear.handoff!.t);
  expect(delayed.handoff!.distance).toBeLessThanOrEqual(delayed.handoff!.physicalReach);
  expect(stopped.handoff).toBeNull();
 });
 it.each(['counter','trap','duo','draw'])('preserves the installed stopping approach for %s',concept=>{
  const old=meshExperiment(false,0,concept),next=meshExperiment(null,0,concept);
  expect(next.installedRolling).toBe(false);expect(next.frames).toEqual(old.frames);
 });
});

