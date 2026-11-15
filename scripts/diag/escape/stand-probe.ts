// node --import tsx scripts/diag/escape/stand-probe.ts [seed] [games] > rows.jsonl
// Why he stands with a free interior rusher coming. On each dropback, the first interior defender (DT / NT slot) who
// is off any blocker and comes within 3 yd of the quarterback while he holds the ball behind the line: from that
// moment until the man is within 1 yd, the ball is gone, or 1.2 s pass, per tick: which branch of his update moved
// him (pocketMove, noThrow, evade, scramble, a throw), his speed and its upfield part, his pressure estimate (time,
// and whether it names this man), and where he feels the man against where the man is. One row per event.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const tick = sim.tick.bind(sim), dir = sim.attackDir(sim.qb.team); let ev: any = null, hooked: any = null, br = '-', done = false;
  sim.tick = () => {
    const b: any = sim.qb.behavior;
    if (b?.kind === 'qb-pass' && hooked !== b) { hooked = b;
      for (const k of ['pocketMove', 'noThrow', 'evade', 'scramble', 'startThrow', 'whileLooking', 'throwAway']) { const f = b[k]?.bind(b); if (f) b[k] = (...xs: any[]) => { br = br === '-' || k === 'evade' || k === 'startThrow' || k === 'throwAway' || k === 'scramble' ? k : br; return f(...xs); }; } }
    br = '-'; tick();
    if (done || b?.kind !== 'qb-pass') return;
    const q = sim.qb, holding = sim.ball.kind === 'held' && sim.ball.carrier === q && (q.pos.x - sim.los) * dir < 0;
    if (!ev) {
      if (!holding || b.phase === 'snap') return;
      const m = sim.defense.filter((d: any) => /^(DT|NT)/.test(d.slot) && !d.engagement && !d.isDown(sim.t)).map((d: any) => ({ d, dist: Math.hypot(d.pos.x - q.pos.x, d.pos.y - q.pos.y) })).filter((x: any) => x.dist <= 3).sort((x: any, y: any) => x.dist - y.dist)[0];
      if (m) ev = { d: m.d, t0: sim.t, phase0: b.phase, ticks: [] as any[] };
      else return;
    }
    const d = ev.d, dist = Math.hypot(d.pos.x - q.pos.x, d.pos.y - q.pos.y), p = b.pressure(q, sim), f = b.felt(q, sim, d);
    const closing = ((d.vel.x - q.vel.x) * (q.pos.x - d.pos.x) + (d.vel.y - q.vel.y) * (q.pos.y - d.pos.y)) / (dist || 1);
    ev.ticks.push({ br, sp: Math.hypot(q.vel.x, q.vel.y), up: q.vel.x * dir, dist, closing, pt: p.time, mine: p.agent === d, feltD: Math.hypot(f.pos.x - q.pos.x, f.pos.y - q.pos.y), engaged: !!d.engagement, phase: b.phase });
    if (!holding || dist <= 1.0 || sim.t - ev.t0 >= 1.2) {
      done = true; const T = ev.ticks, n = T.length, mean = (k: string) => +(T.reduce((s: number, x: any) => s + x[k], 0) / n).toFixed(2), cnt: Record<string, number> = {};
      for (const x of T) cnt[x.br] = (cnt[x.br] ?? 0) + 1;
      const first = T[0], at = (lo: number, hi: number) => T.filter((x: any) => x.dist > lo && x.dist <= hi);
      const mid = at(1.5, 3);
      console.log(JSON.stringify({ t0: +ev.t0.toFixed(2), slot: d.slot, dur: +(sim.t - ev.t0).toFixed(2), end: !holding ? 'ball gone' : dist <= 1.0 ? 'reached' : 'time', branches: cnt, phase0: ev.phase0,
        qbSpeed: mean('sp'), qbUp: mean('up'), qbSpeedMid: mid.length ? +(mid.reduce((s: number, x: any) => s + x.sp, 0) / mid.length).toFixed(2) : null, closing0: +first.closing.toFixed(1),
        pressure0: +first.pt.toFixed(2), names0: first.mine, feltMinusTrue0: +(first.feltD - first.dist).toFixed(2), alarmTicks: T.filter((x: any) => x.pt < 0.45).length, ticks: n,
        reEngaged: T.some((x: any) => x.engaged), sacked: false }));
    }
  };
  return orig.apply(this);
};
const seed = Number(process.argv[2] ?? 11);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 4); g++) simulateGame(home, away, { seed: seed + g });
