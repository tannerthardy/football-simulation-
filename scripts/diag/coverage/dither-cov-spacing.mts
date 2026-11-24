// The dither budget's panel (test/dither-budget.test.ts measure(), shift 0), per play: coverage / spacing re-aims and
// reversals. Run once per arm: FLIGHT_BREAK=0 node --import tsx scripts/diag/coverage/dither-cov-spacing.mts > off.json
import { readFileSync } from 'node:fs';
const W = process.cwd();
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam, pickDefense, pickOffense } = await import(`${W}/src/league/team.ts`);
const { PASS_BY_ID, RUN_BY_ID, SCREEN_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${W}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${W}/src/playbook/formations.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const core = await import(`${W}/scripts/diag/effective-mass/dither-core.ts`);
core.instrument(PlaySim);
const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 });
const defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
const rows: any[] = [];
const LOG = process.env.LOG?.split(',');
const go = (label: string, setup: any) => { const acc: any = {}; if (LOG?.includes(label)) acc.__log = []; const sim: any = new PlaySim(setup);
  let throwT = -1; const tk = sim.tick.bind(sim); sim.tick = () => { const pre = new Map(sim.agents.map((a: any) => [a, [...a.tags]])); tk(); if (throwT < 0 && sim.ball?.kind === 'air') throwT = sim.t;
    for (const e of acc.__log ?? []) if (!e.tags) e.tags = (pre.get(e.who) as string[] | undefined)?.filter((x: string) => /flight|break|drive|carry|bite|onBall|deep|open/.test(x)).join('+'); };
  core.watch(sim, acc); sim.run();
  if (acc.__log) for (const e of acc.__log) if (e.g === 'coverage' && e.src === 'spacing') console.error(label, e.who.slot, (e.who.behavior?.zone ?? e.who.behavior?.kind), 't', e.t.toFixed(2), 'throw', throwT.toFixed(2), 'ball', e.tags);
  const g = acc.coverage; const sp = g?.src?.spacing; rows.push({ play: label, moving: +(g?.moving ?? 0).toFixed(2), reaims: sp?.n ?? 0, reversed: sp?.reversed ?? 0 }); };
for (const run of ['oz_strong', 'oz_weak', 'wz_strong', 'iz_strong', 'power', 'counter', 'toss', 'duo']) for (let seed = 1; seed <= 5; seed++) {
  const formation = FORMATION_BY_ID.ace_12;
  go(`${run} ${seed}`, { offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: seed % 2 === 0, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'u3' },
    los: 35, ballY: 26.65, firstDownX: 45, seed });
}
for (const pass of ['curl_flat', 'stick', 'mesh', 'smash', 'slant_flat', 'four_verts']) for (let seed = 1; seed <= 5; seed++) {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  go(`${pass} ${seed}`, { offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[pass], label: pass },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1, pressure: null, zoneStyle: 'spot', label: 'o31' },
    los: 35, ballY: 26.65, firstDownX: 45, seed });
}
for (const pass of ['bubble_screen', 'rb_slip_screen', 'tunnel_screen', 'wide_now_screen', 'four_verts', 'y_cross', 'flood', 'pa_shot', 'pa_flood'])
  for (let seed = 1; seed <= (pass.includes('screen') ? 10 : 5); seed++) {
    const deep = !pass.includes('screen'), formation = deep ? FORMATION_BY_ID.gun_doubles_11 : FORMATION_BY_ID.gun_trips_11;
    go(`${pass}#3 ${seed}`, { offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: deep ? PASS_BY_ID[pass] : SCREEN_BY_ID[pass], label: pass },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: pass.startsWith('pa_') ? COVERAGE_BY_ID.cover1 : deep ? COVERAGE_BY_ID.cover2 : seed % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1,
        pressure: null, zoneStyle: 'spot', label: 'scr' },
      los: 35, ballY: 26.65, firstDownX: 45, seed });
  }
console.log(JSON.stringify(rows));
