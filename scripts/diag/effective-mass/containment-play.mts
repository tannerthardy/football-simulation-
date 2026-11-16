/** One dither-panel screen/pass play under a set of flags off: the coverage / containment reversals by slot, and where the player was.
 *   DITHER_OFF_FLAGS=A,B node --import tsx scripts/diag/effective-mass/containment-play.mts <concept> <seed> [detail] */
import { readFileSync } from 'node:fs';
const stack = JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>;
for (const [k, v] of Object.entries(stack)) if (v === 'on') process.env[k] = '1';
for (const k of (process.env.DITHER_OFF_FLAGS ?? '').split(',').filter(Boolean)) process.env[k] = '0';
const { Rng } = await import('../../../src/core/rng.js');
const { generateTeam, pickDefense, pickOffense } = await import('../../../src/league/team.js');
const { PASS_BY_ID, SCREEN_BY_ID } = await import('../../../src/playbook/concepts.js');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../../../src/playbook/defense.js');
const { FORMATION_BY_ID } = await import('../../../src/playbook/formations.js');
const { PlaySim } = await import('../../../src/sim/playsim.js');
const core = await import('./dither-core.js');
core.instrument(PlaySim);
const [concept, seedS, detail] = process.argv.slice(2); const seed = Number(seedS), base = seed % 100 || 100;
const offense = generateTeam(new Rng(101), 'Dither O', 'DTO', { strength: .55 }), defense = generateTeam(new Rng(102), 'Dither D', 'DTD', { strength: .55 });
const deep = !concept.includes('screen'), formation = deep ? FORMATION_BY_ID.gun_doubles_11 : FORMATION_BY_ID.gun_trips_11;
const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
  offCall: { formation, flip: base % 2 === 0, kind: 'pass', pass: deep ? PASS_BY_ID[concept] : SCREEN_BY_ID[concept], label: concept },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: concept.startsWith('pa_') ? COVERAGE_BY_ID.cover1 : deep ? COVERAGE_BY_ID.cover2 : base % 2 ? COVERAGE_BY_ID.cover3 : COVERAGE_BY_ID.cover1,
    pressure: null, zoneStyle: 'spot', label: 'scr' }, los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
const log: any[] = []; (globalThis as any).__ditherLog = log; (globalThis as any).__ditherPlay = 0;
const acc: any = {}; core.watch(sim, acc);
const track: any = {}; const tick = sim.tick.bind(sim);
sim.tick = () => { tick(); for (const a of sim.defense) if (a.slot === 'CB_W') (track[a.slot] ??= []).push([Math.round(sim.t * 100) / 100, Math.round(a.pos.x * 10) / 10, Math.round(a.pos.y * 10) / 10]); };
sim.run();
const rev = log.filter(r => r.k === 'rev' && r.g === 'coverage' && r.src === 'containment');
const by: Record<string, number> = {}; for (const r of rev) by[r.slot] = (by[r.slot] ?? 0) + 1;
console.log(JSON.stringify({ concept, seed, off: (process.env.DITHER_OFF_FLAGS ?? '').split(',').filter(Boolean).length, containmentReversed: rev.length, bySlot: by, times: rev.map(r => `${r.slot}@${r.t}`).slice(0, 12) }));
if (detail) for (const r of rev.slice(0, 6)) { const tr = track[r.slot]?.find((x: number[]) => Math.abs(x[0] - r.t) < 0.03); console.log('  ', r.slot, r.t, 'pos', tr?.slice(1), 'sideline distance', tr ? Math.min(tr[2], 53.3 - tr[2]).toFixed(1) : '?'); }
