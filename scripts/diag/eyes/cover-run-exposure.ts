// node --import tsx scripts/diag/eyes/cover-run-exposure.ts [seed] [games]
// SIGHT_COVER's run row (Integration, 2026-11-14): how often, on run plays, is a man or zone defender's picture of the
// ball carrier one SIGHT_COVER changes? Runs SIGHT_COVER=1. Per see() of the carrier by a defender: his behaviour kind,
// and whether sighted() returned an older picture than the ordinary one. Also every defender's behaviour kind at the
// handoff + 0.5 s, so the share still in man / zone after the run shows is known.
import { readFileSync } from 'node:fs';
const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on') process.env[k] = '1';
process.env.SIGHT_COVER = '1';
const [seedArg, gamesArg] = process.argv.slice(2);
const seed = Number(seedArg ?? 101), games = Number(gamesArg ?? 2);
const { Rng } = await import('../../../src/core/rng.js');
const { simulateGame } = await import('../../../src/game/game.js');
const { generateTeam, leagueSample } = await import('../../../src/league/team.js');
const { PlaySim } = await import('../../../src/sim/playsim.js');
const calls: Record<string, { n: number; older: number }> = {}; const kinds: Record<string, number> = {};
const P: any = PlaySim.prototype, see0 = P.see, sighted0 = P.sighted, tick0 = P.tick;
let last: any = null;
P.sighted = function (o: any, t: any, seen: any, g: boolean) { const r = sighted0.call(this, o, t, seen, g); last = { older: (r.age ?? 0) > (seen.age ?? 0) + 1e-9 }; return r; };
P.see = function (o: any, t: any, s = 1) {
  last = null; const r = see0.call(this, o, t, s);
  if (o.team === 'D' && this.offCall?.kind === 'run' && this.carrier === t && t !== this.qb) {
    const k = o.behavior?.kind ?? '?', c = (calls[k] ??= { n: 0, older: 0 }); c.n++; if (last?.older) c.older++;
  }
  return r;
};
P.tick = function () {
  const r = tick0.call(this);
  if (this.offCall?.kind === 'run' && this.handoffAt !== undefined && this.handoffAt >= 0 && Math.abs(this.t - this.handoffAt - 0.5) < this.dt / 2)
    for (const d of this.defense) kinds[d.behavior?.kind ?? '?'] = (kinds[d.behavior?.kind ?? '?'] ?? 0) + 1;
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true, handContact: 'center' } as any);
const N = Object.values(calls).reduce((a, c) => a + c.n, 0);
console.log(`run plays: defenders' see() of the carrier ${N}`);
for (const [k, c] of Object.entries(calls).sort((a, b) => b[1].n - a[1].n)) console.log(`  ${k.padEnd(14)} ${String(c.n).padStart(7)} (${(100 * c.n / N).toFixed(1)}%)  older picture under SIGHT_COVER ${c.older} (${(100 * c.older / Math.max(1, c.n)).toFixed(1)}%)`);
const K = Object.values(kinds).reduce((a, b) => a + b, 0);
console.log(`defenders' behaviour 0.5 s after the handoff (n ${K}): ${Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / K).toFixed(1)}%`).join(', ')}`);
