import{readFileSync}from'node:fs';
import{describe,expect,it}from'vitest';
import{chooseRunApproach}from'../src/sim/run-approach.js';
const cases=JSON.parse(readFileSync(new URL('./fixtures/run-entry-approach.json',import.meta.url),'utf8'));
describe('run-entry approach uncertainty',()=>{
 it('compares fast, slower and gather from one unchanged body and acquired picture',()=>{
  const s=structuredClone(cases.failing),before=structuredClone(s),r=chooseRunApproach(s.body,s.command,s.peers,s.t,'center');
  expect(r.choices[0].minimumGap).toBeLessThan(0);expect(r.choices[1].minimumGap).toBeLessThan(0);
  expect(r.kind).toBe('gather');expect(r.minimumGap).toBeGreaterThan(0);expect(r.up).toBe(true);
  expect(s).toEqual(before);
 });
 it('retains the genuine clear-route fast request exactly, despite acquired-picture age',()=>{
  const s=structuredClone(cases.clear),r=chooseRunApproach(s.body,s.command,s.peers,s.t,'center');
  expect(r.kind).toBe('fast');expect(r.minimumGap).toBeGreaterThan(0);expect(r.command).toBe(s.command);
 });
 it('does not inflate the radius of a stationary teammate beside a clear lane',()=>{
  const s=structuredClone(cases.failing),rg=s.peers.find((p:any)=>p.id===5);
  s.body.vel={x:0,y:0};s.body.facing=0;s.body.spin=0;
  s.command.vel={x:s.body.profile.vmax,y:0};
  rg.picture.vel={x:0,y:0};
  rg.picture.pos={x:s.body.pos.x+1,y:s.body.pos.y+.9*(s.body.profile.radius+rg.radius)+.02};
  const r=chooseRunApproach(s.body,s.command,[rg],s.t,'center');
  expect(r.choices[0].minimumGap).toBeGreaterThan(0);expect(r.kind).toBe('fast');
 });
});
