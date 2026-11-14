// node --import tsx scripts/diag/eyes/around-sight.ts [seed] [games]
// SEE_SIGHT step 2 scoping: aroundBodies (common.ts) reads every opponent, but steers only around a body ahead of the
// pursuer on his path and nearer than the runner. Of its see() calls, how many are of a body that could decide the
// steer (1 in 10 opponent calls sampled; ahead along his velocity, within 4 yd, inside his corridor) and that he cannot see now (behind his shoulders or
// behind a body by lineOfSight)?
import { readFileSync } from 'node:fs';
const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on') process.env[k] = '1';
const [seedArg, gamesArg] = process.argv.slice(2);
const seed = Number(seedArg ?? 101), games = Number(gamesArg ?? 2);
const { Rng } = await import('../../../src/core/rng.js');
const { simulateGame } = await import('../../../src/game/game.js');
const { generateTeam, leagueSample } = await import('../../../src/league/team.js');
const { PlaySim } = await import('../../../src/sim/playsim.js');
const { lineOfSight } = await import('../../../src/sim/sight.js');
let k = 0, calls = 0, ahead = 0, aheadHidden = 0, aheadBehindShoulder = 0;
const see0 = (PlaySim.prototype as any).see;
(PlaySim.prototype as any).see = function (this: any, o: any, t: any, s = 1) {
  if (o.team !== t.team && (k++ % 10) === 0 && /aroundBodies/.test((new Error().stack ?? '').split('\n')[2] ?? '')) {
    calls++;
    const sp = Math.hypot(o.vel.x, o.vel.y) || 1, ux = o.vel.x / sp, uy = o.vel.y / sp;
    const rx = t.pos.x - o.pos.x, ry = t.pos.y - o.pos.y, along = rx * ux + ry * uy, lat = Math.abs(rx * uy - ry * ux);
    if (along > 0 && along < 4 && lat < o.profile.radius + t.profile.radius + 0.15) {
      ahead++;
      const b = Math.atan2(ry, rx) - o.body.facing, behind = Math.abs(Math.atan2(Math.sin(b), Math.cos(b))) > 1.8;
      if (behind) aheadBehindShoulder++;
      if (behind || !lineOfSight(this.agents, o, t)) aheadHidden++;
    }
  }
  return see0.call(this, o, t, s);
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true, handContact: 'center' } as any);
console.log(`aroundBodies see() calls ${calls}; of a body that could decide the steer ${ahead} (${(100 * ahead / calls).toFixed(1)}%); of those he cannot see now ${aheadHidden} (${(100 * aheadHidden / Math.max(1, ahead)).toFixed(1)}%; behind his shoulders ${aheadBehindShoulder})`);
