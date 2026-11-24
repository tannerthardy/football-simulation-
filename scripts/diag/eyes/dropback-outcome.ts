// QB lane 2026-11-24 (Integration, THROWAWAY_FELT): one row per dropback. The outcome (a pass by its result: complete,
// interception, thrown away, contested, drop, miss, off target; a sack; a scramble; else other), time from the snap to
// the throw, the qb.ts line that called his throwAway (a hook; null when the ball was not thrown away by it) and his
// felt state there, and the first time the timer had run out (barNow.clock >= 1) while his felt pressure was under 0.4
// and he was inside the pocket (|y - ballY| < 3.5 yd): a clean-pocket hold the old timer would have ended. For those,
// whether the play ended in a sack, and when. Measurement only; THROWAWAY_FELT on and =0 on the same seeds.
//   node --import tsx scripts/diag/eyes/dropback-outcome.ts <seed> <games> > rows.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
PlaySim.prototype.run = ((orig) => function (this: any) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let qbb: any = null, rel: any = null, away: any = null, clean: number | null = null; const hooked = new Set<any>();
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, throwaway = false, ...rest: any[]) => {
    if (p === sim.qb && !rel) rel = { t: sim.t, away: !!throwaway || !target };
    return tb(p, target, v0, intended, arrivalT, throwaway, ...rest);
  };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0();
    const b: any = sim.qb.behavior;
    if (b?.kind === 'qb-pass' && typeof b.throwAway === 'function') {
      qbb = b;
      if (!hooked.has(b)) {
        hooked.add(b); const ta = b.throwAway.bind(b);
        b.throwAway = (a: any, s: any, at?: any) => {
          if (!away) { const st = String(new Error().stack ?? ''), m = st.match(/qb\.ts:(\d+)/); away = { line: m ? +m[1] : null, felt: +(b.barNow?.urgency ?? 0).toFixed(2), side: +Math.abs(a.pos.y - s.ballY).toFixed(1) }; }
          return ta(a, s, at);
        };
      }
      const bn = b.barNow;
      if (clean === null && !rel && sim.carrier === sim.qb && bn && bn.clock >= 1 && bn.urgency < 0.4 && Math.abs(sim.qb.pos.y - sim.ballY) < 3.5) clean = sim.t;
    }
  };
  const res = orig.apply(this);
  if (qbb) {
    const ev = sim.events as any[], has = (k: string, from = 0) => ev.some((e) => e.type === k && e.t >= from - 1e-6);
    const defIdx = new Set(sim.defense.map((d: any) => d.idx)), snap = qbb.snapAt ?? 0;
    let out: string;
    if (rel) {
      const from = rel.t;
      if (rel.away) out = 'throwaway';
      else if (has('interception', from)) out = 'int';
      else if (sim.stats.completed || has('catch', from)) out = 'complete';
      else if (ev.some((e) => e.t >= from && (e.type === 'pbu' || e.type === 'deflection') && defIdx.has(e.a))) out = 'contested';
      else if (has('drop', from)) out = 'drop';
      else if (has('miss', from)) out = 'miss';
      else out = 'offTarget';
    } else if (has('sack')) out = 'sack';
    else if (has('scramble')) out = 'scramble';
    else out = 'other';
    const sk = ev.find((e) => e.type === 'sack');
    console.log(JSON.stringify({ seed, out, ttt: rel ? +(rel.t - snap).toFixed(2) : null, away: rel?.away ? away : null, awayBy: qbb.awayBy ?? null,
      clean: clean === null ? null : +(clean - snap).toFixed(2), tSack: sk ? +(sk.t - snap).toFixed(2) : null, scramble: has('scramble') }));
  }
  return res;
})(PlaySim.prototype.run);
for (let g = 0; g < games; g++) { const s = seed + g, rng = new Rng(s); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 }); simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s }); }
