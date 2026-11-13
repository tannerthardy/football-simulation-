/** Defensive linemen at a run's first contact (observation only; flags from
 * the environment): for each DL 3-10 yd from the carrier then, whether he is
 * still engaged with a blocker (and since when), on the ground, what speed he
 * asks for and has, and his closing on the carrier. Pairs with
 * depth/runrally.py (tracking and sim exports alike).
 * node --import tsx scripts/diag/depth/dlpursuit.ts [--seed 101] [--games 3] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '3'));
const DL = /^(DE|DT|NT)/;
type Row = { control: number; hands: boolean; load: number; apart: number; helped: boolean; tried: boolean; since: number; engaged: boolean; win: number; down: boolean; ask: number; speed: number; closing: number; past: number; behavior: string };
const rows: Row[] = [];
const hooks = {
  playResult: (sim: PlaySim) => {
    if (sim.isPass) return sim.run();
    let done = false;
    const event = sim.event.bind(sim);
    sim.event = (type, a, b, note) => {
      event(type, a, b, note);
      const c = sim.carrier;
      if (done || !c || c.team !== 'O' || c === sim.qb) return;
      if (!['tackle_wrap', 'missed_tackle', 'hit', 'carrier_contact'].includes(type)) return;
      done = true;
      for (const d of sim.defense) {
        if (!DL.test(d.slot)) continue;
        const gx = c.pos.x - d.pos.x, gy = c.pos.y - d.pos.y, r = Math.hypot(gx, gy);
        if (r <= 3 || r > 10) continue;
        const ask = sim.intents[d.idx]?.vel;
        const e = d.engagement, h = e?.hands as { normalForce?: number; tangentForce?: number } | undefined;
        rows.push({ control: e?.control ?? NaN, hands: !!h, load: h ? Math.hypot(h.normalForce ?? 0, h.tangentForce ?? 0) : NaN,
          apart: e ? Math.hypot(e.blocker.pos.x - d.pos.x, e.blocker.pos.y - d.pos.y) - e.blocker.profile.radius - d.profile.radius : NaN, helped: !!e?.helpers.length, tried: d.tags.has('shed-attempt'), since: d.engagement ? sim.t - d.engagement.start : NaN, engaged: !!d.engagement, win: d.engagement?.win ?? NaN, down: d.isDown(sim.t), behavior: d.behavior?.kind ?? '?',
          ask: ask ? Math.hypot(ask.x, ask.y) : NaN, speed: d.speed,
          closing: ((d.vel.x - c.vel.x) * gx + (d.vel.y - c.vel.y) * gy) / r, past: (c.pos.x - sim.los) * sim.attackDir('O') });
      }
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
const pct = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
for (const [band, lo, hi] of [['behind', -99, 0], ['0-2', 0, 2], ['2-5', 2, 5], ['5+', 5, 99]] as const) {
  const R = rows.filter(r => r.past >= lo && r.past < hi);
  if (!R.length) continue;
  const E = R.filter(r => r.engaged), F = R.filter(r => !r.engaged && !r.down);
  console.log(`contact ${band.padEnd(6)} DL 3-10 yd n ${String(R.length).padStart(3)} | engaged ${pct(E.length, R.length)} (win ${med(E.map(r => r.win))}, speed ${med(E.map(r => r.speed))}, tried to shed ${pct(E.filter(r => r.tried).length, E.length)}, engaged for ${med(E.map(r => r.since))} s) | down ${pct(R.filter(r => r.down).length, R.length)}`
    + ` | free: ask ${med(F.map(r => r.ask))} has ${med(F.map(r => r.speed))} closing ${med(F.map(r => r.closing))} | behaviors ${[...new Set(F.map(r => r.behavior))].join(',')}`);
}
const E = rows.filter(r => r.engaged && r.past >= 0 && r.tried);
console.log(`engaged, tried to shed, contact past the line: n ${E.length} | blocker controls hands ${pct(E.filter(r => r.control > 0).length, E.length)} (control ${med(E.map(r => r.control))}) | hand joint ${pct(E.filter(r => r.hands).length, E.length)}, load ${med(E.map(r => r.load))} N | apart ${med(E.map(r => r.apart))} yd | double-teamed ${pct(E.filter(r => r.helped).length, E.length)}`);
