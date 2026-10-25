import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { cornerSpeed } from '../src/physics/kinematics.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunnerToMesh } from '../src/sim/assign.js';
import { handoffReach } from '../src/sim/ball-transfer.js';
import { createEngagement } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';

const o = generateTeam(new Rng(11), 'O', 'O', { strength: .55 });
const d = generateTeam(new Rng(12), 'D', 'D', { strength: .55 });
function make(form = 'gun_doubles_11', concept = 'wz_strong', flip = false) {
  const formation = FORMATION_BY_ID[form];
  return new PlaySim({ offense: pickOffense(o, formation.personnel), defense: pickDefense(d, 'base43'),
    offCall: { formation, kind: 'run', flip, run: RUN_BY_ID[concept], label: concept },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'c3' },
    los: 40, ballY: 26.67, firstDownX: 50, seed: 77 });
}

describe('ball transfers require reachable geometry', () => {
  it('cannot hand the ball to a distant or downed teammate', () => {
    const sim = make(), rb = sim.slot('RB')!;
    rb.body.pos = { x: sim.qb.pos.x+5, y: sim.qb.pos.y };
    expect(sim.handoff(sim.qb, rb)).toBe(false);
    expect(sim.carrier).toBe(sim.qb);
    rb.body.pos = { x: sim.qb.pos.x+.8, y: sim.qb.pos.y };
    rb.downUntil = 10;
    expect(sim.handoff(sim.qb, rb)).toBe(false);
    rb.downUntil = 0;
    expect(sim.handoff(sim.qb, rb)).toBe(true);
    expect(sim.carrier).toBe(rb);
  });

  it('an expired mesh time cannot force a transfer or send the back downfield', () => {
    const sim = make(), rb = sim.slot('RB')!, mesh = rb.behavior as RunnerToMesh;
    rb.body.pos = { x: mesh.mesh.x+4, y: mesh.mesh.y };
    sim.t = mesh.meshTime+2;
    sim.qb.behavior.update(sim.qb, sim);
    expect(sim.carrier).toBe(sim.qb);
    expect(mesh.update(rb,sim).vel.x).toBeLessThan(0);
  });

  it.each(['ace_11', 'pistol_11', 'gun_doubles_11'])('meshes physically in %s in both directions', form => {
    for (const flip of [false,true]) {
      const sim = make(form, 'wz_strong', flip), rb = sim.slot('RB')!;
      // Isolate timing and exchange from defender penetration.
      for (const a of sim.defense) a.downUntil = 99;
      let distance: number | undefined;
      while (sim.t < 4 && sim.handoffAt < 0 && sim.phase === 'live') {
        const before = Math.hypot(sim.qb.pos.x-rb.pos.x,sim.qb.pos.y-rb.pos.y);
        sim.tick();
        if (sim.handoffAt >= 0) distance = before;
      }
      expect(distance).toBeDefined();
      expect(distance!).toBeLessThanOrEqual(handoffReach(sim.qb,rb));
    }
  });

  it('a toss travels through space before a catch and is recorded as a run', () => {
    const sim = make(), rb = sim.slot('RB')!;
    for (const a of sim.agents) {
      a.snapReadyAt=0;
      a.behavior={kind:'idle',update:()=>({vel:{x:0,y:0},facing:a.facing})};
      if (a!==rb && a!==sim.qb) a.body.pos={x:60+a.idx,y:3};
    }
    sim.qb.body.pos={x:30,y:26};rb.body.pos={x:29,y:30};
    expect(sim.pitchBall(sim.qb,rb)).toBe(true);
    expect(sim.ball.kind).toBe('pitch');expect(sim.carrier).toBeNull();
    const start = {...sim.ballPos()};
    sim.tick();
    expect(sim.ballPos()).not.toEqual(start);expect(sim.carrier).toBeNull();
    while (sim.t<1 && !sim.carrier) sim.tick();
    expect(sim.carrier).toBe(rb);
    expect(sim.stats.attempted).toBe(false);expect(sim.stats.completed).toBe(false);
    expect(sim.stats.rusher).toBe(rb.player.id);
    expect(sim.events.some(e=>e.type==='pitch_catch')).toBe(true);
  });

  it('a missed pitch becomes a live loose ball, never an incomplete pass', () => {
    const sim = make(), rb=sim.slot('RB')!;
    for (const a of sim.agents) a.behavior={kind:'idle',update:()=>({vel:{x:0,y:0}})};
    sim.pitchBall(sim.qb,rb);
    if (sim.ball.kind!=='pitch') throw new Error('Missing pitch');
    sim.ball.flight.pos={x:60,y:2,z:.01};sim.ball.flight.vel={x:0,y:0,z:-1};
    sim.tick();
    expect(sim.ball.kind).toBe('loose');expect(sim.outcome).not.toBe('incomplete');
  });

  it('an opponent catching a backward pitch recovers a fumble rather than intercepting a pass', () => {
    const sim=make(), rb=sim.slot('RB')!, defender=sim.defense[0];
    for(const a of sim.agents){
      a.snapReadyAt=0;
      a.behavior={kind:'idle',update:()=>({vel:{x:0,y:0},facing:a.facing})};
      a.body.pos={x:60+a.idx,y:3};
    }
    sim.qb.body.pos={x:30,y:26};rb.body.pos={x:29,y:30};
    defender.body.pos={x:29.5,y:28};
    sim.pitchBall(sim.qb,rb);
    while(sim.t<1 && !sim.carrier) sim.tick();
    expect(sim.carrier).toBe(defender);
    expect(sim.stats.attempted).toBe(false);
    expect(sim.stats.fumbledBy).toBe(sim.qb.player.id);
    expect(sim.stats.fumbleLost).toBe(true);
    expect(sim.stats.fumbleRecoveredBy).toBe(defender.player.id);
    expect(sim.events.some(e=>e.type==='interception')).toBe(false);
    expect(sim.events.some(e=>e.type==='recovery')).toBe(true);
  });
});

describe('snap motor response and observable contact', () => {
  it('gates free controller movement until its snap response', () => {
    const sim=make(), a=sim.slot('DT_S')!;
    for (const p of sim.agents) p.behavior={kind:'idle',update:()=>({vel:{x:0,y:0},facing:p.facing})};
    a.snapReadyAt=.2;
    let calls=0;
    a.behavior={kind:'test',update:()=>{calls++;return {vel:{x:-5,y:0},facing:Math.PI};}};
    const x=a.pos.x;
    for(let i=0;i<4;i++)sim.tick();
    expect(calls).toBe(0);expect(a.pos.x).toBeCloseTo(x,8);
    sim.tick();expect(calls).toBe(1);expect(a.vel.x).toBeLessThan(0);
  });

  it('does not call hand acquisition a block before it carries load', () => {
    const sim=make(), b=sim.slot('RG')!, a=sim.slot('DT_S')!;
    for(const p of sim.agents){p.snapReadyAt=0;p.behavior={kind:'idle',update:()=>({vel:{x:0,y:0},facing:p.facing})};}
    b.body.pos={x:35,y:26};a.body.pos={x:35+b.profile.radius+a.profile.radius,y:26};
    createEngagement(sim,b,a,'run',{x:1,y:0});
    expect(sim.events.filter(e=>e.type==='block_contact')).toHaveLength(0);
    sim.tick();sim.tick();
    const contacts=sim.events.filter(e=>e.type==='block_contact');
    expect(contacts).toHaveLength(1);expect(contacts[0].t).toBeGreaterThan(0);
  });

  it('does not let teammate avoidance initiate leg drive before snap response', () => {
    const sim=make(), a=sim.slot('DT_S')!, teammate=sim.slot('DT_W')!;
    for(const p of sim.agents){p.snapReadyAt=0;p.behavior={kind:'idle',update:()=>({vel:{x:0,y:0},facing:p.facing})};}
    a.snapReadyAt=.3;a.body.pos={x:60,y:26};
    teammate.body.pos={x:60.8,y:26};teammate.body.vel={x:-5,y:0};
    sim.tick();
    // Incoming contact may move him; his controller still requests no drive.
    expect(sim.intents[a.idx].vel).toEqual({x:0,y:0});
    expect(sim.intents[a.idx].push).toBe(0);
  });
});

describe('puller corner planning uses the same body limits', () => {
  it('brakes a sharp corner earlier than a straight path, identically mirrored', () => {
    const b=make().slot('LG')!.body;b.pos={x:0,y:0};
    const corner={x:0,y:3};
    const straight=cornerSpeed(b,corner,{x:0,y:6},.65);
    const sharp=cornerSpeed(b,corner,{x:2,y:3},.65);
    expect(sharp).toBeLessThan(straight);
    expect(sharp*sharp/.65).toBeLessThanOrEqual(b.profile.lateral);
    expect(cornerSpeed(b,{x:0,y:-3},{x:2,y:-3},.65)).toBeCloseTo(sharp,10);
  });
});
