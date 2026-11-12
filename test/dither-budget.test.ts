/** Dither budget (engine rule: only a decision changes direction; see CLAUDE.md, Model rules).
 *
 * This measures REQUESTS, never outcomes: how often players ask for a new direction (> 20 deg between ticks) and then
 * undo it within 0.3 s (scripts/diag/effective-mass/dither-core.ts). It never rewards or bans a technique, a block win
 * or a yardage result; it fails only when a change makes players re-aim and take it back more often.
 *
 * Panel: 60 fixed plays on the current engine defaults (the reference stack's `on` flags): six run concepts from ace_12
 * against a base 4-3 Under, six pass concepts from gun_doubles_11 against nickel Over in cover 3 / cover 1, seeds 1-5
 * each. Teams come from fixed generator seeds; nothing is sampled.
 *
 * Budget = the value measured when the budget was set x 1.10, plus two events' worth of slack (2 / moving seconds),
 * per controller (reversed re-aims per second of moving time) and per (controller, post-decision stage). Only keys
 * measured on enough play are recorded: controllers with 30+ s moving, stages with 5+ reversed re-aims. A change that
 * lowers a value lowers its budget in the same PR, so dither cannot creep back. DITHER_PRINT=1 prints the table. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

/** Measured 2026-11-12 on develop 62b5badb (engine-48); budgets are these x 1.10. */
const MEASURED: { controller: Record<string, [number, number]>; stage: Record<string, [number, number]> } = { // [reversed re-aims /s, moving s]
  controller: {
    QB: [0.0331, 181], block: [0.3640, 1939], rush: [0.3193, 1218], coverage: [0.4751, 1684], carrier: [0.4816, 149],
    route: [0.1024, 469], pursuit: [0.4145, 39], 'loose ball': [0.0575, 35],
  },
  stage: {
    'QB / spacing': [0.0276, 181], 'block / spacing': [0.0825, 1939], 'block / engagement': [0.1495, 1939],
    'rush / mode switch': [0.0665, 1218], 'rush / spacing': [0.0558, 1218], 'rush / engagement': [0.0378, 1218],
    'rush / tackle bond': [0.0049, 1218], 'coverage / spacing': [0.1431, 1684], 'coverage / mode switch': [0.0434, 1684],
    'coverage / tackle bond': [0.0125, 1684], 'coverage / containment': [0.0463, 1684], 'carrier / spacing': [0.1605, 149],
    'carrier / mode switch': [0.0334, 149],
  },
};

async function measure() {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID, RUN_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const core = await import('../scripts/diag/effective-mass/dither-core.js');
  core.instrument(PlaySim);
  const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 });
  const defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
  const acc: import('../scripts/diag/effective-mass/dither-core.js').Acc = {};
  for (const run of ['oz_strong', 'iz_strong', 'power', 'counter', 'toss', 'duo']) for (let seed = 1; seed <= 5; seed++) {
    const formation = FORMATION_BY_ID.ace_12;
    const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
      defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    core.watch(sim, acc); sim.run();
  }
  for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'slant_flat', 'four_verts']) for (let seed = 1; seed <= 5; seed++) {
    const formation = FORMATION_BY_ID.gun_doubles_11;
    const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'o31' },
      los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    core.watch(sim, acc); sim.run();
  }
  return core.rates(acc);
}

describe('dither budget: players do not re-aim and take it back more often than the recorded engine', () => {
  it('per controller and per post-decision stage, reversed re-aims per second stay within budget (measured x 1.10)', async () => {
    const now = await measure();
    if (process.env.DITHER_PRINT === '1') for (const kind of ['controller', 'stage'] as const) for (const [k, r] of Object.entries(now[kind]))
      if (kind === 'controller' ? r.moving >= 30 : r.reversed >= 5) console.log(`DITHER ${kind} '${k}': [${r.rate.toFixed(4)}, ${r.moving.toFixed(0)}], // ${r.reversed} reversed`);
    const over: string[] = [];
    for (const kind of ['controller', 'stage'] as const) for (const [key, [before, moving]] of Object.entries(MEASURED[kind])) {
      const after = now[kind][key]?.rate ?? 0, budget = before * 1.10 + 2 / moving;
      if (after > budget + 1e-9) over.push(`${kind} ${key}: before ${before.toFixed(3)}/s, after ${after.toFixed(3)}/s (budget ${budget.toFixed(3)})`);
    }
    expect(over, `reversed re-aims over budget:\n${over.join('\n')}`).toEqual([]);
    // Every recorded controller is still measured on the panel (a renamed or vanished controller must be re-recorded).
    for (const key of Object.keys(MEASURED.controller)) expect(now.controller[key], `controller ${key} no longer measured`).toBeDefined();
  }, 300_000);
});
