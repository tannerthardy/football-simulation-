/** Which part of the chase steers a defender in the side window after the
 * catch (observation only; flags from the environment). Window as in
 * depth/sidepass.py: before the receiver's first contact, a defender 1.5-4 yd
 * ahead of him along his path and 1.5-4.5 yd to his side, the receiver at
 * 3-6 yd/s; first frame per defender per play. There: the chase's gather
 * weight, where his pursuit point lies along the receiver's path (ahead of
 * the defender or behind him), the velocity he asks for and has along the
 * path, and whether he then met the receiver (within 1.0 yd, still level or
 * ahead) inside 1.0 s or was passed (0.5+ yd behind at 1.0 s).
 * node --import tsx scripts/diag/depth/sideprobe.ts [--seed 101] [--games 3] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { gatheringApproach, pursuitPoint } from '../../../src/sim/behaviors/common.js';
import type { Agent } from '../../../src/sim/agent.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '3'));
type Row = { gather: number; aimAhead: number; askAlong: number; velAlong: number; speed: number; fate: string; slot: string };
const rows: Row[] = [];
const rel = (c: Agent, o: Agent) => {
  const s = c.speed, hx = c.vel.x / s, hy = c.vel.y / s, rx = o.pos.x - c.pos.x, ry = o.pos.y - c.pos.y;
  return { ahead: rx * hx + ry * hy, side: Math.abs(-rx * hy + ry * hx), gap: Math.hypot(rx, ry), hx, hy };
};
const hooks = {
  playResult: (sim: PlaySim) => {
    let caught = false, contact = false;
    const open = new Map<Agent, { row: Row; until: number; c: Agent }>(), done = new Set<Agent>();
    const event = sim.event.bind(sim);
    sim.event = (type, a, b, note) => {
      event(type, a, b, note);
      if (type === 'catch' && a?.team === 'O') caught = true;
      if (caught && ['tackle_wrap', 'missed_tackle', 'hit', 'carrier_contact'].includes(type)) contact = true;
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const c = sim.carrier;
      if (caught && !contact && c && c.team === 'O' && c.speed >= 3 && c.speed <= 6) {
        for (const d of sim.opponents(c)) {
          if (done.has(d) || d.isDown(sim.t) || d.engagement) continue;
          const r = rel(c, d);
          if (r.ahead < 1.5 || r.ahead > 4 || r.side < 1.5 || r.side > 4.5) continue;
          done.add(d);
          const seen = sim.see(d, c, (.12 + .12 * (1 - d.r('awareness'))) / Math.max(.1, d.profile.reactionTime));
          const contactR = d.profile.radius + c.profile.radius + d.profile.reach * .65;
          const { gather } = gatheringApproach(d, seen, contactR, 0);
          const p = pursuitPoint(sim, d, c);
          const ask = sim.intents[d.idx]?.vel ?? { x: NaN, y: NaN };
          open.set(d, { c, until: sim.t + 1.0, row: { gather, slot: d.slot.replace(/_.*/, ''), speed: d.speed,
            aimAhead: (p.x - d.pos.x) * r.hx + (p.y - d.pos.y) * r.hy,
            askAlong: ask.x * r.hx + ask.y * r.hy, velAlong: d.vel.x * r.hx + d.vel.y * r.hy, fate: 'other' } });
        }
      }
      tick();
      for (const [d, o] of open) {
        if (sim.carrier !== o.c || o.c.speed < .5) { open.delete(d); continue; }
        const r = rel(o.c, d);
        if (r.gap <= 1.0 && r.ahead >= -.3) { o.row.fate = 'met'; rows.push(o.row); open.delete(d); }
        else if (sim.t >= o.until - 1e-9) { o.row.fate = r.ahead <= -.5 ? 'passed' : 'other'; rows.push(o.row); open.delete(d); }
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
console.log(`side-window entries ${rows.length}`);
for (const fate of ['met', 'passed', 'other']) {
  const R = rows.filter(r => r.fate === fate);
  console.log(`${fate.padEnd(6)} ${pct(R.length, rows.length).padStart(4)} | gather>0 ${pct(R.filter(r => r.gather > 0).length, R.length)} | pursuit point ahead of him along the path ${med(R.map(r => r.aimAhead))} yd | along asked ${med(R.map(r => r.askAlong))} moving ${med(R.map(r => r.velAlong))} | speed ${med(R.map(r => r.speed))}`);
}
