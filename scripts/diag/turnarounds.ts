/**
 * Defenders who turn their backs on the ball carrier (KNOWN_PROBLEMS TKL-4).
 *   node --import tsx scripts/diag/turnarounds.ts [seed] [--games 1]
 * Teams match the replay/film suite (`npm run replay -- 7`), so play numbers
 * match film IDs for the same develop. An episode starts when a defender is
 * within 5 yd of a non-pocket ball carrier and faces more than 120° away
 * from him; it lasts until he faces back or leaves that range.
 */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';

const argv = process.argv.slice(2);
const gi = argv.indexOf('--games');
const games = gi >= 0 ? Number(argv[gi + 1]) || 1 : 1;
const seed = Number(argv.find((a, i) => !a.startsWith('--') && (gi < 0 || i !== gi + 1)) ?? 7);
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
const byRole = new Map<string, { all: number; free: number }>();
const free: string[] = [];
for (let g = 0; g < games; g++) {
  const game = simulateGame(home, away, { seed: seed + g, record: true, recordLevel: 'standard' });
  for (const p of game.log) {
    const r = p.replay;
    if (!r?.telemetry || (p.kind !== 'run' && p.kind !== 'pass')) continue;
    const qb = r.players.findIndex(a => a.team === 'O' && a.slot === 'QB');
    for (let i = 0; i < r.players.length; i++) {
      if (r.players[i].team !== 'D') continue;
      let open = false;
      r.frames.forEach((f, k) => {
        const c = f.carrier;
        const live = f.t >= 0 && c >= 0 && r.players[c].team === 'O' && !(c === qb && p.kind === 'pass');
        const dx = live ? f.agents[c * 3] - f.agents[i * 3] : 0, dy = live ? f.agents[c * 3 + 1] - f.agents[i * 3 + 1] : 0;
        const d = Math.hypot(dx, dy);
        const away = live && d >= 0.9 && d <= 5 && Math.abs(wrap(f.agents[i * 3 + 2] - Math.atan2(dy, dx))) > 2 * Math.PI / 3;
        if (away && !open) {
          const tf = r.telemetry!.frames[k];
          const engaged = (tf.blocks ?? []).some(b => b.a === i || b.b === i);
          const role = r.players[i].slot.replace(/_[SW]$/, '');
          const row = byRole.get(role) ?? { all: 0, free: 0 };
          row.all++;
          if (!engaged) row.free++;
          byRole.set(role, row);
          if (!engaged && !/^(DE|DT|NT)/.test(role)) {
            const a = tf.agents[i];
            free.push(`G${g + 1}-P${String(p.index + 1).padStart(3, '0')} ${f.t.toFixed(1)} s ${r.players[i].slot} ${a.kind}${a.job ? ` ${a.job}` : ''}`);
          }
        }
        open = away;
      });
    }
  }
}
console.log(`Turned-away episodes by role (seed ${seed}, ${games} game${games > 1 ? 's' : ''}); free = not in a block`);
console.table(Object.fromEntries([...byRole].sort()));
console.log(`Unengaged second level: ${free.length}`);
for (const line of free) console.log(`  ${line}`);
