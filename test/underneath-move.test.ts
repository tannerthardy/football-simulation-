// UNDERNEATH_MOVE (Flex, 2026-11-25; Rules' staged stick, Integration's ruling): the underneath read of an option route
// (stick, hook) works away only from a key he sees moving with him over the last 0.3 s; a key standing or sinking in the
// window is zone, and he sits on base. As taught: sit against zone, work away from a man.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { keyLooksAt, keyMovesWithHim } from '../src/sim/route-read.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
const me = { x: 44, y: 26 }, run = { x: 5, y: 0 };
const key = (x: number, y: number, vx: number, vy: number) => ({ id: 'k', pos: { x, y }, vel: { x: vx, y: vy }, age: 0.1 });

describe('UNDERNEATH_MOVE: which key moves with him', () => {
  it('a key standing or sinking in the window does not', () => {
    expect(keyMovesWithHim(key(46, 25, 0, 0), me, run, false)).toBe(false);
    expect(keyMovesWithHim(key(46, 25, 3, 0), me, run, false)).toBe(false); // sinking ahead of him
  });
  it('a key on his hip running with him does; closing on his line does', () => {
    expect(keyMovesWithHim(key(44.5, 25, 4.5, 0), me, run, false)).toBe(true);
    expect(keyMovesWithHim(key(46, 24, 0, 2), me, run, false)).toBe(true);
    expect(keyMovesWithHim(key(46, 28, 0, -2), me, run, false)).toBe(true);
    expect(keyMovesWithHim(key(46, 24, 0, -2), me, run, false)).toBe(false); // widening away from him
  });
  it('enter and exit margins: once moving he holds it through a little slack', () => {
    const trail = key(45.2, 25, 4.5, 0), close = key(46, 24, 0, 1.2);
    expect(keyMovesWithHim(trail, me, run, false)).toBe(false);
    expect(keyMovesWithHim(trail, me, run, true)).toBe(true);
    expect(keyMovesWithHim(close, me, run, false)).toBe(false);
    expect(keyMovesWithHim(close, me, run, true)).toBe(true);
  });
});

describe('UNDERNEATH_MOVE: where the key looks', () => {
  const qb = { x: 33, y: 26 };
  it('eyes on him or on the passer, with a margin either side of a held read', () => {
    const at = (to: { x: number; y: number }, off = 0) => ({ ...key(46, 25, 0, 0), look: Math.atan2(to.y - 25, to.x - 46) + off });
    expect(keyLooksAt(at(me), me, qb, false)).toBe('him');
    expect(keyLooksAt(at(qb), me, qb, false)).toBe('passer');
    expect(keyLooksAt({ ...key(46, 25, 0, 0), look: Math.PI / 2 }, me, qb, false)).toBeNull();
    expect(keyLooksAt({ ...key(46, 25, 0, 0) }, me, qb, false)).toBeNull(); // not seen
    const r30 = 30 * Math.PI / 180, toMe = Math.atan2(26 - 25, 44 - 46);
    expect(keyLooksAt({ ...key(46, 25, 0, 0), look: toMe + r30 }, me, null, false)).toBeNull();
    expect(keyLooksAt({ ...key(46, 25, 0, 0), look: toMe + r30 }, me, null, true)).toBe('him');
  });
});

describe('UNDERNEATH_MOVE: the stick read', () => {
  const answer = async (flag: string, keyVel: { x: number; y: number }, eyes: 'him' | 'passer' = 'passer') => {
    vi.stubEnv('UNDERNEATH_MOVE', flag); vi.resetModules();
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const { FIELD_WIDTH } = await import('../src/core/field.js');
    const { ROUTES } = await import('../src/playbook/routes.js');
    const { RouteRunner } = await import('../src/sim/behaviors/receiver.js');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const sim = new PlaySim({ ...nativeTraceSetup({ coverage: 'cover3', concept: 'stick', seed: 7, roster: 7,
      formation: 'gun_doubles_11', flip: false }), audibles: false });
    const r = sim.slot(sim.offAlign.numbering.S2!)!, k = sim.slot('LB_M')!;
    r.body.pos = { x: 40, y: FIELD_WIDTH / 2 }; r.body.vel = { x: 0, y: 0 };
    const runner = new RouteRunner(r, sim, ROUTES.stick, 1);
    r.behavior = runner; r.body.vel.x = 5;
    for (const d of sim.defense) { d.body.pos = { x: 30, y: 1 }; d.body.vel = { x: 0, y: 0 }; }
    k.body.pos = { x: 46, y: r.pos.y - 1 }; k.body.vel = keyVel;
    // His eyes as the receiver will see them (recorded head): on the receiver at the read, or on the passer.
    const to = eyes === 'him' ? { x: 44, y: r.pos.y } : sim.qb.pos;
    k.head = Math.atan2(to.y - k.pos.y, to.x - k.pos.x); k.body.facing = k.head;
    for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, sim.qb.idx);
    sim.t = 1.6; r.body.pos.x = 41; runner.update(r, sim);
    sim.t = 2; r.body.pos.x = 44; runner.update(r, sim);
    return runner.routeDecision?.choice;
  };
  it('a key standing in the window: he sits on base (off: he worked away)', async () => {
    expect(await answer('1', { x: 0, y: 0 })).toMatchObject({ answer: 'base', reason: 'key-sitting' });
    expect(await answer('0', { x: 0, y: 0 })).toMatchObject({ answer: 'away', reason: 'escape-open' });
  });
  it('a key closing on his line with his eyes off the backfield: he works away; eyes on the passer: zone, he sits', async () => {
    expect(await answer('1', { x: 0, y: 2 }, 'him')).toMatchObject({ answer: 'away', reason: 'escape-open' });
    expect(await answer('1', { x: 0, y: 2 }, 'passer')).toMatchObject({ answer: 'base', reason: 'key-sitting' });
  });
  it('an off man sinking with his eyes on him: man, he works away', async () => {
    expect(await answer('1', { x: 0, y: 0 }, 'him')).toMatchObject({ answer: 'away', reason: 'escape-open' });
  });
});

describe('UNDERNEATH_MOVE: the exit cap and the passer\'s forecast', () => {
  it('a man leaving the exit box does not cap it; a man arriving does', async () => {
    const { ROUTES } = await import('../src/playbook/routes.js');
    const { installedRead, readRoute } = await import('../src/sim/route-read.js');
    const read = installedRead(ROUTES.stick)!, away = read.answers.find((a) => a.id === 'away')!;
    const c = { start: { x: 40, y: 26 }, pos: { x: 44, y: 26 }, los: 40, middleY: 26.67, outside: 1, movingWith: () => true };
    const dir = Math.sign(away.points.at(-1)!.l - away.points[0].l), breakX = 40 + away.points[0].d;
    const k = { id: 'k', pos: { x: breakX, y: 26 - dir }, vel: { x: 0, y: 0 }, age: 0.1 };
    const cap = (y: number, vy: number, vx = 0) => ({ id: 'c', pos: { x: breakX, y: 26 + dir * y }, vel: { x: vx, y: dir * vy }, age: 0.1 });
    expect(readRoute(read, c, [k, cap(2, 0)]).reason).toBe('escape-capped');
    expect(readRoute(read, c, [k, cap(2, 0, 8)]).reason).toBe('escape-open'); // leaving: bailing 3.2 yd deeper in 0.4 s
    expect(readRoute(read, c, [k, cap(12, -8)]).reason).toBe('escape-capped'); // arriving from outside the box (12 yd wide)
    expect(readRoute(read, c, [k, cap(12, 0)]).reason).toBe('escape-open');
  });

  it('the passer\'s expected answer changes only once his picture has shown it for 0.3 s', async () => {
    const { ROUTES } = await import('../src/playbook/routes.js');
    const { ReceiverForecast, installReceiverRoute } = await import('../src/sim/receiver-forecast.js');
    const { derivePhysical } = await import('../src/players/physical.js');
    const { generateTeam } = await import('../src/league/team.js');
    const { Rng } = await import('../src/core/rng.js');
    const wr = generateTeam(new Rng(5), 'T', 'T', { strength: 0.5 }).roster.find((p) => p.position === 'WR')!;
    const prior = installReceiverRoute({ x: 40, y: 26 }, 40, 1, ROUTES.stick, 0, derivePhysical(wr), 0.5);
    const f = new ReceiverForecast({ pos: { x: 33, y: 26 } }, prior, 0.05);
    f.acquire({ pos: { x: 42.5, y: 26 }, vel: { x: 3, y: 0 }, facing: 0, sampledAt: 1, acquiredAt: 1 });
    const onHim = { id: 'k', pos: { x: 46, y: 25 }, vel: { x: 0, y: 0 }, age: 0.2, look: Math.atan2(26 - 25, 42.5 - 46) };
    f.readKeys([onHim]);
    expect(f.estimate?.routeAnswer).toBe('away');
    const onPasser = { ...onHim, look: Math.atan2(26 - 25, 33 - 46) };
    for (let i = 0; i < 5; i++) { f.readKeys([onPasser]); expect(f.estimate?.routeAnswer).toBe('away'); }
    f.readKeys([onPasser]);
    expect(f.estimate?.routeAnswer).toBe('base');
  });
});
