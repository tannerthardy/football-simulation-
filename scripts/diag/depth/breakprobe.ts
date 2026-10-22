/** The defender nearest the target at the throw, while the ball is in the air
 * (observation only; flags from the environment): when he recognizes the
 * throw (playBall's `onBall` tag), his requested and actual speed and his
 * closing on the target every 0.2 s, by coverage behavior. Pairs with
 * depth/breakcurve.py (same quantities on tracking).
 * node --import tsx scripts/diag/depth/breakprobe.ts [--seed 101] [--games 3] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { Agent } from '../../../src/sim/agent.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '3'));
const LAGS = [0, .2, .4, .6, .8];
type Row = { kind: string; sep: number; onBall: number; air: number; ask: number[]; speed: number[]; closing: number[]; turn: number[]; back: number[]; support: string[]; faceVel: number[]; cmdFace: number[] };
const rows: Row[] = [];
const hooks = {
  playResult: (sim: PlaySim) => {
    let row: Row | null = null, d: Agent | null = null, r: Agent | null = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.throwAt < 0) return;
      if (!row && sim.ball.kind === 'air') {
        const target = (sim.ball as { target?: Agent }).target ?? sim.agents.find(a => a.team === 'O' && a.tags.has('target')) ?? null;
        if (!target) return;
        r = target;
        d = sim.defense.reduce((p, q) => Math.hypot(q.pos.x - r!.pos.x, q.pos.y - r!.pos.y) < Math.hypot(p.pos.x - r!.pos.x, p.pos.y - r!.pos.y) ? q : p);
        row = { kind: d.behavior?.kind ?? '?', sep: Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y), onBall: NaN, air: NaN,
          ask: LAGS.map(() => NaN), speed: LAGS.map(() => NaN), closing: LAGS.map(() => NaN), turn: LAGS.map(() => NaN), back: LAGS.map(() => NaN), support: LAGS.map(() => ''), faceVel: LAGS.map(() => NaN), cmdFace: LAGS.map(() => NaN) };
        rows.push(row);
      }
      if (!row || !d || !r) return;
      const since = sim.t - sim.throwAt;
      if (Number.isNaN(row.onBall) && d.tags.has('onBall')) row.onBall = since;
      if (sim.ball.kind !== 'air') { if (Number.isNaN(row.air)) row.air = since; return; }
      LAGS.forEach((l, i) => {
        if (!Number.isNaN(row!.speed[i]) || since < l - 1e-9) return;
        const gx = r!.pos.x - d!.pos.x, gy = r!.pos.y - d!.pos.y, n = Math.hypot(gx, gy) || 1, ask = sim.intents[d!.idx]?.vel;
        row!.ask[i] = ask ? Math.hypot(ask.x, ask.y) : NaN; row!.speed[i] = d!.speed;
        row!.closing[i] = ((d!.vel.x - r!.vel.x) * gx + (d!.vel.y - r!.vel.y) * gy) / n;
        const sp = d!.speed;
        if (ask && sp > .5 && Math.hypot(ask.x, ask.y) > .5) row!.turn[i] = Math.acos(Math.max(-1, Math.min(1, (ask.x * d!.vel.x + ask.y * d!.vel.y) / (sp * Math.hypot(ask.x, ask.y))))) * 180 / Math.PI;
        if (sp > .5) row!.back[i] = (Math.cos(d!.body.facing) * d!.vel.x + Math.sin(d!.body.facing) * d!.vel.y) / sp < -.3 ? 1 : 0;
        const deg = (u: number) => Math.abs(Math.atan2(Math.sin(u), Math.cos(u))) * 180 / Math.PI;
        if (sp > .5) row!.faceVel[i] = deg(Math.atan2(d!.vel.y, d!.vel.x) - d!.body.facing);
        const cf = sim.intents[d!.idx]?.facing;
        if (ask && cf !== undefined && Math.hypot(ask.x, ask.y) > .5) row!.cmdFace[i] = deg(Math.atan2(ask.y, ask.x) - cf);
        const sup = d!.body.support as { state?: string } | undefined; row!.support[i] = sup?.state ?? '-';
      });
    };
    return sim.run();
  },
};
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  simulateGame(home, away, { seed, hooks } as never);
}
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
for (const kind of [...new Set(rows.map(x => x.kind))]) {
  for (const [band, lo, hi] of [['sep<2', 0, 2], ['sep2-5', 2, 5], ['sep5+', 5, 99]] as const) {
    const R = rows.filter(x => x.kind === kind && x.sep >= lo && x.sep < hi);
    if (R.length < 5) continue;
    console.log(`${kind.padEnd(10)} ${band.padEnd(6)} n ${String(R.length).padStart(3)} | recognizes +${med(R.map(x => x.onBall))} s (never ${R.filter(x => Number.isNaN(x.onBall)).length}) air ${med(R.map(x => x.air))} s | `
      + LAGS.map((l, i) => `+${l}: ask ${med(R.map(x => x.ask[i]))} has ${med(R.map(x => x.speed[i]))} close ${med(R.map(x => x.closing[i]))}`).join(' | '));
    const share = (f: (x: Row, i: number) => boolean, i: number) => `${(100 * R.filter(x => f(x, i)).length / R.length).toFixed(0)}%`;
    console.log('    ' + LAGS.map((l, i) => `+${l}: ask-vs-moving ${med(R.map(x => x.turn[i]))} deg (>90: ${share((x, j) => x.turn[j] > 90, i)}) backpedal ${share((x, j) => x.back[j] === 1, i)} not up ${share((x, j) => !!x.support[j] && x.support[j] !== 'up' && x.support[j] !== '-', i)} facing-vs-moving ${med(R.map(x => x.faceVel[i]))} asked facing-vs-asked travel ${med(R.map(x => x.cmdFace[i]))} (set ${share((x, j) => Number.isFinite(x.cmdFace[j]), i)})`).join(' | '));
  }
}
