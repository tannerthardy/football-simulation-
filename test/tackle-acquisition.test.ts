import { afterEach, describe, expect, it, vi } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { PlaySim } from '../src/sim/playsim.js';
import { tryTackles } from '../src/sim/tackle.js';
import { diveProgress, handSpan, LAYOUT_SHARE, legTarget, tackleReach, TRAILING_FOOT_SHARE } from '../src/sim/tackle-geometry.js';
import { World, type Intent } from '../src/physics/world.js';

function stage(target = 'Z', side = 1) {
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3_buzz', concept: 'curl_flat', seed: 1,
    roster: 7, formation: 'gun_doubles_11', flip: false }));
  const d = sim.slot('FS')!, c = sim.slot(target)!;
  for (const a of sim.agents) {
    a.body.pos = { x: 5, y: a.idx * 3 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99;
    a.behavior = { kind: 'fixture', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  c.downUntil = d.downUntil = -1;
  d.body.pos = { x: 50, y: 26 }; d.body.facing = side > 0 ? 0 : Math.PI;
  const reach = tackleReach(d.profile, c.profile);
  c.body.pos = { x: 50 + side * (reach - .01), y: 26 }; c.body.facing = d.facing;
  sim.t = sim.world.time = 2; sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  const command: Intent = { vel: { x: 0, y: 0 }, facing: d.facing };
  return { sim, d, c, reach, command, side };
}

function seeMoving(f: ReturnType<typeof stage>) {
  const { sim, c } = f;
  for (let k = 0; k < 24; k++) {
    const lag = (23 - k) * sim.dt;
    sim.perception.record(sim.agents.map(a => ({ pos: { x: a.pos.x - a.vel.x * lag,
      y: a.pos.y - a.vel.y * lag }, vel: a.vel, facing: a.facing, pose: a.pose })), c.idx);
  }
}

afterEach(() => vi.restoreAllMocks());

describe('tackle contact admission and retained span', () => {
  it.each(['QB', 'Z'])('admits reachable standing contact on %s without counting the holder radius twice', target => {
    const f = stage(target); vi.spyOn(f.sim.rng, 'chance').mockReturnValue(false);
    tryTackles(f.sim);
    const hold = f.sim.bond!.holds!.get(f.d)!;
    expect(hold.hold).toBeCloseTo(f.reach - .01, 10);
    expect(hold.reach).toBe(f.d.profile.reach + f.c.profile.radius);
    expect(hold.ground).toBe(hold.reach);
    expect(hold.force ?? 0).toBe(0);
  });

  it.each(['QB', 'Z'])('cannot acquire outside the arm envelope on %s, even with favorable technique', target => {
    const f = stage(target); f.c.body.pos.x = f.d.pos.x + f.reach + .01;
    // Escape commits a real motion rather than bypassing the physical gate.
    f.c.body.vel.x = 3;
    const rng = vi.spyOn(f.sim.rng, 'chance').mockReturnValue(false);
    const before = structuredClone(f.d.body);
    tryTackles(f.sim);
    expect(f.sim.bond).toBeNull(); expect(f.sim.world.joints).toHaveLength(0);
    expect(rng).not.toHaveBeenCalled(); expect(f.d.body).toEqual(before);
  });

  it.each(['QB', 'Z'].flatMap(target => [-1, 1].map(side => ({ target, side }))))(
    'a $target closing reach is a step: it acquires at standing span only after World moves him, mirror=$side', ({ target, side }) => {
      const f = stage(target, side), { sim, c, d, reach } = f;
      c.body.pos.x = d.pos.x + side * (reach + .005);
      d.body.vel.x = side * 6; c.body.vel.x = side * 6.2;
      f.command = { vel: { x: side * 5.5, y: 0 }, facing: d.facing };
      sim.intents[d.idx] = f.command;
      d.behavior = { kind: 'fixture-pursuit', update: () => f.command };
      c.behavior = { kind: 'carrier', update: () => ({ vel: { x: side * 6.2, y: 0 }, facing: c.facing }) };
      seeMoving(f);
      const rolls = vi.spyOn(sim.rng, 'chance').mockReturnValue(false);
      const step = vi.spyOn(sim, 'lungeAt'), launch = vi.spyOn(sim, 'diveAt');
      const before = structuredClone(d.body);
      tryTackles(sim);
      expect(step).toHaveBeenCalledOnce(); expect(launch).not.toHaveBeenCalled();
      expect(sim.bond).toBeNull(); expect(rolls).not.toHaveBeenCalled(); expect(d.body).toEqual(before);
      let steps = 0;
      for (; steps < 6 && !sim.bond && sim.phase === 'live'; steps++) {
        sim.tick(); if (!sim.bond) expect(d.body.support!.strike).toBeDefined();
      }
      const hold = sim.bond?.holds?.get(d);
      expect(hold).toBeDefined(); expect(hold!.origin).toMatch(/^lunge/);
      expect(steps * sim.dt).toBeLessThanOrEqual(.25); // within the push-off
      expect(Math.abs(d.pos.x - before.pos.x)).toBeGreaterThan(0);
      // Admitted on his feet, inside standing span, with no layout credit.
      expect(Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y)).toBeLessThanOrEqual(reach);
      expect(hold!.ground).toBe(reach); expect(hold!.reach).toBe(reach);
      expect(rolls).toHaveBeenCalledTimes(2); // one miss trial and one fumble trial, on arrival
      tryTackles(sim); expect(rolls).toHaveBeenCalledTimes(2);
      expect(step).toHaveBeenCalledOnce();
    });

  it('a lunge whose step cannot arrive misses once, without a technique draw or a hold', () => {
    const f = stage('Z'), { sim, c, d, reach } = f;
    c.body.pos.x = d.pos.x + reach + .35; d.body.vel.x = 5; c.body.vel.x = 6.4;
    f.command = { vel: { x: 5.5, y: 0 }, facing: 0 }; sim.intents[d.idx] = f.command;
    d.behavior = { kind: 'fixture-pursuit', update: () => f.command };
    c.behavior = { kind: 'carrier', update: () => ({ vel: { x: 7, y: 0 }, facing: 0 }) };
    seeMoving(f);
    const rolls = vi.spyOn(sim.rng, 'chance').mockReturnValue(true), step = vi.spyOn(sim, 'lungeAt');
    tryTackles(sim); expect(step).toHaveBeenCalledOnce();
    for (let i = 0; i < 8 && sim.phase === 'live'; i++) { sim.tick(); expect(sim.bond).toBeNull(); }
    expect(rolls).not.toHaveBeenCalled(); expect(step).toHaveBeenCalledOnce();
    expect(sim.events.filter(e => e.type === 'missed_tackle' && e.a === d.idx && e.note === 'lunge')).toHaveLength(1);
  });

  it('a diver\'s span grows from standing to laid out only as his fall runs', () => {
    const { d } = stage();
    const standing = handSpan(d, 'standing');
    expect(handSpan(d, 'lunge')).toBe(standing);
    expect(handSpan(d, 'dive', 0)).toBe(standing);
    expect(handSpan(d, 'dive', 1)).toBeCloseTo(Math.max(standing, LAYOUT_SHARE * d.profile.heightYd), 12);
    expect(handSpan(d, 'dive', 2)).toBe(handSpan(d, 'dive', 1));
    let last = -Infinity;
    for (let k = 0; k <= 10; k++) { const s = handSpan(d, 'dive', k / 10); expect(s).toBeGreaterThanOrEqual(last); last = s; }
    // A body on his feet has no fall progress, whatever he intends.
    expect(diveProgress(d.body, d.profile, 99)).toBe(0);
  });

  it.each([-1, 1])('a laid-out diver reaches a trailing foot beyond standing span, only after going down, mirror=%s', side => {
    const f = stage('QB', side), { sim, c, d, reach } = f;
    // Desperation window, runner pulling away; a near teammate slows him
    // through a real collision so the dive has something to reach.
    const traffic = sim.slot('C')!;
    c.body.pos.x = d.pos.x + side * (reach + d.profile.radius + .5);
    d.body.vel.x = side * 4; c.body.vel.x = side * 6;
    traffic.body.pos = { x: c.pos.x + side * (c.profile.radius + traffic.profile.radius + .3), y: c.pos.y };
    d.behavior = { kind: 'fixture-pursuit', update: () => ({ vel: { x: side * 7, y: 0 }, facing: d.facing }) };
    c.behavior = { kind: 'carrier', update: () => ({ vel: { x: side * 6, y: 0 }, facing: c.facing }) };
    seeMoving(f);
    const rolls = vi.spyOn(sim.rng, 'chance').mockReturnValue(true), launch = vi.spyOn(sim, 'diveAt');
    tryTackles(sim); expect(launch).toHaveBeenCalledOnce(); expect(sim.bond).toBeNull();
    let admitted: { center: number; span: number; legs: number; up: boolean } | undefined;
    for (let i = 0; i < 14 && !sim.bond && sim.phase === 'live'; i++) {
      const wasUp = d.body.support!.state === 'up';
      sim.tick();
      const sup = d.body.support!;
      if (!sim.bond && sup.state === 'falling') expect(legTarget(d, c).distance)
        .toBeGreaterThan(handSpan(d, 'dive', diveProgress(d.body, d.profile, sim.world.time)));
      if (sim.bond) {
        const span = handSpan(d, 'dive', diveProgress(d.body, d.profile, sim.world.time));
        admitted = { center: Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y), span, legs: legTarget(d, c).distance, up: wasUp };
      }
    }
    expect(admitted).toBeDefined();
    const joint = sim.bond!.holds!.get(d)!;
    expect(joint.origin).toBe('dive'); expect(d.body.support!.state).toBe('falling');
    // Every admission: the leg target is within that moment's hand span.
    expect(admitted!.legs).toBeLessThanOrEqual(admitted!.span + 1e-12);
    expect(admitted!.span).toBeGreaterThan(handSpan(d, 'standing'));
    expect(diveProgress(d.body, d.profile, sim.world.time)).toBeGreaterThan(0);
    // The joint starts inside the span it keeps; the span cannot grow later.
    expect(joint.hold).toBeLessThanOrEqual(joint.reach); expect(joint.ground).toBe(joint.reach);
    expect(joint.reach).toBeLessThanOrEqual(handSpan(d, 'dive', 1) + TRAILING_FOOT_SHARE * c.profile.heightYd + c.profile.radius);
    expect(rolls).toHaveBeenCalledOnce();
    const kept = joint.reach; for (let i = 0; i < 3 && sim.phase === 'live'; i++) sim.tick();
    expect(joint.reach).toBe(kept);
  });

  it('fall progress, and so layout span, starts only when the body leaves its feet', () => {
    const { d } = stage();
    const s = d.body.support!;
    s.state = 'falling'; s.cause = 'dive'; s.since = 3;
    expect(diveProgress(d.body, d.profile, 3)).toBe(0);
    expect(handSpan(d, 'dive', diveProgress(d.body, d.profile, 3))).toBe(handSpan(d, 'standing'));
    const half = diveProgress(d.body, d.profile, 3.1);
    expect(half).toBeGreaterThan(0); expect(half).toBeLessThan(1);
    expect(diveProgress(d.body, d.profile, 4)).toBe(1);
    // A fall from contact is not a layout.
    s.cause = 'contact'; expect(diveProgress(d.body, d.profile, 4)).toBe(0);
  });

  it('does not grant a receding runner a remote dive hold or repeated success draws', () => {
    const f = stage('QB'), { sim, c, d, reach } = f;
    c.body.pos.x = d.pos.x + reach + d.profile.radius + .55;
    d.body.vel.x = 4; c.body.vel.x = 7;
    sim.intents[d.idx] = { vel: { x: 7, y: 0 }, facing: 0 };
    d.behavior = { kind: 'fixture-pursuit', update: () => ({ vel: { x: 7, y: 0 }, facing: 0 }) };
    c.behavior = { kind: 'carrier', update: () => ({ vel: { x: 7, y: 0 }, facing: 0 }) };
    seeMoving(f);
    const draw = vi.spyOn(sim.rng, 'chance').mockReturnValue(true), launch = vi.spyOn(sim, 'diveAt');
    tryTackles(sim);
    expect(launch).toHaveBeenCalledOnce(); expect(sim.bond).toBeNull();
    for (let i = 0; i < 14; i++) { sim.tick(); expect(sim.bond).toBeNull(); }
    expect(draw).not.toHaveBeenCalled(); expect(launch).toHaveBeenCalledOnce();
    expect(sim.events.filter(e => e.type === 'missed_tackle' && e.a === d.idx)).toHaveLength(1);
  });

  it('a desperation dive can acquire after real teammate traffic slows its target', () => {
    const f = stage('QB'), { sim, c, d, reach } = f, traffic = sim.slot('C')!;
    // Same inherited desperation window. The runner must lose speed through
    // an actual body collision, not a hidden velocity replacement or bonus.
    c.body.pos.x = d.pos.x + reach + d.profile.radius + .45 + .01;
    d.body.vel.x = 4; c.body.vel.x = 6;
    traffic.body.pos = { x: c.pos.x + c.profile.radius + traffic.profile.radius + .02, y: c.pos.y };
    d.behavior = { kind: 'fixture-pursuit', update: () => ({ vel: { x: 7, y: 0 }, facing: 0 }) };
    c.behavior = { kind: 'carrier', update: () => ({ vel: { x: 6, y: 0 }, facing: 0 }) };
    seeMoving(f);
    const rolls = vi.spyOn(sim.rng, 'chance').mockReturnValue(true), launch = vi.spyOn(sim, 'diveAt');
    tryTackles(sim); expect(sim.bond).toBeNull(); expect(rolls).not.toHaveBeenCalled();
    let collision = false;
    for (let i = 0; i < 12 && !sim.bond && sim.phase === 'live'; i++) {
      sim.tick();
      collision ||= sim.lastStep!.contacts.some(hit => hit.impulse > 0
        && (hit.i === c.idx && hit.j === traffic.idx || hit.j === c.idx && hit.i === traffic.idx));
    }
    const joint = sim.bond?.holds?.get(d);
    expect(collision).toBe(true); expect(joint).toBeDefined(); expect(joint!.origin).toBe('dive');
    expect(d.body.support!.cause).toBe('dive'); expect(c.speed).toBeLessThan(6);
    expect(legTarget(d, c).distance).toBeLessThanOrEqual(handSpan(d, 'dive', diveProgress(d.body, d.profile, sim.world.time)));
    expect(joint!.hold).toBeLessThanOrEqual(joint!.reach); expect(joint!.ground).toBe(joint!.reach);
    expect(rolls).toHaveBeenCalledOnce(); expect(launch).toHaveBeenCalledOnce();
    tryTackles(sim); expect(rolls).toHaveBeenCalledOnce();
  });

  it('a genuinely acquired grip transmits load then slips beyond the same finite span', () => {
    const f = stage(), { sim, d, c, reach } = f;
    c.body.vel.x = 8;
    vi.spyOn(sim.rng, 'chance').mockReturnValue(false); tryTackles(sim);
    const j = sim.bond!.holds!.get(d)!;
    const w = new World([d.body, c.body]); w.joints.push(j);
    let transmitted = false, slipped = false;
    for (let k = 0; k < 30 && !j.broken; k++) {
      const r = w.step([0, 1].map(() => ({ vel: { x: 0, y: 0 }, free: true })), .05);
      transmitted ||= (j.force ?? 0) > 0; slipped ||= !!j.slipping;
      expect(Math.abs(r.work.residual)).toBeLessThan(1e-8);
    }
    expect(transmitted).toBe(true); expect(slipped).toBe(true); expect(j.broken).toBe(true);
    expect(j.reach).toBe(reach); expect(j.ground).toBe(reach);
  });

  it.each(['front', 'rear'].flatMap(location => [false, true].map(reachable => ({ location, reachable }))))(
    'requires physical geometry for a $location assist, reachable=$reachable', ({ location, reachable }) => {
    const f = stage(), { sim, d, c, reach } = f;
    c.body.vel.x = location === 'rear' ? 3 : -3;
    const helper = sim.slot('SS')!;
    helper.downUntil = -1; d.downUntil = 99;
    helper.body.pos = { x: c.pos.x, y: c.pos.y + .8 };
    const rng = vi.spyOn(sim.rng, 'chance').mockReturnValue(false);
    tryTackles(sim); // Establish the other holder through real admission.
    expect(sim.bond?.tacklers).toContain(helper);
    d.downUntil = -1; rng.mockClear();
    c.body.pos.x = d.pos.x + reach + (reachable ? -.01 : .01);
    tryTackles(sim);
    const j = sim.bond!.holds!.get(d);
    if (!reachable) { expect(j).toBeUndefined(); expect(rng).not.toHaveBeenCalled(); return; }
    expect(j).toBeDefined();
    expect(j!.origin).toContain('+assist'); if (location === 'rear') expect(j!.origin).toContain('+behind');
    expect(j!.hold).toBeLessThanOrEqual(reach); expect(j!.reach).toBe(reach);
    expect(rng).toHaveBeenCalledOnce(); // assist skips a fresh miss draw
  });

  it('cannot resurrect a committed target after possession changes away and back', () => {
    const f = stage(), { sim, d, c, reach } = f;
    c.body.pos.x = d.pos.x + reach + .01; c.body.vel.x = 3;
    const rolls = vi.spyOn(sim.rng, 'chance'); tryTackles(sim);
    expect(sim.bond).toBeNull(); expect(rolls).not.toHaveBeenCalled();
    sim.ball = { kind: 'held', carrier: sim.qb }; tryTackles(sim);
    sim.ball = { kind: 'held', carrier: c }; sim.world.time += .05;
    tryTackles(sim);
    expect(sim.bond).toBeNull(); expect(rolls).not.toHaveBeenCalled();
  });
});
