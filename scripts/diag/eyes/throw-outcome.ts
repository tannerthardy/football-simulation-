// QB lane 2026-11-24 (Integration, before merging the clock on FLIGHT_BREAK): where the completions go. Per pass
// thrown by the passer: the outcome (complete, interception, throwaway, contested: a pbu or deflection by a defender,
// drop, miss: reached and not catchable, off target: incomplete with no touch), his read index at the throw and how many
// reads, the target's route family and release minus break (stop: under half his peak speed after the peak; others:
// sharpest turn > 25 deg over +-0.2 s at > 2 yd/s, on 10 Hz samples), time from the snap, whether the throw came within
// 0.3 s of a hold releasing (QB_STEP_CLOCK: he left a read past its step just before) and whether the keyed pair had
// expired. Measurement only; QB_STEP_CLOCK on and =0 on the same seeds.
//   node --import tsx scripts/diag/eyes/throw-outcome.ts <seed> <games> > rows.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const FAM: Record<string, string> = { hitch: 'stop', quick_hitch: 'stop', hook: 'stop', curl: 'stop', comeback: 'stop', stick: 'stop',
  quick_out: 'out', out: 'out', corner: 'out', back_out: 'out', dig: 'in', slant: 'in', short_in: 'in', post: 'in',
  cross: 'cross', shallow: 'cross', shallow_high: 'cross', mesh_under: 'cross', go: 'vertical', seam: 'vertical' };
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
type S = [number, number, number, number, number];
function breakAt(P: S[], fam: string): number | null {
  if (P.length < 8) return null;
  const sp = P.map((s) => Math.hypot(s[3], s[4]));
  if (fam === 'stop') { let kp = 3; for (let k = 3; k < P.length; k++) if (sp[k] > sp[kp]) kp = k; for (let k = kp + 1; k < P.length; k++) if (sp[k] < 0.5 * sp[kp]) return P[k][0]; return null; }
  if (fam === 'vertical' || fam === 'other') return null;
  let best = 0, kb = -1; const w = 2;
  for (let k = Math.max(3, w); k < P.length - w; k++) {
    if (sp[k - w] < 2 || sp[k + w] < 2) continue;
    const d = Math.abs(wrap(Math.atan2(P[k + w][4], P[k + w][3]) - Math.atan2(P[k - w][4], P[k - w][3])));
    if (d > best) { best = d; kb = k; }
  }
  return kb >= 0 && best > 25 * Math.PI / 180 ? P[kb][0] : null;
}
PlaySim.prototype.run = ((orig) => function (this: any) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let qbb: any = null, rel: any = null, lastT = -1; const track: Record<number, S[]> = {};
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, throwaway = false, ...rest: any[]) => {
    if (p === sim.qb && !rel) {
      const b = qbb, ll = b?.lookLog ?? [], lastLeave = ll.length ? ll[ll.length - 1] : null;
      let keyExp = false; if (b?.keyPair) { keyExp = true; for (const r of b.keyPair) if (r !== b.planOutlet && !b.expired?.has(r)) keyExp = false; }
      rel = { t: sim.t, arr: arrivalT, target: target?.idx ?? null, rid: target?.behavior?.route?.id ?? null, away: !!throwaway || !target,
        readIdx: b?.readIdx ?? null, nReads: b?.reads?.length ?? null, onRead: b?.reads?.[b.readIdx] === target,
        afterHold: !!lastLeave && lastLeave.past > 0 && sim.t - lastLeave.t <= 0.3, keyExp, snap: b?.snapAt ?? 0,
        quick: b?.concept?.family === 'quick', concept: b?.concept?.id ?? b?.concept?.name ?? null, relooks: b?.relooks ?? null, lastLeft: lastLeave?.slot ?? null, lastRes: lastLeave?.res ?? null, expired: b?.expired?.size ?? null };
    }
    return tb(p, target, v0, intended, arrivalT, throwaway, ...rest);
  };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0();
    const b: any = sim.qb.behavior; if (b?.kind === 'qb-pass') qbb = b;
    if (sim.t - lastT >= 0.099) { lastT = sim.t; for (const a of sim.offense) (track[a.idx] ??= []).push([sim.t, a.pos.x, a.pos.y, a.vel.x, a.vel.y]); }
  };
  const res = orig.apply(this);
  if (rel) {
    const ev = (sim.events as any[]).filter((e) => e.t >= rel.t - 1e-6), has = (k: string) => ev.some((e) => e.type === k);
    const defIdx = new Set(sim.defense.map((d: any) => d.idx));
    let out: string;
    if (rel.away) out = 'throwaway';
    else if (has('interception')) out = 'int';
    else if (sim.stats.completed || has('catch')) out = 'complete';
    else if (ev.some((e) => (e.type === 'pbu' || e.type === 'deflection') && defIdx.has(e.a))) out = 'contested';
    else if (has('drop')) out = 'drop';
    else if (has('miss')) out = 'miss';
    else out = 'offTarget';
    const fam = FAM[String(rel.rid ?? '').split(':').pop() as string] ?? 'other';
    const tr = rel.target !== null ? (track[rel.target] ?? []).filter((s) => s[0] <= rel.arr + 0.3) : [];
    const brk = rel.target !== null ? breakAt(tr, fam) : null;
    console.log(JSON.stringify({ seed, out, fam, rel: +(rel.t - rel.snap).toFixed(2), relBrk: brk === null ? null : +(rel.t - brk).toFixed(2),
      readIdx: rel.readIdx, nReads: rel.nReads, onRead: rel.onRead, afterHold: rel.afterHold, keyExp: rel.keyExp, quick: rel.quick, concept: rel.concept, relooks: rel.relooks, lastLeft: rel.lastLeft, lastRes: rel.lastRes, expired: rel.expired, yards: sim.stats.yards ?? null }));
  }
  return res;
})(PlaySim.prototype.run);
for (let g = 0; g < games; g++) { const s = seed + g, rng = new Rng(s); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 }); simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s }); }
