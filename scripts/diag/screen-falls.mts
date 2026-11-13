/**
 * Screen knockdowns: defenders who fall before the catch on a screen, and the
 * offensive player in contact with them when they fell (engaged blocker, else
 * the nearest offensive body within 1.5 yd).
 *   tsx scripts/diag/screen-falls.mts [screenId] [--seeds 8]
 */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { SCREEN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const id = process.argv[2] ?? 'bunch_now_screen';
const si = process.argv.indexOf('--seeds'), SEEDS = si >= 0 ? Number(process.argv[si + 1]) : 8;
const FORM: Record<string, string> = { rb_slip_screen: 'gun_doubles_11', te_screen: 'gun_trey_11', bubble_screen: 'gun_trips_11', bunch_now_screen: 'gun_bunch_11', tunnel_screen: 'gun_doubles_11' };
const CALLS: [string, string | null][] = [['cover3', null], ['cover1', null], ['cover2', null], ['cover1', 'mike_a']];
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
const rows: string[] = []; let snaps = 0, falls = 0;
const by: Record<string, number> = {};
for (const [cov, pres] of CALLS) for (let seed = 1; seed <= SEEDS; seed++) {
  const formation = FORMATION_BY_ID[FORM[id]];
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: seed % 2 === 0, kind: 'pass', pass: SCREEN_BY_ID[id], label: id },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: pres ? PRESSURE_BY_ID[pres] : null, label: cov },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * seed + 7 });
  snaps++;
  const ev0 = sim.event.bind(sim);
  sim.event = (type: string, a: any, b: any, note?: string) => {
    ev0(type, a, b, note);
    if (type !== 'fall' || !a || a.team !== 'D' || sim.events.some((e: any) => e.type === 'catch')) return;
    const eng = a.engagement?.blocker ?? null;
    const near = sim.offense.map((o: any) => [o, Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y)]).sort((x: any, y: any) => x[1] - y[1])[0];
    const who = eng ?? (near[1] < 1.5 ? near[0] : null);
    const thrown = sim.ball.kind !== 'held' || sim.carrier !== sim.qb;
    const key = `${a.slot.replace(/_.*/, '')} by ${who ? `${who.slot}(${who.behavior.kind}${who.behavior.job ? ':' + who.behavior.job : ''})` : 'nobody near'} ${thrown ? 'after throw' : 'before throw'} [${note}]`;
    by[key] = (by[key] ?? 0) + 1; falls++;
    rows.push(`${cov}${pres ? '+' + pres : ''} s${seed} t ${sim.t.toFixed(2)} ${a.slot} ${key} his speed ${Math.hypot(a.vel.x, a.vel.y).toFixed(1)}`);
  };
  sim.run();
}
console.log(`${id}: ${snaps} snaps, ${falls} defender falls before the catch`);
for (const [k, v] of Object.entries(by).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)} ${k}`);
console.log(rows.slice(0, 12).join('\n'));
