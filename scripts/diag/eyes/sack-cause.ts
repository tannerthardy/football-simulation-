// QB lane 2026-11-24 (Integration, before merging QB_STEP_CLOCK): which dropbacks become sacks with the clock on. Per
// pass play: sacked or not, time from snap, his phase and behaviour at the sack, his read index and how many reads he
// had, the quick family (READ_WINDOW acts there), whether the keyed pair expired, the confidence holds (QB_STEP_CLOCK:
// time on a read after its step was due, unsure) and whether he was in one at the sack, his felt pressure (barNow.u:
// first time >= 0.5, at the sack) and whether he left the pocket behaviour. Measurement only; run with QB_STEP_CLOCK on
// and =0 (and READ_WINDOW=0) on the same seeds.
//   node --import tsx scripts/diag/eyes/sack-cause.ts <seed> <games> > rows.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
PlaySim.prototype.run = ((orig) => function (this: any) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let qbb: any = null, thrownAt: number | null = null, u5: number | null = null, uLast = 0, uMax = 0, keyExp: number | null = null, leftAt: number | null = null, leftKind: string | null = null;
  let last: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, ...rest: any[]) => { if (p === sim.qb && thrownAt === null) thrownAt = sim.t; return tb(p, ...rest); };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0();
    const b: any = sim.qb.behavior;
    if (b?.kind === 'qb-pass') qbb = b;
    if (!qbb || thrownAt !== null) return;
    if (b !== qbb && leftAt === null && sim.carrier === sim.qb) { leftAt = sim.t; leftKind = b?.kind ?? null; }
    const u = qbb.barNow?.u ?? 0; uLast = u; uMax = Math.max(uMax, u); if (u5 === null && u >= 0.5) u5 = sim.t;
    if (keyExp === null && qbb.keyPair) { let all = true; for (const r of qbb.keyPair) if (r !== qbb.planOutlet && !qbb.expired?.has(r)) all = false; if (all) keyExp = sim.t; }
    if (b === qbb) {
      const read = qbb.reads?.[qbb.readIdx], l = read ? qbb.looks?.get(read) : null;
      last = { phase: qbb.phase, readIdx: qbb.readIdx, nReads: qbb.reads?.length ?? 0, holdNow: l?.due !== undefined ? +(sim.t - l.due).toFixed(2) : 0,
        res: read && qbb.resolved ? +qbb.resolved(read).toFixed(2) : null };
    }
  };
  const res = orig.apply(this);
  const ev = sim.events as any[], sk = ev.find((e) => e.type === 'sack');
  if (qbb) {
    const snap = qbb.snapAt ?? 0, rel = (x: number | null) => x === null ? null : +(x - snap).toFixed(2);
    const holds = (qbb.lookLog ?? []).filter((x: any) => x.past > 0);
    console.log(JSON.stringify({ seed, sack: !!sk, tSack: sk ? rel(sk.t) : null, thrown: rel(thrownAt), quick: qbb.concept?.family === 'quick', concept: qbb.concept?.id ?? qbb.concept?.name ?? null,
      plant: +(qbb.drop?.time ?? 0).toFixed(2), keyExp: rel(keyExp), u5: rel(u5), uAtEnd: +uLast.toFixed(2), uMax: +uMax.toFixed(2), left: rel(leftAt), leftKind,
      holdsLeft: holds.length, holdTime: +holds.reduce((s: number, x: any) => s + x.past, 0).toFixed(2), ...(last ?? {}) }));
  }
  return res;
})(PlaySim.prototype.run);
for (let g = 0; g < games; g++) { const s = seed + g, rng = new Rng(s); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 }); simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s }); }
