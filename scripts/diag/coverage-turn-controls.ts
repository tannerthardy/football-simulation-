/**
 * COV-6 football controls for the coverage orientation technique.
 *   node --import tsx scripts/diag/coverage-turn-controls.ts [plays] [--raw]
 * Staged man coverage (Cover 1 Off and press Cover 1) on X running a go, an
 * out, a comeback and a hitch-and-go, with the QB holding the ball so every
 * route runs out. For X's man: when his hips turn to run (within 45° of
 * downfield), his separation from X at fixed times, and his separation 0.6 s
 * after X's break. --raw passes technique requests straight to the motor.
 * Staged plays, not NFL replay: a check that real transitions still happen
 * and that breaks and double moves still win, not a calibration.
 */
import { HASH_LEFT_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { ROUTES } from '../../src/playbook/routes.js';
import type { DefensivePlayCall, OffensivePlayCall } from '../../src/playbook/types.js';
import { goTo } from '../../src/sim/behaviors/common.js';
import { CoverageOrientation } from '../../src/sim/coverage/orientation.js';
import { PlaySim } from '../../src/sim/playsim.js';

const argv = process.argv.slice(2);
const plays = Number(argv.find(a => !a.startsWith('--')) ?? 16);
if (argv.includes('--raw')) CoverageOrientation.prototype.steer = function (_a, _n, _d, command) { return command; };

// A hitch-and-go: sell the hitch at 5, then climb. Not in the playbook.
ROUTES.hitch_go ??= { id: 'hitch_go', family: 'deep', depth: 30, end: 'continue',
  points: [{ d: 5.5, l: 0, s: 0.35 }, { d: 5, l: 0.3, s: 0.3 }, { d: 50, l: 1 }] };

const home = generateTeam(new Rng(21), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(22), 'Away', 'AWY', { strength: 0.6 });
const formation = FORMATION_BY_ID.gun_doubles_11;
const offense = pickOffense(home, formation.personnel);
const defense = pickDefense(away, 'nickel');
const LOS = 35;
const wrap = (d: number) => ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
const mean = (v: number[]) => v.length ? +(v.reduce((p, q) => p + q, 0) / v.length).toFixed(2) : null;

const report: Record<string, unknown> = { arm: argv.includes('--raw') ? 'raw requests' : 'orientation technique', plays };
for (const coverage of ['cover1_off', 'cover1']) {
  for (const route of ['go', 'out', 'comeback', 'hitch_go']) {
    const base = PASS_BY_ID.four_verts;
    const pass = { ...base, id: `x_${route}`, weak: { ...base.weak, 1: route } };
    const offCall: OffensivePlayCall = { formation, flip: false, kind: 'pass', pass, label: pass.id };
    const defCall: DefensivePlayCall = { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: coverage };
    const flip: number[] = [], swings: number[] = [];
    const sep: Record<string, number[]> = { '1.5': [], '2.5': [], '3.5': [], afterBreak: [] };
    for (let seed = 1; seed <= plays; seed++) {
      const sim = new PlaySim({ offense, defense, offCall, defCall, los: LOS, ballY: HASH_LEFT_Y, firstDownX: LOS + 10, seed, record: true });
      const spot = { x: LOS - 7, y: HASH_LEFT_Y };
      sim.qb.behavior = { kind: 'qb-hold', update: (a) => goTo(a, spot, { facing: 0, speed: 0.5 }) };
      const x = sim.slot('X')!;
      const r = sim.run();
      const F = r.frames!.filter(f => f.t >= 0 && f.t <= 4);
      // His man: the defender closest to X at 1 s who stays within 4 yd.
      const at1 = F.find(f => f.t >= 1) ?? F[0];
      const d = (f: typeof F[number], i: number, j: number) => Math.hypot(f.agents[i * 3] - f.agents[j * 3], f.agents[i * 3 + 1] - f.agents[j * 3 + 1]);
      const cb = sim.defense.filter(a => !/^(DE|DT|NT)/.test(a.slot)).sort((p, q) => d(at1, p.idx, x.idx) - d(at1, q.idx, x.idx))[0];
      const o = (f: typeof F[number]) => f.agents[cb.idx * 3 + 2];
      const turned = F.find(f => f.t > 0.3 && Math.abs(wrap(o(f))) < Math.PI / 4);
      if (turned) flip.push(turned.t);
      let swing = 0;
      for (let k = 0; k + 2 < F.length; k++) if (Math.abs(wrap(o(F[k + 2]) - o(F[k]))) >= Math.PI / 2) swing++;
      swings.push(swing);
      for (const t of ['1.5', '2.5', '3.5']) {
        const f = F.find(fr => fr.t >= Number(t));
        if (f) sep[t].push(d(f, cb.idx, x.idx));
      }
      // X's break: the first 0.2 s heading change over 60° after 0.6 s.
      const head = (k: number) => Math.atan2(F[k + 1].agents[x.idx * 3 + 1] - F[k].agents[x.idx * 3 + 1], F[k + 1].agents[x.idx * 3] - F[k].agents[x.idx * 3]);
      const brk = F.findIndex((f, k) => f.t > 0.6 && k + 3 < F.length && Math.abs(wrap(head(k + 2) - head(k))) > Math.PI / 3);
      if (brk >= 0) {
        const f = F.find(fr => fr.t >= F[brk].t + 0.6);
        if (f) sep.afterBreak.push(d(f, cb.idx, x.idx));
      }
    }
    report[`${coverage} / X ${route}`] = { hipsTurnedToRunAt: mean(flip), turnedOn: `${flip.length}/${plays}`,
      swings90In02sPerPlay: mean(swings),
      separation: Object.fromEntries(Object.entries(sep).map(([k, v]) => [k, mean(v)])) };
  }
}
console.log(JSON.stringify(report, null, 2));
