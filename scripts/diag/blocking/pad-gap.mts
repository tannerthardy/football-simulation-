/** Pad-level gap between engaged pairs in games (Phase 0 item 3; read-only tap on PlaySim.tick, no RNG draw, no behavior change).
 *   node --import tsx scripts/diag/blocking/pad-gap.mts [--seed 101] [--games 4] [--first 0] [--out out/p0/pad-gap-101.json]
 * Every hands joint between an offensive lineman and a defender (DL/LB/EDGE) in pass and run plays. Per pair, at 0.3 / 0.6 / 1.0 / 1.5 s after the pair's first tick: each man's pad height (support posture mapped by padHeightAt), the gap
 * (defender minus blocker, yd; negative = the defender is lower), his requested posture (the intent), his posture rating inputs (bend, strength, mass), and the vertical load felt (liftFelt / m g). One sample per pair per age. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';
import { padHeightAt, supportParams } from '../../../src/physics/support.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '4')), first = Number(arg('--first', '0')), out = arg('--out', 'out/p0/pad-gap.json');
mkdirSync(dirname(out), { recursive: true });
const proto = PlaySim.prototype as unknown as { tick: () => void }; const tick0 = proto.tick;
const AGES = [0.3, 0.6, 1.0, 1.5];
const OLP = new Set(['OT', 'OG', 'C', 'T', 'G']);
interface Row { kind: string; age: number; bPos: string; dPos: string; bPad: number; dPad: number; bPost: number; dPost: number; bReq: number | null; dReq: number | null; bLift: number; dLift: number; bKg: number; dKg: number; bStr: number; dStr: number; bBend: number; dBend: number }
const rows: Row[] = [];
const state = new WeakMap<object, Map<string, { t0: number; done: Set<number> }>>();
proto.tick = function (this: any) {
  const res = tick0.call(this);
  try {
    if (compilingPlan() || this.t < 0 || !(this.offCall?.kind === 'pass' || this.offCall?.kind === 'run') || this.offCall.pass?.screen) return res;
    let S = state.get(this); if (!S) { S = new Map(); state.set(this, S); }
    const seen = new Set<string>();
    for (const j of this.world?.joints ?? []) {
      if (j.kind !== 'hands' || j.off) continue;
      const A = this.agents.find((a: any) => a.body === j.a), B = this.agents.find((a: any) => a.body === j.b);
      if (!A || !B) continue;
      const aOff = A.team === 'O', bOff = B.team === 'O';
      let blk: any = null, def: any = null;
      if (aOff && !bOff) { blk = A; def = B; } else if (bOff && !aOff) { blk = B; def = A; } else continue;
      if (!OLP.has(blk.player?.position ?? blk.profile?.position ?? '') && !/^(LT|LG|C|RG|RT)$/.test(blk.slot)) continue;
      const key = `${blk.idx}-${def.idx}`; seen.add(key);
      let s = S.get(key); if (!s) { s = { t0: this.t, done: new Set() }; S.set(key, s); }
      const age = this.t - s.t0;
      for (const a of AGES) if (age >= a && !s.done.has(a)) {
        s.done.add(a);
        const sb = blk.body.support, sd = def.body.support; if (!sb || !sd) continue;
        const pb = padHeightAt(supportParams(blk.profile), sb.posture), pd = padHeightAt(supportParams(def.profile), sd.posture);
        const lf = (i: number, p: any) => (this.world.liftFelt?.[i] ?? 0) / (p.massKg * 10.73);
        rows.push({ kind: this.offCall.kind, age: a, bPos: blk.slot ?? '?', dPos: def.slot ?? '?', bPad: pb, dPad: pd, bPost: sb.posture, dPost: sd.posture,
          bReq: this.cmds?.[blk.idx]?.posture ?? null, dReq: this.cmds?.[def.idx]?.posture ?? null, bLift: lf(blk.idx, blk.profile), dLift: lf(def.idx, def.profile),
          bKg: blk.profile.massKg, dKg: def.profile.massKg, bStr: blk.profile.power / blk.profile.massKg, dStr: def.profile.power / def.profile.massKg, bBend: blk.profile.bend ?? 0, dBend: def.profile.bend ?? 0 });
      }
    }
    for (const k of [...S.keys()]) if (!seen.has(k)) S.delete(k);
  } catch { /* read-only tap */ }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) { simulateGame(home, away, { seed: seed + first + g }); console.error(`game ${g + 1}/${games}: ${rows.length} samples`); }
writeFileSync(out, JSON.stringify(rows));
