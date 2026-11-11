/**
 * Matched restage: replay the same saved snaps under different arms, so a
 * physics or decision change is judged play by play instead of on whole-game
 * totals (one changed play cascades into a different game).
 *
 *   node --import tsx scripts/diag/matched-restage.ts capture <seed>
 *   <ARM ENV> node --import tsx scripts/diag/matched-restage.ts replay <seed> <armName>
 *   node --import tsx scripts/diag/matched-restage.ts compare <baseArm> <arm> <seed>...
 *
 * Settings are read once at load, so each arm runs in its own process.
 * Output goes to out/matched-restage/.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam, leagueSample } from '../../src/league/team.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { captureSetup, restoreSetup } from './saved-play.js';

type Row = { pass: boolean; call: string; y: number; o: string; events?: string };
const [mode, ...rest] = process.argv.slice(2);
const dir = 'out/matched-restage'; mkdirSync(dir, { recursive: true });
const run = (s: PlaySetup) => {
  const r = new PlaySim(s).run();
  // Yards and outcome, plus a digest of the event sequence so equal yards by a different path still count as changed.
  const events = createHash('sha256').update(JSON.stringify(r.events)).digest('hex').slice(0, 16);
  return { y: +r.yards.toFixed(2), o: r.outcome as string, events };
};

if (mode === 'capture') {
  const seed = Number(rest[0]), rng = new Rng(seed);
  // Per-seed league sample (leagueSample): the teams' alignment habits and coordinators sample the league instead
  // of the same IRN/COM pair on every seed (rosters unchanged).
  const home = leagueSample(generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), seed), away = leagueSample(generateTeam(rng, 'Comets', 'COM', { strength: 0.55 }), seed);
  const plays: Array<{ pass: boolean; call: string; setup: string }> = []; let setup: PlaySetup | null = null;
  simulateGame(home, away, { seed, hooks: { playSetup: s => { setup = s; }, playResult: (sim, kind) => {
    if (kind !== 'scrimmage' || !setup) return undefined;
    plays.push({ pass: !!sim.isPass, call: sim.offCall.label, setup: captureSetup(setup).toString('base64') }); return undefined; } } });
  writeFileSync(`${dir}/seed${seed}.json`, JSON.stringify(plays)); console.log('captured', plays.length);
} else if (mode === 'replay') {
  const [seed, arm = 'x'] = rest;
  const plays = JSON.parse(readFileSync(`${dir}/seed${seed}.json`, 'utf8')) as Array<{ pass: boolean; call: string; setup: string }>;
  const rows: Row[] = plays.map(p => ({ pass: p.pass, call: p.call, ...run(restoreSetup(Buffer.from(p.setup, 'base64'))) }));
  writeFileSync(`${dir}/seed${seed}-${arm}.json`, JSON.stringify(rows)); console.log('replayed', rows.length);
} else if (mode === 'compare') {
  const [base, arm, ...seeds] = rest;
  const load = (a: string) => seeds.flatMap(s => JSON.parse(readFileSync(`${dir}/seed${s}-${a}.json`, 'utf8')) as Row[]);
  const A = load(base), B = load(arm);
  const stats = (rows: Row[]) => {
    const runs = rows.filter(r => !r.pass), passes = rows.filter(r => r.pass);
    const ypp = (rs: Row[]) => +(rs.reduce((s, r) => s + r.y, 0) / Math.max(1, rs.length)).toFixed(2);
    return { runYd: ypp(runs), passYd: ypp(passes), incomplete: rows.filter(r => r.o === 'incomplete').length };
  };
  const changed = A.map((r, i) => ({ i, a: r, b: B[i] })).filter(d => d.a.y !== d.b.y || d.a.o !== d.b.o || (d.a.events !== undefined && d.b.events !== undefined && d.a.events !== d.b.events));
  console.log(JSON.stringify({ base, arm, snaps: A.length, changed: changed.length, [base]: stats(A), [arm]: stats(B) }));
  for (const d of changed) console.log(`  #${d.i} ${d.a.pass ? 'pass' : 'run '} ${d.a.call.slice(0, 36)}: ${d.a.y} ${d.a.o} -> ${d.b.y} ${d.b.o}`);
} else {
  console.error('usage: capture <seed> | replay <seed> <arm> | compare <baseArm> <arm> <seed>...');
  process.exit(1);
}
