import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.SIGHT_PURE = '0'; }); // engine-72: fixture recorded on the query-order picture, before the per-pair sight history; the lane that owns it re-records with SIGHT_PURE on (docs/reviews/2026-11-16-pin-delta-engine72.md)
import { FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { contactCost } from '../src/sim/contact-choice.js';
import { BallCarrier } from '../src/sim/behaviors/carrier.js';
import { stand } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

const home = generateTeam(new Rng(7), 'Home', 'HOM');
const away = generateTeam(new Rng(19), 'Away', 'AWY');
function scenario(mirror = false, clean = false, goal = false, needed = -3) {
  const s = new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 1,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 48 + needed, down: 3 });
  for (const a of s.agents) {
    a.downUntil = Infinity; a.body.pos = { x: 10, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'parked', update: () => stand() };
  }
  const c = s.slot('X')!, d = s.slot('LB_M')!, inward = mirror ? -1 : 1;
  c.downUntil = 0; c.body.pos = { x: goal ? 109.3 : 48, y: mirror ? FIELD_WIDTH - 0.75 : 0.75 };
  c.body.vel = { x: 6, y: -inward }; c.body.facing = 0;
  c.behavior = new BallCarrier({}, c);
  d.downUntil = 0; d.body.pos = { x: c.pos.x + (clean ? -10 : 2), y: c.pos.y + inward };
  d.body.vel = clean ? { x: 0, y: 0 } : { x: -5, y: -inward * 2 };
  s.ball = { kind: 'held', carrier: c }; s.crossedLOS = true;
  for (let i = 0; i < 24; i++) s.perception.record(s.agents);
  return { s, c, d, inward };
}

describe('marginal contact choices', () => {
  it('weighs size, closing speed and existing traits without position stereotypes', () => {
    expect(contactCost(80, 110, 12, .3, .5)).toBeGreaterThan(contactCost(105, 110, 12, .3, .5));
    expect(contactCost(80, 110, 12, .3, .5)).toBeGreaterThan(contactCost(80, 110, 5, .3, .5));
    expect(contactCost(80, 110, 10, .3, .5)).toBeGreaterThan(contactCost(80, 110, 10, .8, .5));
    expect(contactCost(80, 110, 0, .3, .5)).toBe(0);
    expect(contactCost(80, 110, 100, 0, 0)).toBeLessThan(4.5);
  });

  it.each([false, true])('can choose a clear exit after conversion, mirror=%s, without an early whistle', mirror => {
    const { s, c, inward } = scenario(mirror);
    const cmd = c.behavior.update(c, s);
    expect(c.tags.has('chose-sideline')).toBe(true);
    expect(cmd.vel.y * inward).toBeLessThan(0);
    expect(s.phase).toBe('live');
    expect(s.outcome).toBeNull();
  });

  it('keeps a clean field lane rather than drifting out and giving up free yards', () => {
    const { s, c } = scenario(false, true);
    const r = s.run();
    expect(r.outcome).toBe('touchdown');
    expect(c.tags.has('chose-sideline')).toBe(false);
  });

  it('values finishing at the goal line over an unnecessary exit', () => {
    const { s, c } = scenario(false, false, true);
    const cmd = c.behavior.update(c, s);
    expect(c.tags.has('chose-sideline')).toBe(false);
    expect(cmd.vel.x).toBeGreaterThan(0);
  });

  it('takes an exit beyond nearby third-down sticks rather than giving up the conversion', () => {
    const { s, c } = scenario(false, false, false, 1.3);
    const cmd = c.behavior.update(c, s);
    expect(c.tags.has('chose-sideline')).toBe(true);
    const exitX = c.pos.x + c.pos.y * cmd.vel.x / -cmd.vel.y;
    expect(exitX).toBeGreaterThanOrEqual(s.firstDownX);
  });
});
