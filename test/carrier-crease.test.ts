/** Crease route reader extracted from Claude zone work.
 * Held-body scenes with exact perception: these test what the reader does
 * with a picture, not a football outcome. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Perceived } from '../src/sim/perception.js';
import { BallCarrier, runReadAim } from '../src/sim/behaviors/carrier.js';
import { runReadObservers } from '../src/sim/run-read-observer.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'Lane offense', 'LO', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Lane defense', 'LD', { strength: .55 });
const LOS = 40;

/** Line at the LOS (C at the ball, guards ±1.4, tackles ±2.8), RB 4.5 yd deep
 * at lateral `rb` (mirror sign m). Everyone else parked far away. */
function scene(m: 1 | -1, rb = 1, depth = 4.5) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, kind: 'run', flip: false, run: RUN_BY_ID.iz_strong, label: 'lane' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lane' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 5, record: false });
  for (const a of sim.agents) { a.body.pos = { x: 5 + a.idx, y: 2 }; a.body.vel = { x: 0, y: 0 }; }
  const put = (slot: string, x: number, y: number) => { const a = sim.slot(slot as never)!; a.body.pos = { x, y: CENTER_Y + m * y }; return a; };
  for (const [s, y] of [['C', 0], ['LG', -1.4], ['RG', 1.4], ['LT', -2.8], ['RT', 2.8]] as const) put(s, LOS - .5, y);
  const back = put('RB', LOS - depth, rb);
  sim.see = (_a, t) => ({ pos: { ...t.pos }, vel: { ...t.vel }, stance: null, facing: 0, pose: 'up', age: .1 } satisfies Perceived);
  sim.ball = { kind: 'held', carrier: back } as never;
  return { sim, put, back, m };
}

const opts = (m: number, aimY: number) => ({ aim: { x: LOS + .6, y: CENTER_Y + m * aimY }, run: { scheme: 'insideZone' as const, side: m } });
const lat = (y: number, m: number) => (y - CENTER_Y) * m;

describe('acquired crease route', () => {
  it('a defender standing in the called gap closes it', () => {
    for (const m of [1, -1] as const) {
      // Near the line, where a little time to arrive used to make an occupied
      // gap look cheap.
      const open = scene(m, 2.1, 1.6);
      const free = runReadAim(open.back, open.sim, opts(m, 2.1))!;
      expect(Math.abs(lat(free.y, m) - 2.1)).toBeLessThan(.6);
      const closed = scene(m, 2.1, 1.6);
      closed.put('DT_S', LOS, 2.1);
      const entry = runReadAim(closed.back, closed.sim, opts(m, 2.1))!;
      expect(Math.abs(lat(entry.y, m) - 2.1)).toBeGreaterThan(.8);
    }
  });

  it('a block protects the hole on the blocker\'s side, not the defender\'s free side', () => {
    for (const m of [1, -1] as const) {
      // RT has walled the end inside him... the end is engaged playside of RT
      // with RT on his inside: the opening inside RT is protected; the
      // outside, the end's free side, is not.
      const s = scene(m, 3.4, 1.6);
      const end = s.put('DE_S', LOS + .2, 3.9), rt = s.sim.slot('RT')!;
      rt.body.pos = { x: LOS - .1, y: CENTER_Y + m * 3.1 };
      const e = s.sim.engage(rt, end, 'run');
      expect(e).toBeTruthy();
      e!.win = 0; e!.phi = 0;
      const entry = runReadAim(s.back, s.sim, opts(m, 4.6))!;
      // Called outside the end, but he takes the protected side of the block.
      expect(lat(entry.y, m)).toBeLessThan(3.3);
    }
  });

  it('is mirror-symmetric', () => {
    const pick = (m: 1 | -1) => {
      const s = scene(m, 1.5);
      s.put('DT_S', LOS + .3, 1.6); s.put('LB_M', LOS + 4, 2.5); s.put('DE_W', LOS + .4, -3.4);
      const e = runReadAim(s.back, s.sim, opts(m, 2))!;
      return { x: e.x, y: lat(e.y, m) };
    };
    const a = pick(1), b = pick(-1);
    expect(b.x).toBeCloseTo(a.x, 9);
    expect(b.y).toBeCloseTo(a.y, 9);
  });

  it('flattens behind the line before turning up when bodies stand on the straight run', () => {
    for (const m of [1, -1] as const) {
      // Back pressing play side; the only clean entry is back across the
      // center, and the playside guard and his man stand on the straight line.
      const s = scene(m, 3.5);
      s.back.body.pos = { x: LOS - 2.4, y: CENTER_Y + m * 3.5 };
      s.put('DT_S', LOS + .2, 2.2); s.put('DE_S', LOS + .2, 3.6); s.put('LB_S', LOS + 1, 4.2);
      const rg = s.sim.slot('RG')!; rg.body.pos = { x: LOS - .8, y: CENTER_Y + m * 2.1 };
      const entry = runReadAim(s.back, s.sim, { ...opts(m, -1.5), run: { scheme: 'insideZone' as const, side: m } })!;
      // He heads for the waypoint behind the line, not the entry itself.
      expect(entry.x).toBeLessThan(LOS - .5);
    }
  });
});


/** These call the actual possession hook. A passing teammate must not make
 * an occupied entry safe; hidden engagement changes must not alter that read. */
describe('production carrier entry commands', () => {
  it.each([1, -1] as const)('does not drive into an end-point defender beside an incidental receiver, mirror %s', m => {
    const picks = [];
    for (const nearby of [false, true]) {
      const s = scene(m, 2, 1.6);
      const dt = s.put('DT_S', LOS + .5, 2);
      if (nearby) {
        const z = s.put('Z', dt.pos.x + dt.profile.radius + s.sim.slot('Z')!.profile.radius + .1, 2);
        z.body.vel = { x: 5, y: 0 }; // Beyond the end, moving away; no interposition.
      }
      let occupiedRisk = 0;
      runReadObservers.set(s.sim, event => {
        if (event.phase !== 'aim') return;
        const candidate = (event.candidates as Array<{entry: {x: number; y: number}; risk: number}>)
          .find(c => Math.abs(c.entry.x - dt.pos.x) < 1e-8 && Math.abs(c.entry.y - dt.pos.y) < 1e-8);
        occupiedRisk = candidate!.risk;
      });
      const command = new BallCarrier(opts(m, 2), s.back).update(s.back, s.sim);
      // The old false hold credit selected a straight full-speed command.
      expect(Math.abs(command.vel.y)).toBeGreaterThan(.5);
      expect(occupiedRisk).toBeGreaterThan(4);
      picks.push(command.vel);
    }
    expect(picks[1]).toEqual(picks[0]);
  });

  it('uses the acquired image through the real hook despite private engagement and body changes', () => {
    const s = scene(1, 2, 1.6), dt = s.put('DT_S', LOS + .5, 2), rt = s.sim.slot('RT')!;
    const images = new Map(s.sim.agents.map(a => [a, s.sim.see(s.back, a)]));
    s.sim.see = (_observer, a) => structuredClone(images.get(a)!);
    const choose = () => new BallCarrier(opts(1, 2), s.back).update(s.back, s.sim);
    const acquired = choose();
    // This is an information-only perturbation; it prescribes no native result.
    rt.body.pos = { x: dt.pos.x - .5, y: dt.pos.y };
    const engagement = s.sim.engage(rt, dt, 'run');
    expect(engagement).toBeTruthy();
    engagement!.win = .99;
    dt.body.pos = { x: 55, y: CENTER_Y - 6 };
    dt.body.vel = { x: 4, y: -5 };
    dt.body.support!.state = 'down';
    dt.downUntil = s.sim.t + 10;
    expect(choose()).toEqual(acquired);
  });

  it('holds the press entry until the ordinary decision beat', () => {
    const s = scene(1, 2.1, 2.4), dt = s.sim.slot('DT_S')!;
    let reads = 0;
    runReadObservers.set(s.sim, e => { if (e.phase === 'aim') reads++; });
    const carrier = new BallCarrier({ ...opts(1, 2.1), aimUntil: 10 }, s.back);
    carrier.update(s.back, s.sim);
    expect(reads).toBe(1);
    s.put('DT_S', LOS, 2.1);
    s.sim.t = .05;
    carrier.update(s.back, s.sim);
    expect(reads).toBe(1);
    s.sim.t = Math.ceil(s.back.mind.decisionInterval / .05) * .05;
    carrier.update(s.back, s.sim);
    expect(reads).toBe(2);
    expect(dt.pos.y).toBeCloseTo(CENTER_Y + 2.1);
  });

  it('keeps a visibly down defender in the future threat picture', () => {
    const s = scene(1, 2, 3.4), dt = s.put('DT_S', LOS + .5, 2);
    const original = s.sim.see;
    s.sim.see = (a, b, ...rest) => ({ ...original(a, b, ...rest), pose: b === dt ? 'down' : 'up', age: 1.9 });
    let occupiedRisk = 0;
    runReadObservers.set(s.sim, event => {
      if (event.phase !== 'aim') return;
      occupiedRisk = (event.candidates as Array<{entry: {x: number; y: number}; risk: number}>)
        .find(c => Math.abs(c.entry.x - dt.pos.x) < 1e-8 && Math.abs(c.entry.y - dt.pos.y) < 1e-8)!.risk;
    });
    new BallCarrier(opts(1, 2), s.back).update(s.back, s.sim);
    // A stale fall is not permanent removal. This asserts a risk, not a
    // mandatory cut or a particular football ending.
    expect(occupiedRisk).toBeGreaterThan(4);
  });
});
