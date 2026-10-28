/** Small mirrored role/contact reproducers. These are staged islands, not
 * full-play outcome tests. Profiles/capacities stay native; no block win,
 * hand-control score, or event time is assigned by a test. */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Vec2 } from '../src/core/vec.js';
import type { Intent } from '../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { playSideSign, readCombination, resolveJoinedCombination, RunBlocker, type Combination } from '../src/sim/behaviors/blocking.js';
import { goTo, stand } from '../src/sim/behaviors/common.js';
import { updateEngagements } from '../src/sim/engagement.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
const sides = [-1, 1] as const;

function park(sim: PlaySim, side = 1) {
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    if (side < 0) { a.body.pos.y = 2 * CENTER_Y - a.pos.y; a.body.facing *= -1; }
    a.behavior = { kind: 'idle', update: () => stand(a.facing) };
  }
  sim.t = sim.world.time = 1;
}
function place(a: Agent, x: number, lateral: number, side: number, velocity: Vec2 = { x: 0, y: 0 }) {
  a.body.pos = { x, y: CENTER_Y + side * lateral };
  a.body.vel = { x: velocity.x, y: side * velocity.y };
  a.body.facing = a.team === 'O' ? 0 : Math.PI;
}
function observe(sim: PlaySim) {
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents, sim.slot('RB')!.idx);
}
function surface(side: number, overtaken = false) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: side > 0, kind: 'run', run: overtaken ? RUN_BY_ID.wz_strong : RUN_BY_ID.iz_strong, label: 'staged surface' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11 });
  expect(playSideSign(sim, sim.offCall.run!)).toBe(side);
  park(sim, side);
  const owner = sim.slot('C')!, helper = sim.slot('LG')!, down = sim.slot('DT_W')!, backer = sim.slot('LB_W')!;
  place(owner, overtaken ? 40.3 : 40, overtaken ? 1 : -.4, side);
  place(helper, 40, overtaken ? -.4 : .4, side);
  place(down, 40.75, 0, side);
  place(backer, 44.4, 3, side);
  place(sim.slot('RB')!, 34, 1.8, side);
  place(sim.qb, 36, -2, side);
  const combo: Combination = { members: [owner, helper], defender: down, backer,
    released: false, secureSince: -1, nextRead: 0, soloKind: overtaken ? 'reach' : 'drive' };
  owner.behavior = new RunBlocker({ kind: overtaken ? 'reach' : 'drive', target: down, drive: { x: 1, y: 0 }, combination: combo });
  helper.behavior = new RunBlocker({ kind: 'combo', target: down, drive: { x: 1, y: 0 }, combination: combo });
  observe(sim);
  const keeper = overtaken ? helper : owner;
  const e = sim.engage(keeper, down, 'run', { x: 1, y: 0 });
  expect(e).not.toBeNull();
  if (!overtaken) expect(sim.engage(helper, down, 'run', { x: 1, y: 0 })).toBe(e);
  // Let the ordinary engagement/World earn initial load, rather than setting
  // control, support or joint force. This is staging, not a release-time pin.
  for (let k = 0; k < 4; k++) {
    const intents: Intent[] = sim.agents.map(a => stand(a.facing));
    updateEngagements(sim, intents);
    sim.world.step(intents, sim.dt);
    sim.t += sim.dt;
  }
  observe(sim);
  return { sim, owner, helper, down, backer, combo, e: e!, side };
}

/** Hold the staged bodies/pictures while the real personal reads run. This
 * isolates the release decision; it does not certify a later block win. */
function readSurface(f: ReturnType<typeof surface>, beats = 20) {
  const bodies = f.sim.agents.map(a => structuredClone(a.body));
  for (let k = 0; k < beats && !f.combo.released; k++) {
    for (const a of f.combo.members) readCombination(a, f.sim, f.combo, true);
    resolveJoinedCombination(f.sim, f.combo);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
    f.sim.t += f.sim.dt;
    f.sim.world.time = f.sim.t;
    observe(f.sim);
  }
}

describe('mirrored small run-game scenes', () => {
  it.each(sides.flatMap(side => (['fill', 'scrape'] as const).map(cue => ({ side, cue }))))
    ('double: one earned departure for a $cue backer, side $side', ({ side, cue }) => {
      const f = surface(side);
      f.backer.body.vel = cue === 'fill' ? { x: -3, y: 0 } : { x: 0, y: side * 4 };
      observe(f.sim);
      const hands = new Map([[f.owner, f.e.hands], [f.helper, f.e.helperHands!.get(f.helper)]]);
      readSurface(f);
      expect(f.combo.released).toBe(true);
      const stay = f.combo.members.filter(a => a.engagement === f.e);
      const go = f.combo.members.filter(a => a.engagement === null);
      expect(stay).toHaveLength(1); expect(go).toHaveLength(1);
      expect((go[0].behavior as RunBlocker).target).toBe(f.backer);
      expect(f.e.blocker).toBe(stay[0]); expect(f.e.helpers).toHaveLength(0);
      expect(f.e.hands).toBe(hands.get(stay[0]));
      expect(f.sim.events.filter(e => e.type === 'block_climb')).toHaveLength(1);
    });

  it.each(sides)('double: a retreating backer does not manufacture urgency, side %s', side => {
    const f = surface(side);
    place(f.backer, 47, 3, side, { x: 2, y: 0 }); observe(f.sim);
    readSurface(f);
    expect(f.combo.released).toBe(false);
    expect(f.e.helpers).toHaveLength(1);
    expect(f.sim.events.some(e => e.type === 'block_climb')).toBe(false);
  });

  it.each(sides)('double: a distant scrape away from the play retains the double, side %s', side => {
    const f = surface(side);
    f.backer.body.vel = { x: 0, y: -side * 4 }; observe(f.sim);
    readSurface(f);
    expect(f.combo.released).toBe(false);
    expect(f.e.helpers).toHaveLength(1);
  });

  it.each(sides)('double: a filling backer cannot certify two turned-away chests, side %s', side => {
    const f = surface(side);
    place(f.backer, 42, 1.5, side, { x: -3, y: 0 });
    f.owner.body.facing = f.helper.body.facing = Math.PI; observe(f.sim);
    readSurface(f);
    expect(f.combo.released).toBe(false);
    expect(f.owner.engagement).toBe(f.e); expect(f.helper.engagement).toBe(f.e);
  });

  it.each(sides)('overtake: an off-contact owner confirms his keeper before climbing, side %s', side => {
    const f = surface(side, true);
    place(f.backer, 43, 2.5, side, { x: -2, y: 0 }); observe(f.sim);
    const hands = f.e.hands;
    readCombination(f.owner, f.sim, f.combo);
    expect(f.combo.released).toBe(false); // New reader has not confirmed a surface yet.
    readSurface(f);
    expect(f.combo.released).toBe(true);
    expect(f.owner.engagement).toBeNull();
    expect((f.owner.behavior as RunBlocker).target).toBe(f.backer);
    expect(f.helper.engagement).toBe(f.e); expect(f.e.hands).toBe(hands);
    expect(f.e.helpers).toHaveLength(0);
    expect(f.sim.events.filter(e => e.type === 'block_climb')).toHaveLength(1);
  });

  it.each(sides)('overtake: no keeper contact means no credited handoff, side %s', side => {
    const f = surface(side, true);
    f.sim.disengage(f.e); observe(f.sim);
    readSurface(f);
    expect(f.combo.released).toBe(false);
    expect(f.sim.events.some(e => e.type === 'block_climb')).toBe(false);
  });

  it.each(sides)('climb: keeps the backer objective while reading keeper/down-man traffic, side %s', side => {
    const commandFor = (blocked: boolean) => {
      const f = surface(side, true);
      place(f.owner, 39.8, 1.1, side);
      place(f.backer, 43, -1.1, side);
      const controller = new RunBlocker({ kind: 'climb', target: f.backer, drive: { x: 1, y: 0 } });
      // Translate both first-level bodies together for the clear-picture control;
      // their own contact is unchanged. No World execution is claimed here.
      if (!blocked) { f.helper.body.pos.y += side * 8; f.down.body.pos.y += side * 8; }
      f.owner.behavior = controller; observe(f.sim);
      const body = structuredClone(f.owner.body), hands = f.e.hands;
      const command = controller.update(f.owner, f.sim);
      expect(controller.target).toBe(f.backer);
      expect(f.owner.engagement).toBeNull(); expect(f.owner.body).toEqual(body);
      expect(f.helper.engagement).toBe(f.e); expect(f.e.hands).toBe(hands);
      const access = Reflect.get(controller, 'climbAccess');
      if (blocked) { expect(access).not.toBeNull(); expect(access.obstacle).toBe(f.down.idx); }
      else expect(access).toBeNull();
      expect(command.vel).not.toEqual({ x: 0, y: 0 });
      expect(f.sim.events.some(e => e.type === 'block_contact' && e.a === f.owner.idx)).toBe(false);
      return command;
    };
    expect(commandFor(true)).not.toEqual(commandFor(false));
  });

  it.each(sides)('pull: a closing end meets ordinary fit/movement/contact, side %s', side => {
    const inputs = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/puller-access-inputs.json.gz', import.meta.url))).toString());
    const input = structuredClone(inputs.rows.find((r: { id: string }) => r.id === 'K03').setup) as PlaySetup;
    input.record = false;
    const sim = new PlaySim(input), puller = sim.slot('LG')!, installed = puller.behavior as RunBlocker;
    installed.update(puller, sim); // Initialize the installed stance before the staged corner.
    const plan = installed.plan, end = plan.target!;
    park(sim, side);
    place(puller, sim.los - 1.2, .8, side);
    place(end, sim.los + 1, 1.2, side, { x: -2.5, y: 0 });
    const rb = sim.slot('RB')!; place(rb, sim.los - 4, .8, side);
    if (side < 0) {
      for (const point of plan.pullPath!) point.y = 2 * CENTER_Y - point.y;
      for (const spot of Object.values(sim.offAlign.spots)) if (spot) spot.pos.y = 2 * CENTER_Y - spot.pos.y;
      const home = Reflect.get(installed, 'homeY');
      if (typeof home === 'number') Reflect.set(installed, 'homeY', 2 * CENTER_Y - home);
      plan.drive.y *= -1; sim.offAlign.strongSign *= -1;
      sim.offCall.flip = !sim.offCall.flip;
    }
    puller.behavior = installed;
    Reflect.set(installed, 'pullIdx', 2); Reflect.set(installed, 'pullCleared', true);
    end.behavior = { kind: 'idle', update: () => goTo(end, rb.pos, { speed: .65 }) };
    sim.ball = { kind: 'held', carrier: rb }; observe(sim);
    const before = structuredClone(puller.body), first = installed.update(puller, sim);
    expect(first.vel.x).toBeGreaterThan(0);
    expect(installed.target).toBe(end);
    expect(puller.body).toEqual(before); expect(puller.engagement).toBeNull();
    let physicalEncounter = false, advanced = false;
    const x = puller.pos.x;
    for (let k = 0; k < 60 && sim.phase === 'live'; k++) {
      sim.tick(); advanced ||= puller.pos.x > x;
      physicalEncounter ||= !!sim.lastStep?.contacts.some(c =>
        (c.i === end.idx && c.j === puller.idx) || (c.j === end.idx && c.i === puller.idx));
      if (puller.engagement) {
        expect(puller.engagement.defender).toBe(end);
        expect(sim.world.joints).toContain(puller.engagement.hands);
        physicalEncounter = true;
      }
      physicalEncounter ||= sim.events.some(e => e.type === 'carrier_contact' && (e.a === end.idx || e.b === end.idx));
      if (physicalEncounter) break;
    }
    expect(advanced).toBe(true);
    expect(physicalEncounter).toBe(true);
    // Neither a puller win nor a runner gain is required: the end may beat
    // the fit and contact the back. No contact is awarded just for the aim.
  });
});
