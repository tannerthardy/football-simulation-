/**
 * QB_BODY_SEEN restage probe (league games, passive): per pass play, the passer's first throwing motion (sim.windupAt
 * as it is set: start time, whether it was pulled down: a pump), the release, and per defender the first time each
 * shows SHOULDER_READ's tags ('plant', 'plant-restart') and sawThrow's 'readArm', relative to the motion's start and
 * the release; whether he was facing the passer at the motion's start; the throw's result.
 *   [QB_BODY_SEEN=1] node --import tsx scripts/diag/eyes/body-seen.ts [--seed 101] [--games 8] > out/eyes/body-seen.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const r2 = (v: number) => +v.toFixed(2);
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  if (sim.offCall?.kind !== 'pass') return run.call(this);
  const motions: { at: number; end: number | null }[] = [];
  let lastWindup = -1, release: number | null = null;
  const first = new Map<any, Record<string, number>>(), facingAtMotion = new Map<any, boolean>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const was = sim.ball.kind;
    tick();
    if (sim.windupAt >= 0 && sim.windupAt !== lastWindup) {
      motions.push({ at: sim.windupAt, end: null });
      if (motions.length === 1) for (const d of sim.defense) {
        const ang = Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x);
        facingAtMotion.set(d, Math.cos(d.body.facing - ang) > -0.2);
      }
    }
    if (sim.windupAt < 0 && lastWindup >= 0 && motions.length && motions[motions.length - 1].end === null && sim.ball.kind !== 'air') motions[motions.length - 1].end = sim.t;
    lastWindup = sim.windupAt;
    if (release === null && was !== 'air' && sim.ball.kind === 'air') release = sim.t;
    for (const d of sim.defense) for (const tag of ['plant', 'plant-restart', 'readArm']) if (d.tags.has(tag)) {
      const f = first.get(d) ?? {}; if (f[tag] === undefined) { f[tag] = sim.t; first.set(d, f); }
    }
  };
  const res = run.call(this);
  if (motions.length) {
    const m0 = motions[0].at;
    const def = [...first].map(([d, f]) => ({ pos: d.player.position, kind: d.behavior?.kind ?? null, facing: facingAtMotion.get(d) ?? null,
      plant: f.plant !== undefined ? r2(f.plant - m0) : null, restart: f['plant-restart'] !== undefined ? r2(f['plant-restart'] - m0) : null,
      readArm: f.readArm !== undefined ? r2(f.readArm - (release ?? m0)) : null, readArmFromMotion: f.readArm !== undefined ? r2(f.readArm - m0) : null }));
    process.stdout.write(JSON.stringify({ concept: sim.offCall.pass?.id, motions: motions.map((m) => ({ at: r2(m.at), pump: m.end !== null })),
      release: release !== null ? r2(release - m0) : null, def, caught: !!sim.stats.completed, int: sim.events.some((e: any) => e.type === 'interception'),
      yards: res.yards ?? null }) + '\n');
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
