/**
 * BLITZ_READ trap measure (league games, passive; run with BLITZ_READ=1): per pass play,
 *  - each non-lineman's snap alignment class (BLITZ_READ's prior classes: line off-ball / box / edge / else, true
 *    positions) and whether he is rushing at 1.0 s (rush/blitz behaviour), for prior vs realized rush rates;
 *  - each non-lineman rusher's snap spot and whether a non-rusher is within 4 yd of it at 0.5 s (Defense's refill);
 *  - his hot call: the man he believed most (rushB argmax) when it fired, whether that man rushes, whether his seat
 *    was refilled at 0.5 s, the look-prior target, and the QB's awareness/decisionMaking;
 *  - the throw (time, target, air yards, completion), max rush excess in the first 2.5 s, and the interceptor
 *    (position, behaviour, zone/dropping-lineman, distance from the believed man's snap spot).
 *   BLITZ_READ=1 node --import tsx scripts/diag/eyes/blitz-trap.ts [--seed 101] [--games 8] > out/eyes/trap-101.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const DLINE = ['DE', 'DT', 'NT', 'EDGE'];
const rushing = (d: any) => d.behavior?.kind === 'rush' || d.behavior?.kind === 'blitz';
const cls = (depth: number, wide: number) => depth <= 1.5 && wide <= 9.5 ? 'line' : depth <= 6 && wide <= 5.5 ? 'box' : depth <= 2.5 && wide <= 9.5 ? 'edge' : 'else';
const r2 = (v: number) => +v.toFixed(2);
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  if (sim.offCall?.kind !== 'pass') return run.call(this);
  const snapAt = new Map<any, { x: number; y: number; cls: string }>();
  let align = null as any[] | null, seats = null as any[] | null, hot: any = null, thr: any = null, qbB: any = null, maxEx = 0, maxFreeU = 0, fakeRec: any = null;
  const kinds05 = new Map<any, string>(), kindsThr = new Map<any, string>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const was = sim.ball.kind;
    tick();
    const dir = sim.attackDir('O');
    if (!snapAt.size) for (const d of sim.defense) {
      if (DLINE.includes(d.player.position)) continue;
      snapAt.set(d, { x: d.pos.x, y: d.pos.y, cls: cls((d.pos.x - sim.los) * dir, Math.abs(d.pos.y - sim.ballY)) });
    }
    if (!qbB && sim.qb.behavior?.kind === 'qb-pass') qbB = sim.qb.behavior;
    if (qbB && qbB.fakeEndAt !== null && !fakeRec) fakeRec = { freeU: r2(qbB.freeU ?? 0), excess: r2(qbB.rushExcess ?? 0), depth: r2((sim.los - sim.qb.pos.x) * dir) };
    if (qbB && sim.t <= 2.5) { maxEx = Math.max(maxEx, qbB.rushExcess ?? 0); maxFreeU = Math.max(maxFreeU, qbB.freeU ?? 0); }
    if (!seats && sim.t >= 0.5 - 1e-9) {
      seats = [];
      for (const d of sim.defense) kinds05.set(d, `${d.player.position}:${d.behavior?.kind ?? '-'}`);
      for (const [d, s] of snapAt) if (rushing(d)) {
        const fill = sim.defense.filter((o: any) => o !== d && !rushing(o) && Math.hypot(o.pos.x - s.x, o.pos.y - s.y) <= 4);
        seats.push({ d, refilled: fill.length > 0, by: fill.map((o: any) => `${o.player.position}:${o.behavior?.kind}`) });
      }
    }
    if (!align && sim.t >= 1.0 - 1e-9) align = [...snapAt].map(([d, s]) => ({ cls: s.cls, pos: d.player.position, rush: rushing(d) }));
    if (qbB && !hot && qbB.hot) {
      let top: any = null, tp = -1;
      if (qbB.freeThreat) { top = qbB.freeThreat.d; tp = qbB.freeThreat.p; }
      else for (const [d, r] of qbB.rushB) if (r.p > tp) { top = d; tp = r.p; }
      hot = { at: r2(qbB.hot.at), target: qbB.hot.target?.slot ?? null, targetAgent: qbB.hot.target, top, topP: r2(tp),
        topPos: top?.player.position ?? null, topCls: top ? snapAt.get(top)?.cls ?? null : null, topRushNow: top ? rushing(top) : null, excess: r2(qbB.rushExcess) };
    }
    if (!thr && was !== 'air' && sim.ball.kind === 'air') {
      const b = sim.ball;
      for (const d of sim.defense) kindsThr.set(d, d.behavior?.kind ?? '-');
      thr = { t: r2(sim.t), slot: b.target?.slot ?? null, targetAgent: b.target, away: !!b.throwaway, air: b.intended ? r2((b.intended.x - sim.los) * dir) : null };
    }
  };
  const res = run.call(this);
  const intEv = sim.events.find((e: any) => e.type === 'interception');
  let picker: any = null;
  if (intEv) {
    const who = [...sim.defense, ...sim.offense].find((x: any) => x.idx === intEv.a) ?? null;
    if (who) {
      const ts = hot?.top ? snapAt.get(hot.top) : null;
      picker = { pos: who.player.position, kindThr: kindsThr.get(who) ?? null, kind05: kinds05.get(who) ?? null,
        dline: DLINE.includes(who.player.position), isTop: hot?.top === who,
        fromTopSeat: ts && snapAt.get(who) ? r2(Math.hypot(snapAt.get(who)!.x - ts.x, snapAt.get(who)!.y - ts.y)) : null,
        refilledTopSeat: !!(hot?.top && seats?.find((s) => s.d === hot.top)?.by.length && seats.find((s) => s.d === hot.top)!.by.some((b: string) => b.startsWith(who.player.position + ':'))) };
    }
  }
  const a = sim.qb;
  const out: any = {
    concept: sim.offCall.pass?.id, pressure: sim.defCall?.pressure?.id ?? null, coverage: sim.defCall?.coverage?.id ?? null,
    qb: { name: a.player.name ?? a.player.id ?? null, aw: r2(a.r('awareness')), dm: r2(a.r('decisionMaking')) },
    align, seats: seats?.map((s) => ({ pos: s.d.player.position, refilled: s.refilled, by: s.by })),
    hot: hot ? { at: hot.at, target: hot.target, topP: hot.topP, topPos: hot.topPos, topCls: hot.topCls, topRushNow: hot.topRushNow, excess: hot.excess,
      topRushes: hot.top ? rushing(hot.top) || sim.events.some(() => false) : null,
      topRushed05: hot.top ? (seats?.some((s) => s.d === hot.top) ?? false) : null,
      topRefilled: hot.top ? (seats?.find((s) => s.d === hot.top)?.refilled ?? null) : null,
      toTarget: !!thr && !!hot.targetAgent && thr.targetAgent === hot.targetAgent } : null,
    maxEx: r2(maxEx), maxFreeU: r2(maxFreeU), pa: sim.offCall.formation?.qb ? { gun: sim.offCall.formation.qb === 'gun', fakeEnd: qbB?.fakeEndAt ?? null, fake: (qbB as any)?.fakeUntil ?? 0, at: fakeRec } : null,
    thr: thr ? { t: thr.t, slot: thr.slot, away: thr.away, air: thr.air } : null,
    int: !!intEv, picker, sack: sim.events.some((e: any) => e.type === 'sack'), caught: !!sim.stats.completed, outcome: res.outcome, yards: res.yards ?? null,
  };
  process.stdout.write(JSON.stringify(out) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
// QB_PROFILE=top|bottom: every QB's reading ratings set to the middle of the top / bottom third of generated starters
// (300 teams: awareness / decisionMaking / composure / playRecognition at the 5/6 and 1/6 points), same plays otherwise.
const PROFILE: Record<string, Record<string, number>> = {
  top: { awareness: 86, decisionMaking: 84, composure: 84, playRecognition: 85 },
  bottom: { awareness: 69, decisionMaking: 65, composure: 66, playRecognition: 68 },
};
const prof = PROFILE[process.env.QB_PROFILE ?? ''];
if (prof) for (const t of [home, away]) for (const pl of t.roster as any[]) if (pl.position === 'QB') Object.assign(pl.ratings, prof);
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
