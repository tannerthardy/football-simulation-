/** Why screen snaps fail: one line per snap with the decisive events (no throw, throwaway, sack, batted, pbu, drop, incomplete, catch).
 *   tsx scripts/diag/screen-outcomes.mts [screenId] [--seeds 8] */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { SCREEN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const id = process.argv[2] ?? 'rb_slip_screen';
const si = process.argv.indexOf('--seeds'), SEEDS = si >= 0 ? Number(process.argv[si + 1]) : 8;
const FORM: Record<string, string> = { rb_slip_screen: 'gun_doubles_11', te_screen: 'gun_trey_11', bubble_screen: 'gun_trips_11', bunch_now_screen: 'gun_bunch_11', tunnel_screen: 'gun_doubles_11' };
const CALLS: [string, string | null][] = [['cover3', null], ['cover1', null], ['cover2', null], ['cover1', 'mike_a']];
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const tally: Record<string, number> = {};
const KEY = /^(throw|throwaway|sack|deflection|pbu|drop|incomplete|catch|tackle_wrap|interception|scramble|penalty)$/;
for (const [cov, pres] of CALLS) for (let seed = 1; seed <= SEEDS; seed++) {
  const formation = FORMATION_BY_ID[FORM[id]];
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: SCREEN_BY_ID[id], label: id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: pres ? PRESSURE_BY_ID[pres] : null, label: cov },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7 });
  const res = sim.run();
  const ev = sim.events.filter((e: any) => KEY.test(e.type));
  const name = (i?: number) => i === undefined ? '' : sim.agents[i].slot;
  const thr = ev.find((e: any) => e.type === 'throw'), cat = ev.find((e: any) => e.type === 'catch');
  const preThrowHit = ev.find((e: any) => e.type === 'tackle_wrap' && sim.agents[e.b]?.slot === 'QB' && (!thr || e.t <= thr.t));
  const cls = cat ? 'caught' : !thr ? (ev.some((e: any) => e.type === 'throwaway') ? 'thrown away' : 'no throw (sack/scramble)')
    : ev.some((e: any) => e.type === 'deflection') ? 'batted' : ev.some((e: any) => e.type === 'pbu') ? 'broken up'
    : ev.some((e: any) => e.type === 'drop') ? 'dropped' : ev.some((e: any) => e.type === 'interception') ? 'intercepted' : 'incomplete (miss)';
  const k = cls + (preThrowHit && cls !== 'caught' ? ' [QB hit before throw]' : '');
  tally[k] = (tally[k] ?? 0) + 1;
  console.log(`${cov}${pres ? '+' + pres : ''} s${seed}: ${k.padEnd(40)} yards ${res.yards.toFixed(1)} | ${ev.map((e: any) => `${e.t.toFixed(2)} ${e.type} ${name(e.a)}${e.b !== undefined ? '>' + name(e.b) : ''}`).join(', ')}`);
}
console.log(JSON.stringify(tally));
