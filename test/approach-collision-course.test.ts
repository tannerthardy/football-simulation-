import { describe, expect, it } from 'vitest';
import fixtures from './fixtures/approach-family.json';
import { FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Body } from '../src/physics/kinematics.js';
import type { Player } from '../src/players/types.js';
import { Agent } from '../src/sim/agent.js';
import { gatheringApproach } from '../src/sim/behaviors/common.js';
import { SnapMind } from '../src/sim/mind.js';
import type { Perceived } from '../src/sim/perception.js';

function stage(index: number, mirror = false) {
  const f = structuredClone(fixtures.rows[index]), body = f.body as Body;
  const seen = f.seen as Perceived;
  if (mirror) {
    body.pos.y = FIELD_WIDTH-body.pos.y; body.vel.y *= -1; body.facing *= -1;
    seen.pos.y = FIELD_WIDTH-seen.pos.y; seen.vel.y *= -1; seen.facing *= -1;
  }
  const player = f.actor as Player, rng = new Rng(1);
  const a = new Agent(0,'D',f.slot,player,body.profile,body,
    {kind:'idle',update:()=>({vel:{x:0,y:0}})},new SnapMind(player,rng));
  const contact = a.profile.radius+f.targetRadius+a.profile.reach*.65;
  return {f,a,seen,contact};
}

describe('gather budgets a collision, not radial closure alone', () => {
  for (const index of [0,1]) it.each([false,true])(
    `continues the acquired ${fixtures.rows[index].case} oblique interception, mirror=%s`, mirror => {
      const {a,seen,contact} = stage(index,mirror), before = structuredClone(a.body);
      const r = {x:seen.pos.x-a.pos.x,y:seen.pos.y-a.pos.y};
      const v = {x:a.vel.x-seen.vel.x,y:a.vel.y-seen.vel.y};
      // These are closing rapidly but are not heading into the contact corridor.
      expect((r.x*v.x+r.y*v.y)/Math.hypot(r.x,r.y)).toBeGreaterThan(8);
      expect(Math.abs(r.x*v.y-r.y*v.x)/Math.hypot(v.x,v.y)).toBeGreaterThan(contact+.5);
      expect(gatheringApproach(a,seen,contact,0).gather).toBe(0);
      expect(a.body).toEqual(before);
    });

  it('retains early braking for an actual head-on collision course', () => {
    const {a,seen,contact} = stage(1);
    a.body.vel={x:6,y:0};
    seen.pos={x:a.pos.x+10,y:a.pos.y};seen.vel={x:-6,y:0};
    const {near,gather}=gatheringApproach(a,seen,contact,0);
    expect(gather).toBe(1);
    expect(near).not.toBeNull();
    expect(near!.vel.x).toBeGreaterThan(0);
    expect(near!.vel.x).toBeLessThan(6);
  });

  it('retains the successful A008 close-wrap request', () => {
    const {f,a,seen,contact}=stage(2), {near,gather}=gatheringApproach(a,seen,contact,0);
    expect(gather).toBe(1);
    expect(JSON.parse(JSON.stringify(near))).toEqual(f.original);
  });
});
