/** Run-game controller candidates (experimental, all default-off):
 * UC_MESH (under-center exchange depth/timing), ZONE_TE (an inline tight end
 * runs the zone track), LB_KEY (backers key a back's first step from his own
 * alignment), MESH_TEMPO (the back takes the handoff moving) and
 * GUN_MESH_SIDE (the shotgun exchange on the back's own side). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(51), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(52), 'D', 'D', { strength: .55 });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function sim(flags: Record<string, string>, formationId: string, run: string, flip = false): Promise<PlaySim> {
  for (const [k, v] of Object.entries(flags)) vi.stubEnv(k, v);
  vi.resetModules();
  const { PlaySim: Sim } = await import('../src/sim/playsim.js');
  const formation = FORMATION_BY_ID[formationId];
  return new Sim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
}
const handoff = (s: PlaySim) => s.qb.behavior as unknown as { mesh: { x: number; y: number }; meshTime: number; through: number };
const runner = (s: PlaySim) => s.slot('RB')!.behavior as unknown as { mesh: { x: number; y: number }; meshTime: number; ride: boolean };

describe('UC_MESH under-center exchange', () => {
  it('is off by default: shallow inside mesh, QB stops on it, back does not ride', async () => {
    const s = await sim({ UC_MESH: '0' }, 'ace_11', 'iz_strong');
    expect(s.los - handoff(s).mesh.x).toBeCloseTo(3.5, 9);
    expect(handoff(s).through).toBe(0);
    expect(runner(s).ride).toBe(false);
  });

  it.each([false, true])('sets the tracked depth, keeps the QB moving and times the exchange to his own body, flip=%s', async flip => {
    const s = await sim({ UC_MESH: '1' }, 'ace_11', 'iz_strong', flip);
    const h = handoff(s), r = runner(s);
    expect(s.los - h.mesh.x).toBeCloseTo(4.4, 9);
    expect(s.los - r.mesh.x).toBeCloseTo(5.0, 9);
    expect(h.through).toBeGreaterThan(0);
    expect(r.ride).toBe(true);
    expect(h.meshTime).toBeGreaterThanOrEqual(RUN_BY_ID.iz_strong.meshTime);
    expect(r.meshTime).toBe(h.meshTime);
  });

  it('leaves shotgun and pistol exchanges unchanged', async () => {
    for (const f of ['gun_doubles_11', 'pistol_11']) {
      const off = await sim({ UC_MESH: '0' }, f, 'iz_strong'), on = await sim({ UC_MESH: '1' }, f, 'iz_strong');
      expect(handoff(on).mesh).toEqual(handoff(off).mesh);
      expect(handoff(on).meshTime).toBe(handoff(off).meshTime);
      expect(handoff(on).through).toBe(0);
      expect(runner(on).ride).toBe(runner(off).ride);
    }
  });
});

describe('ZONE_TE inline tight end runs the zone track', () => {
  /** The inline TE's first requested steps on outside zone, play side +. */
  async function firstSteps(flag: string, flip: boolean) {
    const s = await sim({ ZONE_TE: flag }, 'ace_12', 'oz_strong', flip);
    const { playSideSign } = await import('../src/sim/behaviors/blocking.js');
    const ps = playSideSign(s, RUN_BY_ID.oz_strong), y = s.slot('Y')!, dir = s.attackDir('O');
    let lat = 0, fwd = 0;
    while (s.t < .3) {
      s.tick();
      if (y.engagement) break;
      const v = s.intents[y.idx].vel;
      lat += v.y * ps; fwd += v.x * dir;
    }
    return { lat, fwd };
  }

  it.each([false, true])('requests width first rather than a downhill sprint, flip=%s', async flip => {
    const off = await firstSteps('0', flip), on = await firstSteps('1', flip);
    expect(off.fwd).toBeGreaterThan(off.lat);
    expect(on.lat).toBeGreaterThan(on.fwd);
    expect(on.lat).toBeGreaterThan(0);
  });
});

describe('ZONE_TE covered end takes a slanting man where he goes', () => {
  /** The play-side end's own target, staged 2 yd away either holding his
   * outside shade or slanting hard inside; the end's next free request,
   * play side +. */
  async function request(slant: boolean, flip: boolean) {
    const s = await sim({ ZONE_TE: '1' }, 'ace_12', 'oz_strong', flip);
    const { playSideSign, RunBlocker } = await import('../src/sim/behaviors/blocking.js');
    const ps = playSideSign(s, RUN_BY_ID.oz_strong), dir = s.attackDir('O');
    // The play-side inline end on a solo reach (Y or H, depending on the flip).
    const y = ['Y', 'H'].map(k => s.slot(k)!).find(a => a.behavior instanceof RunBlocker
      && a.behavior.plan.kind === 'reach' && !a.behavior.plan.combination && (a.pos.y - s.ballY) * ps > 0)!;
    expect(y).toBeTruthy();
    const target = (y.behavior as InstanceType<typeof RunBlocker>).plan.target!;
    expect(target).toBeTruthy();
    target.body.pos = { x: y.pos.x + dir * 1.2, y: y.pos.y + ps * (slant ? -1.6 : .3) };
    target.body.vel = slant ? { x: -dir, y: -ps * 4 } : { x: 0, y: 0 };
    s.t = s.world.time = .5;
    for (let k = 0; k < 30; k++) s.perception.record(s.agents);
    return y.behavior.update(y, s).vel.y * ps;
  }

  it.each([false, true])('runs the track against a shade and follows an inside slant, flip=%s', async flip => {
    expect(await request(false, flip)).toBeGreaterThan(0);
    expect(await request(true, flip)).toBeLessThan(0);
  });
});

describe('ZONE_TE end level with his man', () => {
  /** The play-side end has run past his own target (the man stayed or
   * slanted), whose playside shoulder is 0.4 yd inside or outside the end's
   * own line; the end's next free request, play side + for lateral. */
  async function request(across: number, flip: boolean) {
    const s = await sim({ ZONE_TE: '1' }, 'ace_12', 'iz_strong', flip);
    const { playSideSign, RunBlocker } = await import('../src/sim/behaviors/blocking.js');
    const ps = playSideSign(s, RUN_BY_ID.iz_strong), dir = s.attackDir('O');
    const y = ['Y', 'H'].map(k => s.slot(k)!).find(a => a.behavior instanceof RunBlocker
      && !(a.behavior as InstanceType<typeof RunBlocker>).plan.combination && (a.pos.y - s.ballY) * ps > 0)!;
    expect(y).toBeTruthy();
    const target = (y.behavior as InstanceType<typeof RunBlocker>).plan.target!;
    expect(target).toBeTruthy();
    // As filmed (gun IZ, odd front): the end 1.6 yd past the line and moving
    // out, his man still on it, beyond engage range of each other.
    y.body.pos = { x: s.los + dir * 1.6, y: y.pos.y };
    y.body.vel = { x: dir * 1.2, y: ps * 1.4 };
    target.body.pos = { x: s.los, y: y.pos.y - ps * (.6 + across) };
    target.body.vel = { x: -dir * .5, y: ps * .5 };
    s.t = s.world.time = 1;
    for (let k = 0; k < 30; k++) s.perception.record(s.agents);
    return { lateral: y.behavior.update(y, s).vel.y * ps, vmax: y.profile.vmax };
  }

  it.each([false, true])('does not reverse a full-speed width request across the man\'s shoulder line, flip=%s', async flip => {
    const inside = await request(.4, flip), outside = await request(-.4, flip);
    const reversed = inside.lateral * outside.lateral < 0
      && Math.min(Math.abs(inside.lateral), Math.abs(outside.lateral)) >= .5 * inside.vmax;
    expect(reversed).toBe(false);
  });
});

describe('LB_KEY backers key the back\'s first step', () => {
  /** Before the handoff, the back has visibly stepped `step` yd play side at
   * a walk (below the developed-speed flow cue). The backside insert backer's
   * free fit request is compared. */
  async function stage(flag: string, step: number, flip: boolean) {
    // Inside zone weak: in the Over front both insert backers are backside.
    const s = await sim({ LB_KEY: flag }, 'ace_11', 'iz_weak', flip);
    const { executeRunFit } = await import('../src/sim/run-fits.js');
    const { playSideSign } = await import('../src/sim/behaviors/blocking.js');
    const ps = playSideSign(s, RUN_BY_ID.iz_weak), back = s.slot('RB')!;
    back.body.pos = { x: back.pos.x, y: back.pos.y + ps * step };
    back.body.vel = { x: 0, y: ps * .5 };
    s.t = s.world.time = .6;
    for (let k = 0; k < 30; k++) s.perception.record(s.agents);
    const lb = s.defense.filter(d => d.runFit?.kind === 'insert' && (d.pos.y - s.ballY) * ps < 0)
      .sort((p, q) => Math.abs(p.pos.y - s.ballY) - Math.abs(q.pos.y - s.ballY))[0];
    expect(lb).toBeDefined();
    Object.defineProperty(lb.mind, 'placementError', { get: () => 0 });
    return { lb, ps, cmd: executeRunFit(lb, s, lb.runFit!.gap, lb.runFit!.side) };
  }

  it.each([false, true])('flows a backside backer toward the side the back stepped, flip=%s', async flip => {
    const off = await stage('0', .8, flip), on = await stage('1', .8, flip);
    expect(off.lb.tags.has('fit-flow-read')).toBe(false);
    expect(on.lb.tags.has('fit-flow-read')).toBe(true);
    expect(on.cmd.vel.y * on.ps).toBeGreaterThan(off.cmd.vel.y * off.ps);
  });

  it('does not flow before the back has stepped', async () => {
    const on = await stage('1', 0, false);
    expect(on.lb.tags.has('fit-flow-read')).toBe(false);
  });
});

describe('MESH_TEMPO back takes the handoff moving', () => {
  /** The back's speed when the QB gives him the ball. */
  async function handoffSpeed(flags: Record<string, string>, formationId: string, run: string, flip = false) {
    const s = await sim(flags, formationId, run, flip);
    const back = s.slot('RB')!, mesh = { ...runner(s).mesh };
    let settled = 0;
    while (s.phase === 'live' && s.handoffAt < 0 && s.t < 3) {
      s.tick();
      if (s.handoffAt < 0 && s.t > .1 && s.t < .3 && Math.hypot(s.intents[back.idx].vel.x, s.intents[back.idx].vel.y) === 0) settled++;
    }
    expect(s.handoffAt).toBeGreaterThan(0);
    return { speed: Math.hypot(back.vel.x, back.vel.y), settled, mesh, sim: s };
  }

  it.each([false, true])('under center: settles after the snap, then takes the ball at run tempo, flip=%s', async flip => {
    const off = await handoffSpeed({ UC_MESH: '1', MESH_TEMPO: '0' }, 'ace_11', 'iz_strong', flip);
    const on = await handoffSpeed({ UC_MESH: '1', MESH_TEMPO: '1' }, 'ace_11', 'iz_strong', flip);
    expect(on.settled).toBeGreaterThan(0);
    expect(on.speed).toBeGreaterThan(off.speed + 1);
  });

  it.each([false, true])('shotgun: GUN_MESH_SIDE puts the spot on the back\'s own side; MESH_TEMPO alone keeps the installed spot, flip=%s', async flip => {
    for (const run of ['iz_strong', 'iz_weak']) {
      const off = await sim({ MESH_TEMPO: '0', GUN_MESH_SIDE: '0' }, 'gun_doubles_11', run, flip);
      const tempo = await sim({ MESH_TEMPO: '1', GUN_MESH_SIDE: '0' }, 'gun_doubles_11', run, flip);
      const side = await sim({ MESH_TEMPO: '0', GUN_MESH_SIDE: '1' }, 'gun_doubles_11', run, flip);
      expect(runner(tempo).mesh).toEqual(runner(off).mesh);
      expect(handoff(side).mesh).toEqual(handoff(off).mesh);
      expect(handoff(side).meshTime).toBe(handoff(off).meshTime);
      const back = side.offAlign.spots[side.slot('RB')!.slot]!.pos.y - side.ballY;
      expect(Math.sign(runner(side).mesh.y - side.ballY)).toBe(Math.sign(back));
    }
  });

  it.each([false, true])('shotgun: with the own-side spot the back takes the ball faster, flip=%s', async flip => {
    for (const run of ['iz_strong', 'iz_weak']) {
      const off = await handoffSpeed({ MESH_TEMPO: '0', GUN_MESH_SIDE: '0' }, 'gun_doubles_11', run, flip);
      const on = await handoffSpeed({ MESH_TEMPO: '1', GUN_MESH_SIDE: '1' }, 'gun_doubles_11', run, flip);
      expect(on.speed).toBeGreaterThan(off.speed + .5);
    }
  });

  it.each([false, true])('under center, tempo engages only with UC_MESH and keeps the stretch exchange, flip=%s', async flip => {
    for (const run of ['iz_strong', 'oz_strong']) {
      const alone = await sim({ MESH_TEMPO: '1', UC_MESH: '0' }, 'ace_11', run, flip);
      const off = await sim({ MESH_TEMPO: '0', UC_MESH: '0' }, 'ace_11', run, flip);
      expect((alone.slot('RB')!.behavior as unknown as { tempo: boolean }).tempo).toBe(false);
      expect(runner(alone).meshTime).toBe(runner(off).meshTime);
      const pkg = await sim({ MESH_TEMPO: '1', UC_MESH: '1' }, 'ace_11', run, flip);
      expect((pkg.slot('RB')!.behavior as unknown as { tempo: boolean }).tempo).toBe(true);
      while (pkg.phase === 'live' && pkg.handoffAt < 0 && pkg.t < 3) pkg.tick();
      expect(pkg.handoffAt).toBeGreaterThan(0);
    }
    const gun = await sim({ MESH_TEMPO: '1', UC_MESH: '0' }, 'gun_doubles_11', 'iz_strong', flip);
    expect((gun.slot('RB')!.behavior as unknown as { tempo: boolean }).tempo).toBe(true);
  });

  it('leaves the draw back on his delayed timing', async () => {
    const { RunnerToMesh } = await import('../src/sim/assign.js');
    const s = await sim({ MESH_TEMPO: '1' }, 'gun_doubles_11', 'draw');
    expect((s.slot('RB')!.behavior as InstanceType<typeof RunnerToMesh>).tempo).toBe(false);
  });
});
