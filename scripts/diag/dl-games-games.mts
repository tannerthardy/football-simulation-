import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
const N = Number(process.argv[2] ?? 6); const S: Record<string, number[]> = {}; const calls: Record<string, number> = {}; let runs = 0, passes = 0, sacks = 0, pressures = 0, dropbacks = 0;
const add = (k: string, v: number) => (S[k] ??= []).push(v);
for (let g = 0; g < N; g++) {
  const rng = new Rng(700 + g), home = generateTeam(rng, 'Ironmen', 'IRN', { strength: .55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: .55 });
  simulateGame(home, away, { seed: 700 + g, hooks: { playResult: (sim: any, kind: string) => { if (kind !== 'scrimmage') return undefined;
    const r: any = sim.run(); const game = sim.defCall.dlGame; const key = game ? `${game.kind}${game.pair ?? ''}` : 'none';
    calls[key] = (calls[key] ?? 0) + 1;
    const y = r.yards ?? 0;
    if (sim.isPass) { passes++; dropbacks++; if (r.stats?.sacked) sacks++; if ((sim.events as any[]).some(e => e.type === 'pressure')) pressures++; add(`pass ${game ? 'game' : 'none'}`, y); }
    else { runs++; add(`run ${game ? game.kind : 'none'}`, y); }
    return r; } } } as any);
}
console.log('plays', runs + passes, 'runs', runs, 'passes', passes, 'sack/dropback', (sacks / dropbacks).toFixed(3), 'pressure/dropback', (pressures / dropbacks).toFixed(3));
console.log('calls', JSON.stringify(calls));
for (const [k, v] of Object.entries(S).sort()) console.log(k.padEnd(14), 'n', String(v.length).padStart(4), 'mean', (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2), '10+', (100 * v.filter(x => x >= 10).length / v.length).toFixed(1) + '%');
