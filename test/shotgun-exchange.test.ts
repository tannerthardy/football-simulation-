import {createHash} from 'node:crypto';
import {describe, expect, it} from 'vitest';
import {savedExchange, savedExchanges} from '../scripts/diag/saved-exchange.js';
import {handoffReach} from '../src/sim/ball-transfer.js';
import {RunnerToMesh} from '../src/sim/assign.js';
import {goTo, angleTo} from '../src/sim/behaviors/common.js';
import {QBHandoff} from '../src/sim/behaviors/qb.js';
import {PlaySim} from '../src/sim/playsim.js';
import {World} from '../src/physics/world.js';

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

  it('recovers toward one acquired displaced-back picture without using hidden body/job truth', () => {
    const sim = savedExchange('spread-air'), qb = sim.qb, rb = sim.slot('RB')!;
    const mesh = {...qb.pos}, picture = {source: 'observed' as const,
      pos: {x: mesh.x+2, y: mesh.y+.3}, vel: {x: 1, y: .2},
      sampledAt: 1, availableAt: 1.2, age: .2, predictedFor: .2};
    sim.t = 1.2;
    let queries = 0;
    sim.teammateInformation = (a,b) => {expect(a).toBe(qb); expect(b).toBe(rb); queries++; return structuredClone(picture);};
    sim.see = () => {throw Error('Cannot refresh through legacy see');};
    const lead = {x: picture.pos.x+.2, y: picture.pos.y+.04};
    const body = structuredClone(qb.body), rng = structuredClone(sim.rng);
    for (const x of [mesh.x+8, mesh.x-8]) {
      rb.body.pos.x=x;
      rb.behavior={kind:'private-new-job',update:()=>{throw Error('Cannot query hidden future job');}};
      expect(qb.behavior.update(qb,sim)).toEqual(goTo(qb, lead, {speed:1, facing:angleTo(qb.pos,lead), through:qb.profile.vmax*.55}));
      expect(sim.carrier).toBe(qb);
    }
    expect(queries).toBe(2);
    expect(qb.body).toEqual(body); expect(structuredClone(sim.rng)).toEqual(rng);
  });

  it.each([.95, 1.2])('unavailable displaced-back information cannot create a recovery target at %s', t => {
    const sim = savedExchange('spread-air'), qb = sim.qb, rb = sim.slot('RB')!;
    const mesh = {...qb.pos}; rb.body.pos.x+=8; sim.t=t;
    sim.teammateInformation=()=>({source:'unavailable'});
    expect(qb.behavior.update(qb,sim)).toEqual(goTo(qb,mesh,{speed:1,facing:angleTo(qb.pos,mesh),through:qb.profile.vmax*.55}));
    expect(sim.carrier).toBe(qb);
  });

  it('can physically recover to an acquired stationary back after a missed window', () => {
    // Local capability witness: two ordinary bodies; no native defensive
    // outcome is inferred from removing the other twenty players.
    const sim=savedExchange('spread-air'), qb=sim.qb, rb=sim.slot('RB')!;
    rb.body.pos={x:qb.pos.x+2,y:qb.pos.y};rb.body.vel={x:0,y:0};
    const world=new World([qb.body,rb.body]);
    let distance=Infinity;
    for(let k=0;k<40&&sim.carrier===qb;k++) {
      sim.t=1.2+k*.05;world.time=sim.t;
      sim.perception.record(sim.agents,sim.carrier?.idx??null);
      sim.teammateAwareness.sense(sim.agents,sim.t,sim.dt);
      distance=Math.hypot(qb.pos.x-rb.pos.x,qb.pos.y-rb.pos.y);
      const command=qb.behavior.update(qb,sim);
      if(sim.carrier!==qb)break;
      world.step([command,{vel:{x:0,y:0}}],.05);
    }
    expect(sim.carrier).toBe(rb);
    expect(distance).toBeLessThanOrEqual(handoffReach(qb,rb));
    expect(sim.handoffAt).toBeGreaterThan(1.2);
  });

  it.each([false,true])('retains the landmark gate before cadence or on non-riding exchanges, ride=%s', ride => {
    const sim = savedExchange('spread-air'), qb=sim.qb, rb=sim.slot('RB')!, mesh={...qb.pos};
    qb.behavior=new QBHandoff(mesh,1.2,rb,0,false,ride);rb.body.pos.x+=8;sim.t=ride?.95:1.5;
    sim.teammateInformation=()=>({source:'observed',pos:{x:mesh.x+2,y:mesh.y},vel:{x:1,y:0},sampledAt:.7,availableAt:.95,age:.25,predictedFor:.25});
    expect(qb.behavior.update(qb,sim)).toEqual(goTo(qb,mesh,{speed:1,facing:angleTo(qb.pos,mesh),through:ride?qb.profile.vmax*.55:0}));
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
