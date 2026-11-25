/** Which controllers step the speed and the heading of our tracks? Read-only tap on PlaySim.tick (no RNG draw, no behavior change).
 *   node --import tsx scripts/diag/body/sim_steps.mts [--seed 101] [--games 2] [--first 0] [--out out/body/steps-101-0.json]
 * Every live tick (0.05 s) of every player in every pass play (not screens), from the snap to the release (the census's window): the body velocity, the controller's requested velocity (`sim.cmds`), whether he is in contact with anybody or has a joint on him, and his group (the behaviour's kind through dither-core's GROUP).
 * On the 0.1 s export grid a player moving 2 yd/s or more is a SPEED STEP at an interval when |s(k+1) - s(k)| / 0.1 exceeds 4.1 yd/s2 (the NFL's p90 of the same operator, jitter.py A) and a HEADING STEP when the direction of travel turns more than 8 degrees (the NFL's p90 is 5.1)
 * at 3 yd/s or more. Each step is charged to its cause from the requests over the interval and the tick before it:
 *   request changed: a request turned more than 20 degrees (both over 1 yd/s) or its length changed by more than 2 yd/s between consecutive ticks, or the request started or stopped (over 1 yd/s);
 *   contact: not that, but he was in World contact or had a joint on him in the interval;
 *   steady request, no contact: neither (the body's own response: the friction ellipse, a plant, the support model).
 * Output: counts per group and cause, per moving player-interval. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';
import { GROUP } from '../effective-mass/dither-core.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '2')), first = Number(arg('--first', '0')), out = arg('--out', 'out/body/steps.json');
mkdirSync(dirname(out), { recursive: true });
const proto = PlaySim.prototype as unknown as { tick: () => void }; const tick0 = proto.tick;
interface Rec { pos: string[]; P: number[][][]; V: number[][][]; R: number[][][]; C: number[][]; K: string[][]; N: number }
const recs = new WeakMap<object, Rec | null>(); const plays: Rec[] = [];
proto.tick = function (this: any) {
  if (!recs.has(this)) { const live = !compilingPlan() && this.offCall?.kind === 'pass' && !this.offCall.pass?.screen; let r: Rec | null = null; if (live) { r = { pos: this.agents.map((a: any) => a.player?.position ?? '?'), P: [], V: [], R: [], C: [], K: [], N: this.agents.length }; plays.push(r); } recs.set(this, r); }
  const rec = recs.get(this) as Rec | null; const res = tick0.call(this);
  if (rec && this.t >= -1e-9 && this.ball?.kind !== 'air' && this.t < 4.5) {
    try {
      const n = this.agents.length, cs = this.lastStep?.contacts ?? [], jn = this.world?.joints ?? [];
      rec.P.push(this.agents.map((a: any) => [a.pos.x, a.pos.y])); rec.V.push(this.agents.map((a: any) => [a.vel.x, a.vel.y]));
      rec.R.push(this.agents.map((_: any, i: number) => { const c = this.cmds?.[i]?.vel; return c ? [c.x, c.y] : [0, 0]; }));
      rec.C.push(this.agents.map((a: any, i: number) => (cs.some((h: any) => h.i === i || h.j === i) || jn.some((j: any) => !j.off && (j.a === a.body || j.b === a.body))) ? 1 : 0));
      rec.K.push(this.agents.map((a: any) => a.behavior?.kind ?? '-'));
    } catch { /* read-only */ }
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) { simulateGame(home, away, { seed: seed + first + g }); console.error(`game ${g + 1}/${games}: ${plays.length} plays`); }
const ang = (a: number[], b: number[]) => Math.abs(((Math.atan2(b[1], b[0]) - Math.atan2(a[1], a[0])) * 180 / Math.PI + 540) % 360 - 180);
const sp = (v: number[]) => Math.hypot(v[0], v[1]);
const reqChanged = (r0: number[], r1: number[]) => (sp(r0) > 1) !== (sp(r1) > 1) || (sp(r0) > 1 && sp(r1) > 1 && ang(r0, r1) > 20) || Math.abs(sp(r1) - sp(r0)) > 2;
const tally: Record<string, Record<string, number>> = {};
const add = (g: string, k: string) => { (tally[g] ??= {})[k] = (tally[g][k] ?? 0) + 1; };
for (const p of plays) {
  const F = p.P.length; if (F < 12) continue;
  for (let i = 0; i < p.N; i++) {
    for (let k = 2; k + 4 < F; k += 2) { // 0.1 s grid: tick k, k+2, k+4
      const s = (a: number, b: number) => Math.hypot(p.P[b][i][0] - p.P[a][i][0], p.P[b][i][1] - p.P[a][i][1]) / 0.1;
      const s0 = s(k - 2, k), s1 = s(k, k + 2);
      if (Math.min(s0, s1) < 2) continue;
      const PG: Record<string, string> = { WR: 'WR', TE: 'TE', RB: 'RB', FB: 'RB', HB: 'RB', QB: 'QB', T: 'OL', G: 'OL', C: 'OL', OT: 'OL', OG: 'OL', DE: 'DL', DT: 'DL', NT: 'DL', DL: 'DL', EDGE: 'DL', LB: 'LB', ILB: 'LB', OLB: 'LB', MLB: 'LB', CB: 'CB', NB: 'CB', DB: 'CB', S: 'S', FS: 'S', SS: 'S' };
      const grp = 'pos ' + (PG[p.pos[i]] ?? p.pos[i]);
      add(grp, 'moving intervals');
      const hd = (a: number, b: number) => [p.P[b][i][0] - p.P[a][i][0], p.P[b][i][1] - p.P[a][i][1]];
      const aStep = Math.abs(s1 - s0) / 0.1 > 4.1, hStep = Math.min(s0, s1) >= 3 && ang(hd(k - 2, k), hd(k, k + 2)) > 8;
      if (!aStep && !hStep) continue;
      // the request over the interval (ticks k-1 .. k+2 around the grid points k-2, k, k+2): rotated, sped up or slowed, started or stopped?
      const r0 = p.R[k - 1][i], r1 = p.R[k + 2][i];
      const turnedReq = sp(r0) > 1 && sp(r1) > 1 ? ang(r0, r1) >= 8 : (sp(r0) > 1) !== (sp(r1) > 1);
      let tickJump = false; for (let t = k; t <= k + 2; t++) if (reqChanged(p.R[t - 1][i], p.R[t][i])) tickJump = true;
      const speedReq = Math.abs(sp(r1) - sp(r0)) > 1.5;
      let ct = false; for (let t = k - 1; t <= k + 2; t++) if (p.C[t][i]) ct = true;
      // a request that jumped or turned within the 0.4 s before the interval is still being carried out (the body's response lags the request)
      let recent = false; for (let t = Math.max(1, k - 8); t < k - 1; t++) if (reqChanged(p.R[t - 1][i], p.R[t][i])) recent = true;
      const cause = tickJump ? 'request jumped' : (turnedReq || speedReq) ? 'request moved smoothly' : recent ? 'request jumped within the 0.4 s before (response)' : ct ? 'contact or joint' : 'neither: body response';
      const ctrl = GROUP[p.K[k][i]] ?? p.K[k][i];
      if (aStep) { add(grp, 'speed step'); add(grp, `speed step: ${cause}`); if (cause.startsWith('request') && !cause.includes('before')) add('ctrl ' + ctrl, `speed step: ${cause}`); }
      if (hStep) { add(grp, 'heading step'); add(grp, `heading step: ${cause}`); if (cause.startsWith('request') && !cause.includes('before')) add('ctrl ' + ctrl, `heading step: ${cause}`); }
    }
  }
}
writeFileSync(out, JSON.stringify(tally));
console.log(JSON.stringify(tally));
