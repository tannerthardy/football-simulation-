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
 * Budget = recorded x 1.10 + 2 sqrt(recorded events) / moving seconds (x 1.4 for the pooled small rows): two standard deviations of the event count,
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

/** Rows read from three pooled panel draws: the small ones (fewer than 150 events on one panel), recorded from the pooled mean. Their slack is two Poisson standard deviations of the
 * pooled events, times the measured overdispersion of reversed re-aims (events come in bursts inside a play): 1.4 on pursuit, about 1 elsewhere. */
const POOLED = new Set(['controller QB', 'controller QB facing', 'controller carrier', 'controller pursuit', 'stage QB / spacing', 'stage rush / engagement', 'stage rush / tackle bond',
  'stage coverage / mode switch', 'stage coverage / tackle bond', 'stage coverage / containment', 'stage carrier / spacing', 'stage carrier / mode switch', 'stage route / spacing']);
const POOLED_DISPERSION = 1.4;

/** Measured 2026-11-12 on develop 121d458b (engine-49, PURSUIT_FIELD on). The POOLED rows (above) were re-recorded 2026-11-16 from three pooled panel draws (moving s and events are the pool's), on the engine-72
 * defaults with the engine-73 set off (its flags and numerics QB_FOOTWORK, ZONE_HOLD, END_KEY, OFF_PEDAL stubbed to 0), in the project the test runs in now (core-defaults: BALL_EST 6145 and SIGHT_STALE 7 at their
 * defaults). The first pooled record, on ae9f566c4, ran with every numeric pinned to 0, which is not the engine the test runs on (it read pursuit 0.4025, containment 0.0031, carrier / spacing 0.0847). */
const MEASURED: { controller: Record<string, [number, number, number]>; stage: Record<string, [number, number, number]> } = { // [reversed re-aims /s, moving s, reversed events]
  controller: { // budget = rate x 1.10 + 2 sqrt(events) / moving s
    QB: [0.0782, 882, 69], 'QB facing': [0.1665, 847, 141], // facing: dither-core's facing reader (QB lane, 2026-11-16), recorded on engine-71
    block: [0.3195, 4361, 1393], rush: [0.2871, 2787, 800], coverage: [0.3825, 4149, 1587],
    carrier: [0.3897, 785, 306], // re-recorded engine-92 (PERIPH_ACUITY on; pooled, three draws): the QB's re-priced options move his head (curl_flat seed 5: 0.003 rad at 1.90 s, same throw and catch), defenders reading his eyes break on other lines, and the run after the catch meets them elsewhere; 148 of 285 pass plays change course; no stage flips (carrier / spacing 27 -> 33, mode switch 0 -> 3 on the pass plays; carrier / spacing 0.1312 inside its own budget); as ZONE_EYES on engine-75. Was [0.2963, 854, 253] route: [0.1648, 1311, 216], pursuit: [0.5950, 333, 198],
  },
  stage: {
    'QB / spacing': [0.0283, 882, 25], 'block / spacing': [0.0683, 4361, 298], 'block / engagement': [0.1456, 4361, 635],
    'rush / mode switch': [0.0589, 2787, 164], 'rush / spacing': [0.0736, 2787, 205], 'rush / engagement': [0.0415, 7756, 322],
    'rush / tackle bond': [0.0055, 7756, 43], 'coverage / spacing': [0.1056, 4149, 438], 'coverage / mode switch': [0.0277, 11522, 319],
    'coverage / tackle bond': [0.0080, 11522, 92], 'coverage / containment': [0.0020, 11522, 23], 'carrier / spacing': [0.1230, 789, 97], // re-recorded engine-77 (ZONE_EYES on; the same with ZONE_EYES=0 on this head). On engine-75 the flag added 5 reversals, all in one play (mesh seed 1, +2/+3 in the +100/+200 draws) whose carrier ran a different course with the zone defenders' eyes moved; no stage flipped; ARM_BREAK (engine-76) absorbed it
    'carrier / mode switch': [0.0070, 854, 6],
    'route / spacing': [0.0090, 4011, 36],
  },
};

async function measure(shift = 0) {
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
      los: 35, ballY: 26.65, firstDownX: 45, seed: seed + PANEL_SEED + shift } as never);
    core.watch(sim, acc); sim.run();
  }
  for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'slant_flat', 'four_verts']) for (let seed = 1; seed <= 5; seed++) {
    const formation = FORMATION_BY_ID.gun_doubles_11;
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'o31' },
      los: 35, ballY: 26.65, firstDownX: 45, seed: seed + PANEL_SEED + shift } as never);
    core.watch(sim, acc); sim.run();
  }
  for (const pass of ['bubble_screen', 'rb_slip_screen', 'tunnel_screen', 'wide_now_screen', 'four_verts', 'y_cross', 'flood', 'pa_shot', 'pa_flood'])
    for (let seed = 1; seed <= (pass.includes('screen') ? 10 : 5); seed++) {
    const deep = !pass.includes('screen'), formation = deep ? FORMATION_BY_ID.gun_doubles_11 : FORMATION_BY_ID.gun_trips_11;
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: deep ? PASS_BY_ID[pass] : SCREEN_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: pass.startsWith('pa_') ? COVERAGE_BY_ID.cover1 : deep ? COVERAGE_BY_ID.cover2 : seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1,
        pressure: null, zoneStyle: 'spot', label: 'scr' },
      los: 35, ballY: 26.65, firstDownX: 45, seed: seed + PANEL_SEED + shift } as never);
    core.watch(sim, acc); sim.run();
  }
  return core.rates(acc);
}

describe('dither budget: players do not re-aim and take it back more often than the recorded engine', () => {
  it('per controller and per post-decision stage, reversed re-aims per second stay within budget (measured x 1.10)', async () => {
    // Rows with few events are read from the pool of three panel draws (the same plays and calls, the play seeds shifted by 100 and 200),
    // and recorded from the pool, so one draw cannot set or break a budget (docs/reviews/2026-11-16-dither-small-sample.md). The rest read the one panel.
    const draws = [await measure(0)];
    const now = draws[0]!;
    if (POOLED.size) {
      draws.push(await measure(100), await measure(200));
      for (const kind of ['controller', 'stage'] as const) for (const key of Object.keys(MEASURED[kind])) {
        if (!POOLED.has(`${kind} ${key}`)) continue;
        const rows = draws.map(d => d[kind][key]).filter(Boolean) as { moving: number; reversed: number }[];
        const moving = rows.reduce((t, r) => t + r.moving, 0), reversed = rows.reduce((t, r) => t + r.reversed, 0);
        now[kind][key] = { ...(rows[0] ?? { moving: 0, reversed: 0 }), moving, reversed, rate: moving ? reversed / moving : 0 } as never;
      }
    }
    const slack = (moving: number, events: number, kind: string, key: string) => (POOLED.has(`${kind} ${key}`) ? POOLED_DISPERSION : 1) * 2 * Math.sqrt(events) / moving;
    if (process.env.DITHER_PRINT === '1') for (const kind of ['controller', 'stage'] as const) for (const [k, r] of Object.entries(now[kind]))
      if (r.reversed >= 5) console.log(`DITHER ${kind} '${k}'${POOLED.has(`${kind} ${k}`) ? ' (pooled)' : ''}: [${r.rate.toFixed(4)}, ${r.moving.toFixed(0)}, ${r.reversed}], // budget ${(r.rate * 1.1 + slack(r.moving, r.reversed, kind, k)).toFixed(4)} (slack ${slack(r.moving, r.reversed, kind, k).toFixed(4)})`);
    const over: string[] = [];
    for (const kind of ['controller', 'stage'] as const) for (const [key, [before, moving, events]] of Object.entries(MEASURED[kind])) {
      const after = now[kind][key]?.rate ?? 0, budget = before * 1.10 + slack(moving, events, kind, key);
      if (after > budget + 1e-9) over.push(`${kind} ${key}: before ${before.toFixed(3)}/s, after ${after.toFixed(3)}/s (budget ${budget.toFixed(3)})`);
    }
    expect(over, `reversed re-aims over budget:\n${over.join('\n')}`).toEqual([]);
    // Every recorded controller is still measured on the panel (a renamed or vanished controller must be re-recorded).
    for (const key of Object.keys(MEASURED.controller)) expect(now.controller[key], `controller ${key} no longer measured`).toBeDefined();
  }, 900_000);

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

