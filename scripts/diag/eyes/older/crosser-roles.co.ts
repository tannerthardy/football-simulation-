// The crosser's nearest defender by seat and by the behaviour he is in (Rules + Coaching, 2026-11-14; the sim half of
// the crosser-against-zone diagnosis; NFL side by position in crosser-roles.py). Same population as sim-export.ts
// --seed S --games N. For every shallow / shallow_high / cross runner against a zone call (not cover0/cover1/man), at
// 2.0 / 2.5 / 3.0 s while the quarterback holds the ball: the nearest defender's slot, his behaviour (CoverageDefender's
// job: "zone:hook_s", "man:Y" from a cut or a match carry; ZoneCoverage: "lane:<zone>"; ManCoverage: "man"), the
// distance, and his depth over the crosser and distance across.
//   node --import tsx scripts/diag/eyes/crosser-roles.ts [--seed 101] [--games 16] [--start 0] > out.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { routeOfAgent } from '../../../src/sim/behaviors/receiver.js';
const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '16')), start = Number(arg('--start', '0'));
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const CROSS = /:(shallow|shallow_high|cross)$/;
const role = (d: any): string => {
  const b = d.behavior; const n = b?.constructor?.name ?? '?';
  if (n === 'CoverageDefender') return `match:${String(b.job).split(':')[0]}`;
  if (n === 'ZoneCoverage') return `lane:${b.zone}`;
  if (n === 'ManCoverage') return 'man';
  return n;
};
let PLAY = 0;
for (let game = start; game < start + games; game++) {
  simulateGame(leagueSample(home, seed + game), leagueSample(away, seed + game), { seed: seed + game, hooks: {
    playResult: (sim: any, kind: string) => {
      if (kind !== 'scrimmage' || sim.offCall.kind !== 'pass') return undefined;
      const play = ++PLAY;
      const marks = [2.0, 2.5, 3.0]; let mi = 0;
      const t0 = sim.tick.bind(sim);
      sim.tick = () => {
        t0();
        if (mi < marks.length && sim.t >= marks[mi] - 1e-9) {
          if (sim.ball.kind === 'held' && sim.ball.carrier === sim.qb) for (const o of sim.offense) {
            if (!CROSS.test(String(routeOfAgent.get(o) ?? ''))) continue;
            const d = sim.defense.filter((x: any) => !['DE_S', 'DE_W', 'DT_S', 'DT_W'].includes(x.slot))
              .reduce((p: any, q: any) => Math.hypot(q.pos.x - o.pos.x, q.pos.y - o.pos.y) < Math.hypot(p.pos.x - o.pos.x, p.pos.y - o.pos.y) ? q : p);
            process.stdout.write(JSON.stringify({ game, play, idx: o.idx, man: !!sim.defCall.coverage.man, depth: +((o.pos.x - sim.los) * sim.attackDir('O')).toFixed(2), t: marks[mi], cov: sim.defCall.coverage.id, route: String(routeOfAgent.get(o)).split(':')[1],
              slot: d.slot, role: role(d), dist: +Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y).toFixed(2),
              over: +(d.pos.x - o.pos.x).toFixed(2), across: +Math.abs(d.pos.y - o.pos.y).toFixed(2) }) + '\n');
          }
          mi++;
        }
      };
      return sim.run();
    } } as any });
}
