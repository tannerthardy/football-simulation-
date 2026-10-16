import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/approach-family.json';
import { FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { World } from '../src/physics/world.js';
import type { Body, MoveCommand } from '../src/physics/kinematics.js';
import type { Player } from '../src/players/types.js';
import { Agent } from '../src/sim/agent.js';
import { SnapMind } from '../src/sim/mind.js';
import type { RunFitJob } from '../src/sim/run-fits.js';
import { chooseGatherApproach } from '../src/sim/approach-control.js';
import { leverage } from '../src/sim/behaviors/common.js';
import type { Perceived } from '../src/sim/perception.js';

function stage(index: number, mirror = false) {
  const f = structuredClone(fixtures.rows[index]), body = f.body as Body;
  if (mirror) {
    body.pos.y = FIELD_WIDTH-body.pos.y; body.vel.y *= -1; body.facing *= -1;
    f.seen.pos.y = FIELD_WIDTH-f.seen.pos.y; f.seen.vel.y *= -1; f.seen.facing *= -1;
    f.original.vel.y *= -1;
    if (f.original.facing !== undefined) f.original.facing *= -1;
    f.runFit.side *= -1;
  }
  const player = f.actor as Player, rng = new Rng(1);
  const a = new Agent(0,'D',f.slot,player,body.profile,body,
    {kind:'idle',update:()=>({vel:{x:0,y:0}})},new SnapMind(player,rng));
  a.runFit = f.runFit as RunFitJob;
  const seen = f.seen as Perceived, original = f.original as MoveCommand;
  const contact = a.profile.radius+f.targetRadius+a.profile.reach*.65;
  const distance = Math.hypot(seen.pos.x-a.pos.x,seen.pos.y-a.pos.y);
  const offset = leverage(a,seen.pos.y)*Math.max(0,Math.min(1,(distance-contact)/6));
  return {f,a,seen,original,contact,offset};
}

function achievedClosest(body: Body, command: MoveCommand, seen: Perceived, now: number) {
  const b = structuredClone(body), world = new World([b]); world.time = now;
  let closest = Math.hypot(b.pos.x-seen.pos.x,b.pos.y-seen.pos.y);
  for (let k=1;k<=12;k++) {
    const report = world.step([command],.05);
    expect(report.contacts).toHaveLength(0);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    expect(b.support!.state).toBe('up');
    closest = Math.min(closest,Math.hypot(b.pos.x-seen.pos.x-seen.vel.x*k*.05,
      b.pos.y-seen.pos.y-seen.vel.y*k*.05));
  }
  return closest;
}

describe('full gather preserves an attainable moving interception', () => {
  for (const index of [0,1]) it.each([false,true])(`executes the acquired ${fixtures.rows[index].case} entry, mirror=%s`, mirror => {
    const {f,a,seen,original,contact,offset} = stage(index,mirror), before = structuredClone(a.body);
    const command = chooseGatherApproach(a,seen,contact,offset,original,f.now);
    const ordinary = achievedClosest(a.body,original,seen,f.now);
    const candidate = achievedClosest(a.body,command,seen,f.now);
    const arms = a.profile.radius+f.targetRadius+a.profile.reach;
    expect(ordinary).toBeGreaterThan(arms);
    expect(candidate).toBeLessThan(arms);
    expect(candidate+.1).toBeLessThan(ordinary);
    expect(Math.hypot(command.vel.x,command.vel.y)).toBeLessThanOrEqual(a.profile.vmax*a.speedScale+1e-10);
    expect(a.body).toEqual(before);
  });

  it('preserves A008’s already available close wrap request', () => {
    const {f,a,seen,original,contact,offset} = stage(2);
    expect(chooseGatherApproach(a,seen,contact,offset,original,f.now)).toBe(original);
  });

  it('leaves a loaded or falling approach with its existing owner', () => {
    for (const constraint of ['load','falling'] as const) {
      const {f,a,seen,original,contact,offset} = stage(0);
      if (constraint==='load') a.body.support!.load={x:10,y:0};
      else a.body.support!.state='falling';
      expect(chooseGatherApproach(a,seen,contact,offset,original,f.now)).toBe(original);
    }
  });
});
