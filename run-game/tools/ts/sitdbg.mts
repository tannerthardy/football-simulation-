import { Rng } from '/home/user/fs-develop/src/core/rng.js';
import { simulateGame } from '/home/user/fs-develop/src/game/game.js';
import { generateTeam } from '/home/user/fs-develop/src/league/team.js';
const rng = new Rng(101); const home = generateTeam(rng, 'H', 'HOM', { strength: .55 }), away = generateTeam(rng, 'A', 'AWY', { strength: .55 });
simulateGame(home, away, { seed: 101 } as never);
const g = (globalThis as any).__sit; g.need.sort((a: number, b: number) => a - b);
console.log(`zone-deep ticks with a stemming receiver under 6 yd: ${g.n}; sit ${(100 * g.sit / g.n).toFixed(0)}%; sit overridden by the depth guard ${(100 * g.over / Math.max(1, g.sit)).toFixed(0)}%; mean gap ${(g.gapSum / g.n).toFixed(2)}; needed-minus-gap p25/50/75 ${[.25, .5, .75].map(f => g.need[Math.floor(f * g.need.length)].toFixed(2)).join('/')}`);
