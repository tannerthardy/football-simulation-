// The defense as the passer's judgment (QB_V2 module D) will have to describe it, measured on the engine as it is.
// Per throw: the coverer (the defender nearest the target at the release, auditor's view) with his technique label and
// behaviour at the release; the target's break (last heading change > 30 deg within 0.4 s, or a stop, starting by 0.2 s after the release)
// and the coverer's cushion (+ deeper than the receiver), leverage (+ outside him) and separation at it; his lag after it
// (until his velocity is within 45 deg of the receiver's post-break velocity, over 1.5 yd/s); separation at the release
// and the arrival. Every other defender who broke on the throw (FLIGHT_BREAK's call site): cue (his release belief's
// source at the break), start relative to the release, distance to the catch point at the start and at the arrival.
// Read-only. Tools' game set.   node --import tsx scripts/diag/coverage/qb-roles.mts <seed> <games> <out.jsonl>
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';
import { flightBreakOf } from '../../../src/sim/behaviors/defense.js';
import { lastReleaseBelief } from '../../../src/sim/release-belief.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
import { appendFileSync } from 'node:fs';

const seed = Number(process.argv[2] ?? 23), games = Number(process.argv[3] ?? 1), outPath = process.argv[4] ?? 'out/diag/coverage/qb-roles.jsonl';
const P: any = PlaySim.prototype, tick0 = P.tick, res0 = P.buildResult, d0 = P.decideFor;
const hd = (v: any) => Math.atan2(v.y, v.x), ad = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * 180 / Math.PI;
const sp = (v: any) => Math.hypot(v.x, v.y);
P.tick = function () {
  tick0.call(this);
  if (compilingPlan()) return;
  const H = (this.__h ??= []);
  const lab = new Map<any, string>();
  for (const d of this.defense) lab.set(d, (d as any).__lab ?? (d.behavior?.kind ?? '?'));
  H.push({ t: this.t, air: this.ball?.kind === 'air', pos: this.agents.map((a: any) => ({ x: a.pos.x, y: a.pos.y })), vel: this.agents.map((a: any) => ({ x: a.vel.x, y: a.vel.y })) });
  if (this.__rel === undefined && this.ball?.kind === 'air' && this.ball.target) {
    this.__rel = { t: this.t, R: this.ball.target, labs: new Map([...this.defense].map((d: any) => [d, `${d.behavior?.kind ?? '?'}${(d.behavior as any)?.zone ? ':' + (d.behavior as any).zone : ''}|${(d as any).__lab ?? ''}`])) };
  }
  if (this.__rel && this.__arr === undefined && this.ball?.kind !== 'air') this.__arr = this.t;
  this.__brk ??= new Map();
  if (this.__rel !== undefined || this.ball?.kind === 'held') for (const d of this.defense) {
    const fb = flightBreakOf(d); if (!fb) continue;
    const k = `${d.idx}:${fb.since}`; if (this.__brk.has(k)) continue;
    const rb = lastReleaseBelief(this, d);
    this.__brk.set(k, { d, via: fb.via, since: fb.since, src: rb?.source ?? null, pos: { x: d.pos.x, y: d.pos.y } });
  }
};
// The technique label each zone / man behaviour returned this tick.
const beh = await import('../../../src/sim/behaviors/defense.js');
for (const C of [beh.ZoneCoverage, beh.ManCoverage]) { const up = C.prototype.update; C.prototype.update = function (a: any, sim: any) { const c = up.call(this, a, sim); a.__lab = facingTechnique(c)?.label ?? ''; return c; }; }
P.buildResult = function () {
  const r = res0.call(this);
  if (compilingPlan() || this.__done || !this.__rel) return r;
  this.__done = true;
  const H = this.__h, rel = this.__rel, R = rel.R, ri = this.agents.indexOf(R), tArr = this.__arr ?? this.t;
  const at = (t: number) => H.reduce((b: any, q: any) => (Math.abs(q.t - t) < Math.abs(b.t - t) ? q : b), H[0]);
  const fRel = at(rel.t), fArr = at(tArr), catchPt = fArr.pos[ri];
  let C: any = null, best = Infinity;
  for (const d of this.defense) { const p = fRel.pos[this.agents.indexOf(d)], q = fRel.pos[ri]; const s = Math.hypot(p.x - q.x, p.y - q.y); if (s < best) { best = s; C = d; } }
  const ci = this.agents.indexOf(C);
  // The receiver's last break before the arrival.
  let tB: number | null = null, post: any = null;
  for (let i = H.length - 1; i >= 0; i--) {
    const q = H[i]; if (q.t > rel.t + 0.2 || q.t < 0.3) continue;
    const j = H.findIndex((z: any) => z.t >= q.t + 0.4 - 1e-6); if (j < 0) continue;
    const v0 = q.vel[ri], v1 = H[j].vel[ri];
    if (sp(v0) > 2 && sp(v1) > 2 && ad(hd(v0), hd(v1)) > 30) { tB = q.t; post = v1; break; }
    if (sp(v0) > 4 && sp(v1) < 2) { tB = q.t; post = { x: 0, y: 0 }; break; } // a stop (hitch, curl, comeback)
  }
  const dir = this.attackDir(this.offense[0].team), out = (y: number) => Math.sign(y - this.ballY) || 1;
  const rel2 = (f: any) => { const p = f.pos[ci], q = f.pos[ri]; return { cushion: +((p.x - q.x) * dir).toFixed(2), lev: +((p.y - q.y) * out(q.y)).toFixed(2), sep: +Math.hypot(p.x - q.x, p.y - q.y).toFixed(2) }; };
  // His response to the break: for a turn, already on the new line (within 45 deg at the break: 'already'), else the time
  // until he is; for a stop, the time until his speed along his own pre-break line has halved. Null: not within 1.5 s.
  let lag: number | null = null, already = false, kind: string | null = null;
  if (tB !== null) {
    const fB = at(tB), vB = fB.vel[ci], stop = sp(post) < 1e-6; kind = stop ? 'stop' : 'turn';
    if (!stop && sp(vB) > 1.5 && ad(hd(vB), hd(post)) < 45) { already = true; lag = 0; }
    else for (const q of H) { if (q.t <= tB) continue; if (q.t - tB > 1.5) break; const v = q.vel[ci];
      const ok = stop ? (sp(vB) < 1 || (v.x * vB.x + v.y * vB.y) / sp(vB) < 0.5 * sp(vB)) : (sp(v) > 1.5 && ad(hd(v), hd(post)) < 45);
      if (ok) { lag = +(q.t - tB).toFixed(2); break; } }
  }
  const drivers = [...(this.__brk?.values() ?? [])].filter((b: any) => b.d !== C && b.since >= rel.t - 0.6 && b.since <= tArr).map((b: any) => {
    const di = this.agents.indexOf(b.d), pa = fArr.pos[di];
    return { slot: b.d.slot, lab: rel.labs.get(b.d), via: b.via, src: b.src, start: +(b.since - rel.t).toFixed(2),
      d0: +Math.hypot(b.pos.x - catchPt.x, b.pos.y - catchPt.y).toFixed(2), dArr: +Math.hypot(pa.x - catchPt.x, pa.y - catchPt.y).toFixed(2) };
  });
  appendFileSync(outPath, JSON.stringify({ seed, cov: this.defCall?.coverage?.id, style: this.defCall?.zoneStyle ?? null, target: R.slot, rel: +rel.t.toFixed(2), flight: +(tArr - rel.t).toFixed(2),
    outcome: r.outcome, yards: r.yards, coverer: { slot: C.slot, lab: rel.labs.get(C) }, brk: tB === null ? null : +(tB - rel.t).toFixed(2),
    atBreak: tB === null ? null : rel2(at(tB)), brkKind: kind, lag, already, atRel: rel2(fRel), atArr: rel2(fArr), drivers }) + '\n');
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let i = 0; i < games; i++) simulateGame(home, away, { seed: seed + i });
console.log('done', seed);
