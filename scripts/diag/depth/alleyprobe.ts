/** Deep run support on runs reaching 10 yd (observation only; flags from the
 * environment). Deep support = defenders 8+ yd off the ball within 12 yd of
 * it laterally at the snap (as depth/alleypath.py). At the tick the carrier
 * crosses 5 yd past the line, the nearest one: behavior, fit kind, engaged
 * with a blocker, requested and actual speed toward the line, depth and
 * lateral gap to the carrier; and over the play, his tackle events and
 * whether the run reached 20.
 * node --import tsx scripts/diag/depth/alleyprobe.ts [--seed 101] [--games 3] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { Agent } from '../../../src/sim/agent.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '3'));
type Row = { reach20: boolean; reach10: boolean; kind: string; fit: string; engaged: boolean; ask: number; down: number; deeper: number; lat: number; events: string[]; firstEv: number; declaredAt: number };
const rows: Row[] = [];
const hooks = {
  playResult: (sim: PlaySim) => {
    if (sim.isPass) return sim.run();
    const dir = sim.attackDir('O');
    const deep = sim.defense.filter(d => (d.pos.x - sim.los) * dir >= 8 && Math.abs(d.pos.y - sim.ballY) <= 12);
    let row: Row | null = null, d: Agent | null = null, best = 0;
    const event = sim.event.bind(sim);
    sim.event = (type, a, b, note) => {
      event(type, a, b, note);
      if (row && d && (a === d || b === d) && /tackle|hit|contact/.test(type)) {
        row.events.push(type); if (Number.isNaN(row.firstEv)) row.firstEv = (sim.carrier ? (sim.carrier.pos.x - sim.los) * dir : NaN);
      }
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      const c = sim.carrier;
      if (!c || c.team !== 'O' || c === sim.qb || !deep.length) return;
      const past = (c.pos.x - sim.los) * dir; best = Math.max(best, past);
      if (row) { row.reach10 ||= past >= 10; row.reach20 ||= past >= 20; return; }
      if (past < 5) return;
      d = deep.reduce((p, q) => Math.hypot(q.pos.x - c.pos.x, q.pos.y - c.pos.y) < Math.hypot(p.pos.x - c.pos.x, p.pos.y - c.pos.y) ? q : p);
      const ask = sim.intents[d.idx]?.vel;
      row = { reach10: false, reach20: false, kind: d.behavior?.kind ?? '?', fit: d.runFit?.kind ?? '-', engaged: !!d.engagement,
        ask: ask ? -ask.x * dir : NaN, down: -d.vel.x * dir, deeper: (d.pos.x - c.pos.x) * dir, lat: Math.abs(d.pos.y - c.pos.y), events: [], firstEv: NaN, declaredAt: NaN };
      rows.push(row);
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
const pct = (n: number, t: number) => `${(100 * n / Math.max(1, t)).toFixed(0)}%`;
const count = (R: Row[], f: (r: Row) => string) => [...R.reduce((m, r) => m.set(f(r), (m.get(f(r)) ?? 0) + 1), new Map<string, number>())].map(([k, n]) => `${k} ${pct(n, R.length)}`).join(', ');
for (const [lab, R] of [['reached 5, not 10', rows.filter(r => !r.reach10)], ['10-19', rows.filter(r => r.reach10 && !r.reach20)], ['20+', rows.filter(r => r.reach20)]] as const) {
  if (!R.length) continue;
  console.log(`${lab.padEnd(18)} n ${String(R.length).padStart(3)} | at 5 yd: deeper ${med(R.map(r => r.deeper))} lateral ${med(R.map(r => r.lat))} downhill ask ${med(R.map(r => r.ask))} has ${med(R.map(r => r.down))} | engaged ${pct(R.filter(r => r.engaged).length, R.length)}`
    + ` | behavior ${count(R, r => r.kind + '/' + r.fit)} | his events ${count(R, r => r.events.length ? [...new Set(r.events)].join('+') : 'none')} first at ${med(R.map(r => r.firstEv))} yd`);
}
