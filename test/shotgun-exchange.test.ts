import {describe, expect, it} from 'vitest';
import {savedExchange} from '../scripts/diag/saved-exchange.js';
import {handoffReach} from '../src/sim/ball-transfer.js';
import {RunnerToMesh} from '../src/sim/assign.js';
import {goTo} from '../src/sim/behaviors/common.js';
import {QBHandoff} from '../src/sim/behaviors/qb.js';
import {PlaySim} from '../src/sim/playsim.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

describe('saved shotgun exchange coordination', () => {
  it('P038 transfers in real reach when its installed window opens', () => {
    const sim = savedExchange('spread-air'), rb = sim.slot('RB')!;
    let actualDistance = Infinity;
    while (sim.t < 2 && sim.handoffAt < 0 && sim.phase === 'live') {
      const before = Math.hypot(rb.pos.x-sim.qb.pos.x, rb.pos.y-sim.qb.pos.y);
      sim.tick();
      if (sim.handoffAt >= 0) actualDistance = before;
    }
    // The back now leaves on his own start for the installed 1.2 s exchange
    // rather than standing in reach early, so the give lands inside the
    // window at 1.2, not on its opening tick (was 1.05).
    const mesh = rb.behavior instanceof RunnerToMesh ? rb.behavior : null;
    expect(sim.handoffAt).toBeGreaterThanOrEqual(1.05);
    expect(sim.handoffAt).toBeLessThanOrEqual(1.2);
    expect(actualDistance).toBeLessThanOrEqual(handoffReach(sim.qb, rb));
    expect(sim.carrier).toBe(rb);
    expect(mesh).toBeNull();
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
    const stage = (qbInHands: boolean) => {
      const sim = savedExchange('spread-air'), rb = sim.slot('RB')!;
      const mesh = {x: rb.pos.x + .2, y: rb.pos.y - side*.2};
      const aim = {x: rb.pos.x + 6, y: rb.pos.y + side*5};
      // The QB as the back sees him: at the landmark, or yards away from it.
      sim.qb.body.pos = qbInHands ? {x: mesh.x - .3, y: mesh.y + side*.5} : {x: mesh.x - 4, y: mesh.y + side*3};
      sim.qb.body.vel = {x: 0, y: 0};
      for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
      rb.behavior = new RunnerToMesh(mesh, 1.2, aim, true);
      return {sim, rb, aim};
    };
    const rides = (f: ReturnType<typeof stage>) => {
      const c = f.rb.behavior.update(f.rb, f.sim);
      return Reflect.get(f.rb.behavior, 'passed') === true
        && JSON.stringify(c) === JSON.stringify(goTo(f.rb, f.aim, {speed: .55, through: f.rb.profile.vmax*.55}));
    };
    // Early, beside the landmark with the QB there: he does not leave for the aim.
    const early = stage(true);
    early.sim.t = .5;
    expect(rides(early)).toBe(false);
    // In the window with the QB in his hands he rides through; with the QB away he does not.
    const ready = stage(true);
    ready.sim.t = 1.05;
    expect(ready.rb.behavior.update(ready.rb, ready.sim)).toEqual(goTo(ready.rb, ready.aim, {speed: .55, through: ready.rb.profile.vmax*.55}));
    const away = stage(false);
    away.sim.t = 1.05;
    expect(rides(away)).toBe(false);
    expect(ready.sim.carrier).toBe(ready.sim.qb);
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
