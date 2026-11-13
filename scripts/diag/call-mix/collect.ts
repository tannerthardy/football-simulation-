// Call-mix diagnosis (docs/reviews/2026-11-11-call-mix.md): one row per scrimmage pass in league-sampled games, plus every coordinator observe().
//   node --import tsx scripts/diag/call-mix/collect.ts [--seed 101] [--games 16] > out/call-mix/plays.jsonl
// Same population as sim-export.ts --seed S --games N (generateTeam IRN/COM from Rng(S), leagueSample(team, S+g): habits and coordinators).
// Read-only: the hook calls sim.run() exactly as the game would; observe() is wrapped, not changed.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { OffensiveCoordinator, DefensiveCoordinator } from '../../../src/game/playcaller.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PASS_CONCEPTS } from '../../../src/playbook/concepts.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '16'));
const DB = new Set(['CB', 'S', 'FS', 'SS', 'DB']);
let game = 0, playNo = 0, quarter = 0, offAbbr = '', clock = 0;
const out = (o: unknown) => process.stdout.write(JSON.stringify(o) + '\n');

// Learning streams: key and success for each side, in order (multipliers are recomputed offline).
const oObs = OffensiveCoordinator.prototype.observe;
OffensiveCoordinator.prototype.observe = function (call: any, success: number) {
  out({ rec: 'oobs', game, play: playNo, team: this.team.abbr, kind: call.kind, key: call.kind === 'pass' ? `pass:${call.pass.family}:${call.pass.id}` : `run:${call.run?.scheme}`, success });
  return oObs.call(this, call, success);
};
const dObs = DefensiveCoordinator.prototype.observe;
DefensiveCoordinator.prototype.observe = function (call: any, success: number, installed: any = call) {
  out({ rec: 'dobs', game, play: playNo, team: this.team.abbr, key: call.coverage.family ?? call.coverage.id, check: installed.check ? installed.coverage.id : null, success });
  return dObs.call(this, call, success, installed);
};

function routeOf(sim: any, a: any): string | null {
  const c = sim.offCall.pass; if (!c) return null;
  const ref = sim.offAlign.refOf[a.slot];
  const spot = sim.offAlign.spots[a.slot];
  if (ref === 'B') return c.back === 'block' ? 'block' : c.back === 'check' ? 'checkdown' : c.back;
  if (ref === 'B2' || !ref) return 'checkdown*';
  if (spot?.inline && c.teBlock) return 'block';
  const side = ref[0] === 'S' ? c.strong : c.weak, n = Number(ref[1]);
  return side[n] ?? (n === 1 ? 'go' : 'seam');
}

// Each pool concept's read order, for the read-number table.
out({ rec: 'prog', prog: Object.fromEntries(PASS_CONCEPTS.map((c) => [c.id, c.progression])) });
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (game = 0; game < games; game++) {
  const res = simulateGame(leagueSample(home, seed + game), leagueSample(away, seed + game), { seed: seed + game, hooks: {
    playSetup: (_s: any, ctx: any) => { if (ctx.kind === 'scrimmage') { quarter = ctx.state.quarter; clock = ctx.state.clock; offAbbr = ctx.offense; } },
    playResult: (sim: any, kind: string) => {
      if (kind !== 'scrimmage') return undefined;
      playNo++;
      const dir = sim.attackDir('O');
      const dbs = sim.defense.filter((d: any) => DB.has(d.player.position));
      const depth = dbs.map((d: any) => +((d.pos.x - sim.los) * dir).toFixed(2)).sort((a: number, b: number) => b - a);
      const isPass = sim.offCall.kind === 'pass';
      const routes = isPass ? sim.offense.filter((a: any) => a !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot))
        .map((a: any) => ({ slot: a.slot, ref: sim.offAlign.refOf[a.slot] ?? null, route: routeOf(sim, a) })) : [];
      const r = sim.run();
      const s = sim.stats;
      if (!isPass && !s.attempted && !s.sacked) return r;
      const tgt = s.target ? sim.offense.find((a: any) => a.player.id === s.target) : null;
      const dc = sim.defCall;
      out({ rec: 'play', game, seed: seed + game, play: playNo, off: offAbbr, q: quarter, clock,
        down: sim.down, dist: +(sim.firstDownX - sim.los).toFixed(1), toGoal: +(dir > 0 ? 110 - sim.los : sim.los - 10).toFixed(1),
        callKind: sim.offCall.kind, concept: sim.offCall.pass?.id ?? null, family: sim.offCall.pass?.family ?? null, label: sim.offCall.label,
        cov: dc.coverage.id, covFamily: dc.coverage.family ?? dc.coverage.id, shell: dc.coverage.shell, pressure: dc.pressure?.id ?? null,
        rushers: sim.defAlign.rushers.length, depth,
        target: tgt ? { slot: tgt.slot, ref: sim.offAlign.refOf[tgt.slot] ?? null, route: routeOf(sim, tgt) } : null, routes,
        yards: +r.yards.toFixed(2), outcome: r.outcome, att: !!s.attempted, cmp: !!s.completed, sack: !!s.sacked, int: !!s.interceptedBy || r.events.some((e: any) => e.type === 'interception'),
        scramble: !!s.scramble, throwaway: !!s.throwaway, air: s.airYards ?? null, cAir: s.completedAirYards ?? null, yac: s.yac ?? null, ttt: s.timeToThrow ?? null, pressured: !!s.pressured });
      return r;
    } } as any });
  out({ rec: 'game', game, seed: seed + game, score: res.score, plays: res.log.length, quarters: res.log.filter((p: any) => p.kind === 'pass' || p.kind === 'run').map((p: any) => p.quarter) });
  console.error(`game ${game + 1}/${games}: ${res.score.home}-${res.score.away}`);
}
