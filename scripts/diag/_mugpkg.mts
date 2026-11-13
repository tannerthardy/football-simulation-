/** Fresh full games: on pass plays with a mug call (alignment's mugged backers), rushers at the snap from the alignment's
 * roles: muggers who rush (blitz role), linemen who drop (zone role), total rushers; pressure package names.
 * usage: <seed>... (env flags apply) */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
const C: Record<string, Record<string, number>> = {}; const N: Record<string, number> = {};
const add = (k: string, f: string) => { (C[k] ??= {})[f] = (C[k][f] ?? 0) + 1; };
for (const seed of process.argv.slice(2).map(Number)) {
  const rng = new Rng(seed); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed, record: false, hooks: { playResult(sim: any, kind: string) {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const call = sim.defCall, mug = call.mug ?? 0; if (!mug) return undefined;
    const k = `${call.personnel} ${mug === 2 ? 'double' : 'single'}`; N[k] = (N[k] ?? 0) + 1;
    const spots: any = sim.defAlign.spots;
    const muggers = (['LB_M', 'LB_W'] as const).filter(s => spots[s] && spots[s].pos.x * 0 + Math.abs((spots[s].pos.x - sim.los)) < 2);
    add(k, `muggers rush ${muggers.filter(s => spots[s].role.kind === 'blitz').length}/${muggers.length}`);
    add(k, `DL drop ${(['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'] as const).filter(s => spots[s] && spots[s].role.kind === 'zone').length}`);
    add(k, `rush ${sim.defAlign.rushers.length}`); add(k, `pkg ${call.pressure?.id ?? 'none'}`); add(k, `cov ${call.coverage.man ? 'Man' : 'Zone'}`);
    return undefined; } } });
}
for (const k of Object.keys(N).sort()) { const n = N[k]; console.log(`${k} mug dropbacks n ${n}`);
  for (const pre of ['muggers rush', 'DL drop', 'rush ', 'pkg', 'cov']) console.log('   ' + Object.entries(C[k]).filter(([f]) => f.startsWith(pre)).sort().map(([f, v]) => `${f} ${Math.round(100 * v / n)}%`).join('  ')); }
