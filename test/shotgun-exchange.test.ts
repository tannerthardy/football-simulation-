import {createHash} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import {savedExchange, savedExchanges} from '../scripts/diag/saved-exchange.js';
import {handoffReach} from '../src/sim/ball-transfer.js';
import {RunnerToMesh} from '../src/sim/assign.js';
import {goTo} from '../src/sim/behaviors/common.js';
import {QBHandoff} from '../src/sim/behaviors/qb.js';
import {PlaySim} from '../src/sim/playsim.js';

const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');

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

  it('P069 retains its complete successful native trajectory and events', () => {
    const sim = savedExchange('west-spread');
    const result = sim.run(), old = savedExchanges.inputs.find((r: {id: string}) => r.id === 'west-spread').original;
    expect(sim.handoffAt).toBe(1.05);
    expect(hash(result.frames)).toBe(old.frameSha256);
    expect(hash(result.events)).toBe(old.eventsSha256);
    expect(result.outcome).toBe(old.outcome);
    expect(result.duration).toBe(old.duration);
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
    sim.teammateInformation=()=>{throw Error('Keeper has no exchange to recover');};
    qb.behavior.update(qb,sim);
    expect(sim.stats.rusher).toBe(qb.player.id);expect(sim.carrier).toBe(qb);
    expect(qb.behavior.kind).toBe('carrier');expect(sim.handoffAt).toBe(-1);
  });
});
