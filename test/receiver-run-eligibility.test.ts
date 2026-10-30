import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker, planRunBlocking } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
const saved = JSON.parse(readFileSync(new URL('./fixtures/receiver-run-assignment-g1-p018.json', import.meta.url), 'utf8'));
function fixture(mirror = false) {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_bunch_11, flip: mirror ? !saved.installationFlip : saved.installationFlip,
      kind: 'run', run: RUN_BY_ID.oz_strong, label: 'outside zone' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover0,
      pressure: PRESSURE_BY_ID.zero_6, label: 'press' }, los: saved.los, ballY: saved.ballY, firstDownX: 55, seed: 3, audibles: false });
  for (const a of sim.agents) {
    const [x, y] = saved.positions[a.slot]; a.body.pos = { x, y: mirror ? 2 * saved.ballY - y : y };
  }
  return sim;
}

describe('receiver run candidates follow actual installed ownership', () => {
  it.each([false, true])('keeps the nearby unowned press threats eligible in saved G1-P018 geometry (mirror=%s)', mirror => {
    const sim = fixture(mirror), plans = planRunBlocking(sim, RUN_BY_ID.oz_strong);
    const stalks = [...plans.values()].filter(p => p.kind === 'stalk');
    expect(stalks.map(p => p.target)).toContain(sim.slot('CB_S'));
    expect(stalks.map(p => p.target)).toContain(sim.slot('NB'));
    expect(new Set(stalks.map(p => p.target)).size).toBe(stalks.length);
    // Preserve the actual end threat responsible for the saved runner contact.
    expect(plans.get(sim.slot('RT')!)?.target).toBe(sim.slot('DE_S'));
    expect(plans.get(sim.slot('LG')!)?.climbTo).toBe(sim.slot('LB_M'));
  });

  it.each([false, true])('does not let receivers steal a real inline down threat or an installed combo backer (mirror=%s)', mirror => {
    const sim = fixture(mirror), plans = planRunBlocking(sim, RUN_BY_ID.oz_strong);
    const targets = [...plans.values()].filter(p => p.kind === 'stalk').map(p => p.target);
    for (const slot of ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'LB_M']) expect(targets).not.toContain(sim.slot(slot));
  });

  it.each(['counter', 'trap', 'power'].flatMap((run) => [[run, false], [run, true]]))('keeps the %s reserved pull/kick targets out of receiver work (mirror=%s)', (run, mirror) => {
    const sim = fixture(mirror as boolean), plans = planRunBlocking(sim, RUN_BY_ID[run as string]);
    const core = [...plans.values()].filter(p => p.kind !== 'stalk');
    const reserved = new Set(core.flatMap(p => [p.target, p.climbTo, p.combination?.backer]).filter(Boolean));
    const stalks = [...plans.values()].filter(p => p.kind === 'stalk');
    expect(core.some(p => p.kind === 'pull')).toBe(true);
    for (const p of stalks) expect(reserved.has(p.target)).toBe(false);
  });

  it.each([false, true])('a receiver split wide stalks the corner over him, not a backer across the formation (mirror=%s)', mirror => {
    // Develop's ledger sent X, 18 yd outside, to LB_W 16 yd inside him while
    // CB_W pressed one yard in front of him went unblocked.
    const sim = fixture(mirror), plans = planRunBlocking(sim, RUN_BY_ID.oz_strong);
    expect(plans.get(sim.slot('X')!)?.target).toBe(sim.slot('CB_W'));
  });

  function look(formation: string, run: string, front: string, personnel: string, coverage: string, flip: boolean) {
    const f = FORMATION_BY_ID[formation];
    return new PlaySim({ offense: pickOffense(offense, f.personnel), defense: pickDefense(defense, personnel as never),
      offCall: { formation: f, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: personnel as never, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID[coverage], pressure: null, label: front },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  }

  const looks = [['gun_spread_10', 'iz_strong', 'wide9', 'nickel', 'cover3'], ['ace_11', 'oz_strong', 'over', 'base43', 'cover3'],
    ['pistol_11', 'power', 'under', 'base43', 'cover1'], ['gun_trips_11', 'counter', 'over', 'base43', 'cover3'],
    ['gun_wing_12', 'power', 'over', 'base43', 'cover3'], ['heavy_13', 'trap', 'wide9', 'nickel', 'cover3']] as const;
  it.each(looks.flatMap((c) => [[...c, false], [...c, true]]))('%s %s vs %s %s %s: receivers block men in reach (gap runs keep their ledger), front men only from the core (flip=%s)',
    (formation, run, front, personnel, coverage, flip) => {
      const sim = look(formation, run, front, personnel, coverage, flip as boolean);
      const core = Math.max(Math.abs(sim.offAlign.coreEdge.S - CENTER_Y), Math.abs(sim.offAlign.coreEdge.W - CENTER_Y)) + 2;
      const stalkers = sim.offense.filter((a) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'stalk');
      const line = sim.offense.filter((a) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot) || sim.offAlign.spots[a.slot]?.inline);
      const lateral = (d: { pos: { y: number } }, group: typeof line) => Math.min(...group.map((o) => Math.abs(o.pos.y - d.pos.y)));
      for (const a of stalkers) {
        const d = (a.behavior as RunBlocker).plan.target!;
        // The deep secondary is anyone's: the ledger pairs it by distance.
        if (d.pos.x - sim.los >= 7.5 || Math.abs(d.pos.y - CENTER_Y) >= 8) continue;
        // Gap runs keep their receiver ledger (the crack and closest pairs)
        // for every man off the front; only front men stay the core's.
        const gap = ['power', 'counter', 'trap'].includes(RUN_BY_ID[run].scheme);
        if (gap && !(d.pos.x - sim.los < 2 && lateral(d, line) < lateral(d, stalkers))) continue;
        expect(Math.abs(d.pos.y - a.pos.y), `${a.slot} -> ${d.slot}`).toBeLessThanOrEqual(4.5);
        if (d.pos.x - sim.los < 2 && lateral(d, line) < lateral(d, stalkers))
          expect(Math.abs(a.pos.y - CENTER_Y), `${a.slot} -> ${d.slot} on the surface`).toBeLessThanOrEqual(core);
      }
    });

  // Positions move: what a receiver blocks is decided by where a defender
  // stands relative to him, not the defender's label.
  it.each([['LB_W', 4.5], ['DE_W', .9]] as const)('four wide vs a 4-3: %s aligned over the slot (depth %s) is the slot\'s man', (slot, depth) => {
    const sim = look('gun_spread_10', 'iz_strong', 'over', 'base43', 'cover3', false);
    const y = sim.slot('Y')!, d = sim.slot(slot)!;
    d.body.pos = { x: sim.los + depth, y: y.pos.y + .5 };
    const plans = planRunBlocking(sim, RUN_BY_ID.iz_strong);
    expect(plans.get(y)?.target).toBe(d);
  });

  // Competing receiver jobs: trips to one side and a safety walked into the box
  // on that side (gap-assignment's 4.4 yd deep, 6.1 yd outside the ball).
  function walkedDown(run: string, flip: boolean) {
    const sim = look('gun_trips_11', run, 'over', 'base43', 'cover3', flip);
    const receivers = sim.offense.filter((a) => a.player.position === 'WR' || a.player.position === 'TE');
    const side = Math.sign(receivers.reduce((t, a) => t + Math.sign(a.pos.y - CENTER_Y), 0));
    const ss = sim.slot('SS')!;
    ss.body.pos = { x: sim.los + 4.4, y: CENTER_Y + side * 6.1 };
    const plans = planRunBlocking(sim, RUN_BY_ID[run]);
    const owners = [...plans].filter(([, p]) => p.target === ss || p.climbTo === ss || p.combination?.backer === ss);
    const stalkers = owners.filter(([, p]) => p.kind === 'stalk').map(([a]) => a);
    const stalkTargets = [...plans.values()].filter((p) => p.kind === 'stalk').map((p) => p.target);
    return { sim, ss, owners, stalkers, stalkTargets };
  }
  it.each(['counter', 'power', 'trap'].flatMap((run) => [[run, false], [run, true]]))('%s: the walked-down safety on the trips side has one owner, a receiver cracks him only when no lineman or puller has him (flip=%s)', (run, flip) => {
    const { ss, owners, stalkers, stalkTargets } = walkedDown(run as string, flip as boolean);
    expect(owners.length).toBeGreaterThan(0);
    expect(stalkers.length).toBeLessThanOrEqual(1);
    if (stalkers.length) expect(owners.length).toBe(1);
    expect(new Set(stalkTargets).size).toBe(stalkTargets.length);
    expect(stalkTargets.filter((d) => d === ss).length).toBe(stalkers.length);
  });
  it.each(['oz_strong', 'iz_strong'].flatMap((run) => [[run, false], [run, true]]))('%s: the walked-down safety goes only to a receiver in reach of him, never two (flip=%s)', (run, flip) => {
    const { ss, stalkers, stalkTargets } = walkedDown(run as string, flip as boolean);
    expect(stalkers.length).toBeLessThanOrEqual(1);
    for (const a of stalkers) expect(Math.abs(a.pos.y - ss.pos.y)).toBeLessThanOrEqual(4.5);
    expect(new Set(stalkTargets).size).toBe(stalkTargets.length);
  });
});
