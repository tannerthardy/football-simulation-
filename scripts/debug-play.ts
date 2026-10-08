/**
 * ASCII play debugger: prints the field at chosen times.
 *   npx tsx scripts/debug-play.ts <concept> <coverage> <seed> [t1,t2,...]
 */
import { Rng } from '../src/core/rng.js';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { OffensivePlayCall } from '../src/playbook/types.js';
import { PlaySim } from '../src/sim/playsim.js';

const [conceptId = 'smash', covId = 'cover3', seedStr = '1', times = '0,1,2,3', formId] = process.argv.slice(2);
const rng = new Rng(Number(seedStr));
const home = generateTeam(rng, 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(rng, 'Away', 'AWY', { strength: 0.6 });
const isRun = !!RUN_BY_ID[conceptId];
const formation = FORMATION_BY_ID[formId ?? (isRun ? 'i_pro_21' : 'gun_doubles_11')];
const offCall: OffensivePlayCall = isRun
  ? { formation, flip: false, kind: 'run', run: RUN_BY_ID[conceptId], label: conceptId }
  : { formation, flip: false, kind: 'pass', pass: PASS_BY_ID[conceptId], label: conceptId };
const defPersonnel = formation.personnel === '21' || formation.personnel === '22' ? 'base43' : 'nickel';
const defCall = { personnel: defPersonnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[covId], pressure: null, label: covId } as const;
const sim = new PlaySim({ offense: pickOffense(home, formation.personnel), defense: pickDefense(away, defPersonnel), offCall, defCall, los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed: (() => { for (let k = 0; k < Number(process.env.PLAY ?? 0); k++) rng.nextU32(); return rng.nextU32(); })(), record: true });
const r = sim.run();
const CH: Record<string, string> = { QB: 'Q', RB: 'R', X: 'X', Z: 'Z', Y: 'Y', H: 'H', F: 'F', LT: 'o', LG: 'o', C: 'c', RG: 'o', RT: 'o', DE_S: 'E', DE_W: 'e', DT_S: 'T', DT_W: 't', NT: 'N', LB_S: 'S', LB_M: 'M', LB_W: 'W', CB_S: 'C', CB_W: 'c', NB: 'n', DB: 'd', FS: 'F', SS: 's' };
for (const e of r.events) {
  const a = e.a !== undefined ? sim.agents[e.a] : null;
  const b = e.b !== undefined ? sim.agents[e.b] : null;
  console.log(`${e.t.toFixed(2).padStart(5)}s ${e.type.padEnd(14)} ${a ? `${a.team}:${a.slot}` : ''} ${b ? `→ ${b.team}:${b.slot}` : ''} ${e.note ?? ''}`);
}
console.log(`outcome ${r.outcome} yards ${r.yards} air ${r.stats.airYards?.toFixed(1)} yac ${r.stats.yac?.toFixed(1)} sep ${r.stats.separation}`);
const table = process.env.TABLE === '1';
if (table) {
  for (const ts of times.split(',').map(Number)) {
    const f = r.frames!.reduce((best, fr) => (Math.abs(fr.t - ts) < Math.abs(best.t - ts) ? fr : best));
    const fi = r.frames!.indexOf(f);
    const prev = r.frames![Math.max(0, fi - 1)];
    console.log(`--- t=${f.t.toFixed(2)} ball (${(f.ball[0] - 35).toFixed(1)}, ${f.ball[1].toFixed(1)}, z ${f.ball[2].toFixed(1)}) carrier ${f.carrier >= 0 ? sim.agents[f.carrier].slot : '-'}`);
    const rows = sim.agents.map((a, i) => {
      const x = f.agents[i * 3] - 35;
      const y = f.agents[i * 3 + 1];
      const sp = Math.hypot(f.agents[i * 3] - prev.agents[i * 3], f.agents[i * 3 + 1] - prev.agents[i * 3 + 1]) / 0.05;
      return `${a.team} ${a.slot.padEnd(5)} x${x.toFixed(1).padStart(6)} y${y.toFixed(1).padStart(6)} v${sp.toFixed(1).padStart(5)} face${((f.agents[i * 3 + 2] * 180) / Math.PI).toFixed(0).padStart(5)}`;
    });
    for (let i = 0; i < rows.length; i += 2) console.log(rows[i].padEnd(60) + (rows[i + 1] ?? ''));
  }
  process.exit(0);
}
const x0 = 22;
const x1 = 80;
for (const ts of times.split(',').map(Number)) {
  const f = r.frames!.reduce((best, fr) => (Math.abs(fr.t - ts) < Math.abs(best.t - ts) ? fr : best));
  const rows = 36;
  const grid: string[][] = Array.from({ length: rows }, () => Array.from({ length: (x1 - x0) * 2 }, () => ' '));
  const put = (x: number, y: number, ch: string) => {
    const col = Math.round((x - x0) * 2);
    const row = rows - 1 - Math.round(y / 1.5);
    if (row >= 0 && row < rows && col >= 0 && col < grid[0].length) grid[row][col] = ch;
  };
  for (let x = x0; x < x1; x += 5) for (let row = 0; row < rows; row++) put(x, row * 1.5, x === 35 ? '|' : ':');
  sim.agents.forEach((a, i) => put(f.agents[i * 3], f.agents[i * 3 + 1], CH[a.slot] ?? '?'));
  put(f.ball[0], f.ball[1], f.carrier >= 0 ? '@' : '*');
  console.log(`--- t=${f.t.toFixed(2)} ball z=${f.ball[2].toFixed(1)} (offense lowercase o/c = OL, defense uppercase) ---`);
  console.log(grid.map((row) => row.join('')).join('\n'));
}
