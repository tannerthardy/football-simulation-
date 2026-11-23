// Cover 2 / Cover 6 wide-open receivers at 10-15 yd (Tools' open census operator, NFL p90 thresholds: fixed 1.5/2.0/2.5/3.0 s
// with the ball held 5.1 yd, release 5.2 yd), with every coverage seat on the receiver's side: where he is (depth past the
// line, width from the sideline) against his landmark, and what he is doing (CoverageDefender job + rule mode,
// ZoneCoverage technique label, ManCoverage target). Read-only taps; Tools' game set (simulateGame(home, away, {seed}),
// teams from new Rng(seed)).
//   node --import tsx scripts/diag/coverage/c26-window.mts <seed> <first> <games> [out.jsonl]
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ZoneCoverage } from '../../../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../../../src/sim/coverage/defender.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
import { zoneLandmark } from '../../../src/playbook/alignment.js';
import { FIELD_WIDTH } from '../../../src/core/field.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';

const seed = Number(process.argv[2] ?? 101), first = Number(process.argv[3] ?? 0), games = Number(process.argv[4] ?? 1);
const out = process.argv[5] ?? 'out/diag/coverage/c26-window.jsonl';
mkdirSync(dirname(out), { recursive: true });
const FAM = new Set(['cover2', 'tampa2', 'cover6']);
const THR = { fix: 5.1, rel: 5.2 };
const Z: any = ZoneCoverage.prototype, P: any = PlaySim.prototype;
const up0 = Z.update, tick0 = P.tick;
const label = new WeakMap<any, string>();
Z.update = function (a: any, sim: any) { const c = up0.call(this, a, sim); try { label.set(a, facingTechnique(c)?.label ?? 'other'); } catch { /* */ } return c; };
const r1 = (v: number) => Math.round(v * 10) / 10;
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT', 'QB']);

function seatOf(sim: any, d: any, dir: number) {
  const b: any = d.behavior;
  const o: any = { s: d.slot, pos: d.player.position, kind: b?.kind ?? null, x: r1((d.pos.x - sim.los) * dir), w: r1(Math.min(d.pos.y, FIELD_WIDTH - d.pos.y)), y: d.pos.y };
  let zone: string | undefined;
  if (b instanceof CoverageDefender) { zone = b.zone; o.rule = b.rule; o.job = b.job; o.mode = (b as any).state?.mode ?? ''; o.tech = label.get(d) ?? ''; }
  else if (b?.kind === 'zone') { zone = b.zone; o.tech = label.get(d) ?? ''; o.tgt = b.target?.slot ?? null; }
  else if (b?.kind === 'man') { o.job = `man:${b.target?.slot}`; }
  if (zone) {
    o.zone = zone;
    try { const lm = zoneLandmark(zone as any, sim.offAlign); o.lmDepth = r1((lm.x - sim.los) * dir); o.lmW = r1(Math.min(lm.y, FIELD_WIDTH - lm.y)); o.lmY = lm.y; } catch { /* */ }
  }
  return o;
}

P.tick = function () {
  if (this.__c26 === undefined) {
    const cov = this.defCall?.coverage;
    this.__c26 = !compilingPlan() && this.offCall?.kind === 'pass' && !this.offCall.pass?.screen && cov && FAM.has(cov.family) ? { k: new Set<string>() } : null;
  }
  const res = tick0.call(this);
  const st = this.__c26;
  if (!st) return res;
  const k = Math.round(this.t * 10);
  const air = this.ball?.kind === 'air';
  let kind: 'fix' | 'rel' | null = null;
  if (air && !st.k.has('rel')) kind = 'rel';
  else if (!air && [15, 20, 25, 30].includes(k) && !st.k.has(String(k))) kind = 'fix';
  if (!kind || st.done) return res;
  st.k.add(kind === 'rel' ? 'rel' : String(k));
  if (kind === 'rel') st.done = true;
  const dir = this.attackDir('O');
  const refOf: Record<string, string> = {};
  for (const [ref, slot] of Object.entries(this.offAlign.numbering ?? {})) if (slot) refOf[slot as string] = ref;
  let seats: any[] | null = null;
  for (const R of this.offense) {
    if (OL.has(R.slot) || R.behavior?.kind !== 'route') continue;
    const depth = (R.pos.x - this.los) * dir;
    if (depth < 10 || depth >= 15) continue;
    const ds = this.defense.map((d: any) => [d, Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y)] as const).sort((a: any, b: any) => a[1] - b[1]);
    const d1 = ds[0][1];
    seats ??= this.defense.map((d: any) => seatOf(this, d, dir));
    const wide = d1 > THR[kind];
    const side = Math.sign(R.pos.y - this.ballY) || 1;
    appendFileSync(out, JSON.stringify({ seed, t: r1(this.t), kind, wide, cov: this.defCall.coverage.id, fam: this.defCall.coverage.family,
      concept: this.offCall.pass?.id, form: this.offCall.formation?.id, slot: R.slot, pos: R.player.position, ref: refOf[R.slot] ?? '?',
      route: R.behavior?.route?.id ?? R.behavior?.route?.name ?? null, depth: r1(depth), w: r1(Math.min(R.pos.y, FIELD_WIDTH - R.pos.y)), y: R.pos.y, ballY: this.ballY, side,
      vx: r1(R.vel.x * dir), vy: r1(R.vel.y * side), d1: r1(d1), near: ds[0][0].slot,
      seats: seats!.map((s: any) => ({ ...s, same: (Math.sign(s.y - this.ballY) || 1) === side, dx: r1(s.x - depth), dy: r1(Math.abs(s.y - R.pos.y)) })) }) + '\n');
  }
  return res;
};

const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let i = 0; i < games; i++) { simulateGame(home, away, { seed: seed + first + i }); console.error(`seed ${seed} game ${first + i} done`); }
