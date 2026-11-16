/** Dither budget (engine rule: only a decision changes direction; see CLAUDE.md, Model rules).
 *
 * This measures REQUESTS, never outcomes: how often players ask for a new direction (> 20 deg between ticks) and then
 * undo it within 0.3 s (scripts/diag/effective-mass/dither-core.ts). It never rewards or bans a technique, a block win
 * or a yardage result; it fails only when a change makes players re-aim and take it back more often.
 *
 * Panel: 135 fixed plays on the current engine defaults (the reference stack's `on` flags): eight run concepts from
 * ace_12 against a base 4-3 Under (inside, gap and outside runs) and six quick pass concepts from gun_doubles_11
 * against nickel Over in cover 3 / cover 1, seeds 1-5; four screens from gun_trips_11 (carriers in traffic, pursuit),
 * seeds 1-10; three deep concepts against cover 2 (checkdowns, scrambles) and two play-action shots against cover 1,
 * seeds 1-5. Teams come from fixed generator seeds; nothing is sampled.
 *
 * Budget = recorded x 1.10 + 2 sqrt(recorded events) / moving seconds: two standard deviations of the event count,
 * since a changed engine sends the same snaps down different paths. Per controller (reversed re-aims per second of
 * moving time) and per (controller, post-decision stage); keys with fewer than 5 reversed re-aims are not recorded. A
 * change that lowers a value lowers its budget in the same PR, so dither cannot creep back. DITHER_PRINT=1 prints the
 * table with each key's events and slack. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** DITHER_PANEL_SEED=100 (a multiple of 2) re-draws every play's random numbers with the same calls and flips: for measuring how far a row moves with the draw alone (docs/reviews/2026-11-16-dither-small-sample.md). 0 is the recorded panel. */
const PANEL_SEED = Number(process.env.DITHER_PANEL_SEED ?? 0);
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

/** Measured 2026-11-12 on develop 121d458b (engine-49, PURSUIT_FIELD on). */
const MEASURED: { controller: Record<string, [number, number, number]>; stage: Record<string, [number, number, number]> } = { // [reversed re-aims /s, moving s, reversed events]
  controller: { // budget = rate x 1.10 + 2 sqrt(events) / moving s
    QB: [0.1051, 333, 35], 'QB facing': [0.2052, 297, 61], // facing: dither-core's facing reader (QB lane, 2026-11-16), recorded on engine-71
    block: [0.3195, 4361, 1393], rush: [0.2871, 2787, 800], coverage: [0.3825, 4149, 1587],
    carrier: [0.3686, 296, 109], route: [0.1648, 1311, 216], pursuit: [0.6220, 135, 84] /* engine-72 re-record: a small sample (84 events) that moves 10-15 events with any one of three unrelated groups off, including MIRROR_SCATTER, which only changes alignment scatter; was [0.4110, 102, 42]. Panel seed 100 reads 0.571 with everything on, and no group is a source on either seed (docs/REFERENCE_STACK.md, engine-72). */,
  },
  stage: {
    'QB / spacing': [0.0511, 333, 17], 'block / spacing': [0.0683, 4361, 298], 'block / engagement': [0.1456, 4361, 635],
    'rush / mode switch': [0.0589, 2787, 164], 'rush / spacing': [0.0736, 2787, 205], 'rush / engagement': [0.0294, 2787, 82],
    'rush / tackle bond': [0.0075, 2787, 21], 'coverage / spacing': [0.1056, 4149, 438], 'coverage / mode switch': [0.0304, 4149, 126],
    'coverage / tackle bond': [0.0101, 4149, 42], 'coverage / containment': [0.0260, 4149, 108], 'carrier / spacing': [0.1217, 296, 36],
    'carrier / mode switch': [0.0406, 296, 12], 'route / spacing': [0.0084, 1311, 11],
  },
};

async function measure() {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID, RUN_BY_ID, SCREEN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const core = await import('../scripts/diag/effective-mass/dither-core.js');
  core.instrument(PlaySim);
  const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 });
  const defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
  const acc: import('../scripts/diag/effective-mass/dither-core.js').Acc = {};
  for (const run of ['oz_strong', 'oz_weak', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss', 'duo']) for (let seed = 1; seed <= 5; seed++) {
    const formation = FORMATION_BY_ID.ace_12;
    const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
      los: 35, ballY: 26.65, firstDownX: 45, seed: seed + PANEL_SEED } as never);
    core.watch(sim, acc); sim.run();
  }
  for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'slant_flat', 'four_verts']) for (let seed = 1; seed <= 5; seed++) {
    const formation = FORMATION_BY_ID.gun_doubles_11;
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'o31' },
      los: 35, ballY: 26.65, firstDownX: 45, seed: seed + PANEL_SEED } as never);
    core.watch(sim, acc); sim.run();
  }
  for (const pass of ['bubble_screen', 'rb_slip_screen', 'tunnel_screen', 'wide_now_screen', 'four_verts', 'y_cross', 'flood', 'pa_shot', 'pa_flood'])
    for (let seed = 1; seed <= (pass.includes('screen') ? 10 : 5); seed++) {
    const deep = !pass.includes('screen'), formation = deep ? FORMATION_BY_ID.gun_doubles_11 : FORMATION_BY_ID.gun_trips_11;
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: deep ? PASS_BY_ID[pass] : SCREEN_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: pass.startsWith('pa_') ? COVERAGE_BY_ID.cover1 : deep ? COVERAGE_BY_ID.cover2 : seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1,
        pressure: null, zoneStyle: 'spot', label: 'scr' },
      los: 35, ballY: 26.65, firstDownX: 45, seed: seed + PANEL_SEED } as never);
    core.watch(sim, acc); sim.run();
  }
  return core.rates(acc);
}

describe('dither budget: players do not re-aim and take it back more often than the recorded engine', () => {
  it('per controller and per post-decision stage, reversed re-aims per second stay within budget (measured x 1.10)', async () => {
    const now = await measure();
    const slack = (moving: number, events: number) => 2 * Math.sqrt(events) / moving;
    if (process.env.DITHER_PRINT === '1') for (const kind of ['controller', 'stage'] as const) for (const [k, r] of Object.entries(now[kind]))
      if (r.reversed >= 5) console.log(`DITHER ${kind} '${k}': [${r.rate.toFixed(4)}, ${r.moving.toFixed(0)}, ${r.reversed}], // budget ${(r.rate * 1.1 + slack(r.moving, r.reversed)).toFixed(4)} (slack ${slack(r.moving, r.reversed).toFixed(4)})`);
    const over: string[] = [];
    for (const kind of ['controller', 'stage'] as const) for (const [key, [before, moving, events]] of Object.entries(MEASURED[kind])) {
      const after = now[kind][key]?.rate ?? 0, budget = before * 1.10 + slack(moving, events);
      if (after > budget + 1e-9) over.push(`${kind} ${key}: before ${before.toFixed(3)}/s, after ${after.toFixed(3)}/s (budget ${budget.toFixed(3)})`);
    }
    expect(over, `reversed re-aims over budget:\n${over.join('\n')}`).toEqual([]);
    // Every recorded controller is still measured on the panel (a renamed or vanished controller must be re-recorded).
    for (const key of Object.keys(MEASURED.controller)) expect(now.controller[key], `controller ${key} no longer measured`).toBeDefined();
  }, 300_000);

  // The receiver's release (Flex, 2026-11-15): inside releases next to an end, where the route craft and spacing meet a
  // man in his lane. Per route runner inside 5 yd of the line with the ball held: a request that turns > 20 deg from the
  // tick before and comes back within 10 deg of that heading inside 0.3 s. 50 fixed plays: slant_flat, drive, mesh,
  // y_cross, hitch_cross from gun_wing_12 (vs base 4-3) and gun_trey_11 (vs nickel), Over, cover 3 / cover 1, seeds 1-5.
  // Measured 2026-11-15 on rules/release-side (engine-67 + #756), engine defaults: 39 events in 439.6 moving s (0.0887/s);
  // CRAFT_HOLD with DECLARED_BREAK: 15 (0.034/s).
  it('the receiver\'s release: reversed re-aims per second stay within budget', async () => {
    vi.resetModules();
    for (const k of stackOn) vi.stubEnv(k, '1');
    const { Rng } = await import('../src/core/rng.js');
    const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
    const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
    const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
    const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 }), defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
    const ang = (x: number, y: number) => Math.abs(Math.atan2(Math.sin(x - y), Math.cos(x - y)));
    let ticks = 0, reversed = 0;
    for (const fid of ['gun_wing_12', 'gun_trey_11']) for (const pass of ['slant_flat', 'drive', 'mesh', 'y_cross', 'hitch_cross']) for (let seed = 1; seed <= 5; seed++) {
      const formation = FORMATION_BY_ID[fid], pers = /12/.test(formation.personnel) ? 'base43' : 'nickel';
      const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, pers),
        offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
        defCall: { personnel: pers, front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'rel' },
        los: 35, ballY: 26.65, firstDownX: 45, seed: seed + PANEL_SEED } as never);
      const dir = sim.attackDir('O'), hist = new Map<unknown, { t: number; h: number }[]>(), tick = sim.tick.bind(sim);
      sim.tick = () => {
        tick();
        if (sim.t >= 2.5 || sim.ball.kind !== 'held') return;
        for (const o of sim.offense) {
          if (o.behavior?.kind !== 'route' || (o.pos.x - sim.los) * dir > 5) continue;
          const c = sim.cmds?.[o.idx];
          if (!c || Math.hypot(c.vel.x, c.vel.y) < 1) continue;
          ticks++;
          const H = hist.get(o) ?? []; H.push({ t: sim.t, h: Math.atan2(c.vel.y, c.vel.x) }); hist.set(o, H);
          const n = H.length;
          for (let k = n - 2; n >= 3 && k >= 1 && H[n - 1].t - H[k].t <= 0.3; k--)
            if (ang(H[k].h, H[k - 1].h) > 0.35 && ang(H[n - 1].h, H[k - 1].h) < 0.17 && ang(H[n - 2].h, H[k - 1].h) >= 0.17) { reversed++; break; }
        }
      };
      sim.run();
    }
    const moving = ticks * 0.05, rate = reversed / moving, [before, recMoving, recEvents] = [0.0887, 439.6, 39];
    const budget = before * 1.10 + 2 * Math.sqrt(recEvents) / recMoving;
    if (process.env.DITHER_PRINT === '1') console.log(`DITHER release: [${rate.toFixed(4)}, ${moving.toFixed(0)}, ${reversed}], // budget ${budget.toFixed(4)}`);
    expect(rate, `release: ${rate.toFixed(4)}/s over budget ${budget.toFixed(4)}`).toBeLessThanOrEqual(budget + 1e-9);
  }, 300_000);
});

