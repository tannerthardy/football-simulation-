/** LEAD_HIP (src/sim/behaviors/blocking.ts RunBlocker): a power/counter lead
 * turns up on the hip of the kick-out he sees and fits the first color he
 * sees in the hole. Staged pictures through the production update:
 * - the wrap corner follows the seen kicker/man relation (just inside the
 *   kicker on a kick-out, no wider than the called hole; just outside him on
 *   a seen log) and is invariant to the kicker's private 'block-log' tag;
 *   with the flag off the tag moves it;
 * - after the turn-up the lead takes the first defender he sees unblocked in
 *   the hole, scanned inside-out; a defender with a teammate's body on him is
 *   passed over, and the kicked man stays the kicker's. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Pt = { x: number; y: number };

/** Power-I (FB kicks the end, backside guard leads) at 1.4 s, the lead on
 * his flat leg. Every defender is moved off the play except those a scene
 * places; kick: 'out' (kicker inside his man) or 'log' (outside him). */
async function stage(flag: string, dir: 'weak' | 'strong', kick: 'out' | 'log' | 'wide', tag: boolean) {
  vi.stubEnv('LEAD_HIP', flag);
  vi.resetModules();
  const { makeSim, rosters } = await import('../scripts/diag/zone-lab/lab.js');
  const { RunBlocker, playSideSign } = await import('../src/sim/behaviors/blocking.js');
  const sim = makeSim({ concept: 'power', dir, formation: 'i_pro_21', look: 'over3', roster: 'pair11', seed: 2 } as never, rosters());
  expect(sim.attackDir('O')).toBe(1);
  const side = playSideSign(sim, sim.offCall.run!);
  const lead = sim.offense.find(o => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull' && o.behavior.plan.pullRole === 'lead')!;
  const controller = lead.behavior as InstanceType<typeof RunBlocker>;
  const kicker = sim.slot('F')!, man = (kicker.behavior as InstanceType<typeof RunBlocker>).plan.target!;
  const place = (a: typeof lead, p: Pt) => { a.body.pos = { ...p }; a.body.vel = { x: 0, y: 0 }; };
  const rr = kicker.profile.radius + man.profile.radius, hole = { ...controller.plan.pullPath!.at(-1)! };
  // 'wide': the end has widened 2.5 yd and the kick lands out there.
  const endY = man.pos.y + (kick === 'wide' ? side * 2.5 : 0);
  sim.defense.forEach((d, i) => place(d, { x: sim.los + 15, y: 5 + i * 4 }));
  sim.t = 1.4; sim.world.time = 1.4;
  Reflect.set(controller, 'pullIdx', 1);
  place(lead, { x: sim.los - 1.15, y: endY - side * 3 });
  place(man, { x: sim.los - .2, y: endY });
  place(kicker, { x: sim.los - .5, y: kick === 'log' ? endY + side * .6 : endY - side * rr * .8 });
  if (tag) kicker.tags.add('block-log');
  const update = () => {
    for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
    const body = structuredClone(lead.body);
    const command = controller.update(lead, sim);
    expect(lead.body).toEqual(body);
    return { command, corner: { ...controller.plan.pullPath!.at(-1)! }, target: controller.plan.target };
  };
  const hip = kicker.profile.radius + lead.profile.radius + .15;
  // A log is read on two consecutive decisions (held one beat).
  const updateTwice = () => {
    update();
    sim.t += lead.mind.decisionInterval + 1e-3; sim.world.time = sim.t;
    return update();
  };
  return { sim, side, lead, controller, kicker, man, place, hip, hole, update, updateTwice };
}

describe('LEAD_HIP: the wrap turns up on the kick he sees', () => {
  it.each(['weak', 'strong'] as const)('corner just inside a seen kick-out, outside only a seen log; the tag is not read (%s)', async dir => {
    const out = await stage('1', dir, 'out', false), kick = out.update();
    expect((await stage('1', dir, 'out', true)).update()).toEqual(kick);
    expect((kick.corner.y - (out.kicker.pos.y - out.side * out.hip)) * out.side).toBeCloseTo(0, 6);

    const logged = await stage('1', dir, 'log', false), log = logged.updateTwice();
    expect((await stage('1', dir, 'log', true)).updateTwice()).toEqual(log);
    expect((log.corner.y - logged.kicker.pos.y) * logged.side).toBeCloseTo(logged.hip, 6);
    expect(log.corner.x).toBeGreaterThan(logged.kicker.pos.x);

    // A kick widened past the called hole: he still turns up tight in it.
    const wide = await stage('1', dir, 'wide', false), turn = wide.update();
    expect((wide.kicker.pos.y - wide.side * wide.hip - wide.hole.y) * wide.side).toBeGreaterThan(.5);
    expect(turn.corner.y).toBeCloseTo(wide.hole.y, 6);
  }, 60000);

  it('control: with the flag off the private tag alone moves the corner', async () => {
    const plain = (await stage('0', 'weak', 'out', false)).update();
    const tagged = (await stage('0', 'weak', 'out', true)).update();
    expect(tagged.corner).not.toEqual(plain.corner);
  }, 60000);

  it.each(['weak', 'strong'] as const)('after the turn-up he fits the first unblocked color in the hole, inside-out (%s)', async dir => {
    async function scene(covered: boolean) {
      const s = await stage('1', dir, 'out', false), { sim, side, man, place, controller } = s;
      s.update();
      const corner = controller.plan.pullPath!.at(-1)!;
      // Turned up just inside the kick.
      Reflect.set(controller, 'pullIdx', 2);
      place(s.lead, { x: sim.los - .3, y: corner.y });
      const [inside, outside] = sim.defense.filter(d => d !== man && /^LB/.test(d.slot));
      place(inside, { x: sim.los + 2.6, y: corner.y - side * 1.3 });
      place(outside, { x: sim.los + 2.0, y: corner.y + side * .3 });
      if (covered) {
        const c = sim.slot('C')!;
        place(c, { x: inside.pos.x - (c.profile.radius + inside.profile.radius + .05), y: inside.pos.y });
      }
      return { ...s.update(), inside, outside, man, side };
    }
    const open = await scene(false);
    expect(open.target).toBe(open.inside);
    expect(open.command.vel.y * open.side).toBeLessThan(0);
    const covered = await scene(true);
    expect(covered.target).toBe(covered.outside);
    expect(covered.target).not.toBe(covered.man);
  }, 60000);
});
