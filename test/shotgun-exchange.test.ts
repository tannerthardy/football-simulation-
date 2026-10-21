import {describe, expect, it, vi} from 'vitest';
// Recorded under the default gait, pull and gun-exchange laws. GAIT_STEP,
// PULL_STEP and MESH_POINT (on in the pinned profile) change its timing or
// first command; pin them off here. test/gait-step.test.ts and
// test/pull-step.test.ts cover those laws.
vi.hoisted(() => { for (const k of ['GAIT_STEP', 'PULL_STEP', 'MESH_POINT']) process.env[k] = '0'; });
import {savedExchange} from '../scripts/diag/saved-exchange.js';
import {handoffReach} from '../src/sim/ball-transfer.js';
import {RunnerToMesh} from '../src/sim/assign.js';
import {goTo} from '../src/sim/behaviors/common.js';
import {QBHandoff} from '../src/sim/behaviors/qb.js';
import {PlaySim} from '../src/sim/playsim.js';

describe('saved shotgun exchange coordination', () => {
  it('P038 transfers in real reach when its installed window opens', () => {
    const sim = savedExchange('spread-air'), rb = sim.slot('RB')!;
    let actualDistance = Infinity;
    while (sim.t < 2 && sim.handoffAt < 0 && sim.phase === 'live') {
      const before = Math.hypot(rb.pos.x-sim.qb.pos.x, rb.pos.y-sim.qb.pos.y);
      sim.tick();
      if (sim.handoffAt >= 0) actualDistance = before;
    }
    expect(sim.handoffAt).toBe(1.05);
    expect(actualDistance).toBeLessThanOrEqual(handoffReach(sim.qb, rb));
    expect(sim.carrier).toBe(rb);
  });

  it('P069 preserves its complete current-source trajectory against only the cadence rollback', () => {
    const sim = savedExchange('west-spread');
    const control = savedExchange('west-spread'), mesh = control.slot('RB')!.behavior;
    if (!(mesh instanceof RunnerToMesh)) throw Error('Expected installed riding mesh');
    const update = mesh.update.bind(mesh);
    // Restore just the previous proximity-only transition from #57's parent.
    // Its historical experimental trajectory stays in the original fixture;
    // other controllers on accepted/current source are intentionally different.
    mesh.update = (a, current) => {
      if (Math.hypot(mesh.mesh.x-a.pos.x, mesh.mesh.y-a.pos.y) < .7) Object.assign(mesh,{passed:true});
      return update(a,current);
    };
    const result = sim.run(), old = control.run();
    expect(sim.handoffAt).toBe(1.05);
    expect(control.handoffAt).toBe(1.05);
    expect(result.frames).toEqual(old.frames);
    expect(result.events).toEqual(old.events);
    expect(result.outcome).toBe(old.outcome);
    expect(result.duration).toBe(old.duration);
    expect(result.stats).toEqual(old.stats);
  });

  it.each([-1, 1])('being near a riding landmark does not authorize early departure, side %s', side => {
    const sim = savedExchange('spread-air'), rb = sim.slot('RB')!;
    const mesh = {x: rb.pos.x + .2, y: rb.pos.y - side*.2};
    const aim = {x: rb.pos.x + 6, y: rb.pos.y + side*5};
    rb.behavior = new RunnerToMesh(mesh, 1.2, aim, true);
    sim.t = .5;
    expect(rb.behavior.update(rb, sim)).toEqual(goTo(rb, mesh, {speed: .3, through: rb.profile.vmax*.55}));
    sim.t = 1.05;
    expect(rb.behavior.update(rb, sim)).toEqual(goTo(rb, aim, {speed: .55, through: rb.profile.vmax*.55}));
    expect(sim.carrier).toBe(sim.qb);
  });

  it('preserves a declared QB keeper instead of recovering toward a back', () => {
    const sim: PlaySim = savedExchange('spread-air'), qb=sim.qb;
    qb.behavior=new QBHandoff({...qb.pos},1,null,0,true);sim.t=1;
    // The experimental parent declares this API; accepted develop does not.
    // Install the same tripwire without importing that parent's awareness code.
    Object.assign(sim,{teammateInformation:()=>{throw Error('Keeper has no exchange to recover');}});
    qb.behavior.update(qb,sim);
    expect(sim.stats.rusher).toBe(qb.player.id);expect(sim.carrier).toBe(qb);
    expect(qb.behavior.kind).toBe('carrier');expect(sim.handoffAt).toBe(-1);
  });
});
