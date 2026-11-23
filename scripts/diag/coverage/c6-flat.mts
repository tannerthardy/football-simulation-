// FLAT-THROW VARIANT (c6-flat.mts): every Cover 6 family dropback whose throw goes to a flat / short-outside receiver
// (under 5 yd past the line at the release, within 15 yd of the sideline, not #1). Usage:
//   node --import tsx scripts/diag/coverage/c6-flat.mts <seed> <first> <games> <out.jsonl>   (Tools' game set)
// Trace one play every 0.1 s (read-only taps): every defender's depth/width, speed, facing, behavior, job and technique
// label, man target; every eligible's depth/width/velocity; the QB; the ball. The play is found by concept, coverage
// and down in one game.
//   node --import tsx scripts/diag/coverage/play-trace.mts <teamSeed> <gameSeed> <leagueSample 0|1> <concept> <coverage> <down> <out.json>
// Census games: teamSeed 11, gameSeed 11+g, leagueSample 1. Film-room games: teamSeed 101, gameSeed 101+g, leagueSample 0.
import { appendFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ZoneCoverage, ManCoverage } from '../../../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../../../src/sim/coverage/defender.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
import { FIELD_WIDTH } from '../../../src/core/field.js';

const [seedS, firstS, gamesS, out] = process.argv.slice(2);
const Z: any = ZoneCoverage.prototype, M: any = ManCoverage.prototype, P: any = PlaySim.prototype;
const zu = Z.update, mu = M.update, tick0 = P.tick, res0 = P.buildResult;
P.buildResult = function () { const r = res0.call(this); if (this.__pt?.tgt && !this.__pt.wrote) { this.__pt.wrote = true; appendFileSync(out, JSON.stringify({ ...this.__pt.meta, tgt: this.__pt.tgt, yards: r.yards, outcome: r.outcome, rows: this.__pt.rows }) + '\n'); } return r; };
const label = new WeakMap<any, string>();
Z.update = function (a: any, sim: any) { const c = zu.call(this, a, sim); try { label.set(a, facingTechnique(c)?.label ?? 'other'); } catch { /* */ } return c; };
M.update = function (a: any, sim: any) { const c = mu.call(this, a, sim); try { label.set(a, facingTechnique(c)?.label ?? 'other'); } catch { /* */ } return c; };
const r2 = (v: number) => Math.round(v * 100) / 100;
P.tick = function () {
  if (this.__pt === undefined) {
    this.__pt = this.offCall?.kind === 'pass' && !this.offCall.pass?.screen && this.defCall?.coverage?.family === 'cover6'
      ? { rows: [], meta: { seed: Number(seedS), cov: this.defCall.coverage.id, label: this.defCall.label, concept: this.offCall.pass.id, numbering: { ...this.offAlign.numbering } } } : null;
  }
  const res = tick0.call(this);
  const st = this.__pt;
  if (!st || st.done) return res;
  const k = Math.round(this.t * 10);
  if (st.rows.length && st.rows.at(-1).k === k) return res;
  const dir = this.attackDir('O');
  const P2 = (a: any) => ({ x: r2((a.pos.x - this.los) * dir), y: r2(a.pos.y), w: r2(Math.min(a.pos.y, FIELD_WIDTH - a.pos.y)), vx: r2(a.vel.x * dir), vy: r2(a.vel.y), f: r2(Math.cos(a.body.facing - (dir > 0 ? 0 : Math.PI))) });
  st.rows.push({ k, ball: this.ball.kind, phase: this.phase,
    D: this.defense.map((d: any) => { const b: any = d.behavior; const sub = b instanceof CoverageDefender ? (b as any).sub : b;
      return { s: d.slot, ...P2(d), kind: b?.kind, job: b instanceof CoverageDefender ? b.job : undefined, mode: (b as any)?.state?.mode, tech: label.get(d), tgt: sub?.target?.slot, hips: sub?.hipsOpen, read: d.recog?.read }; }),
    O: this.offense.filter((o: any) => !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot)).map((o: any) => ({ s: o.slot, ...P2(o), kind: o.behavior?.kind, route: o.behavior?.route?.id })) });
  if (st.tgt === undefined && this.ball.kind === 'air') {
    const T = this.ball.target, nr: Record<string, string> = {};
    for (const [ref, slot] of Object.entries(this.offAlign.numbering ?? {})) if (slot) nr[slot as string] = ref;
    const depth = T ? (T.pos.x - this.los) * dir : 99, w = T ? Math.min(T.pos.y, FIELD_WIDTH - T.pos.y) : 99;
    st.tgt = T && depth < 5 && w < 15 && !(nr[T.slot] ?? '').endsWith('1') ? { slot: T.slot, ref: nr[T.slot] ?? '?', depth: r2(depth), w: r2(w), k } : null;
  }
  if (this.phase !== 'live' || k > 60) {
    st.done = true;
  }
  return res;
};
const rng = new Rng(Number(seedS));
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let i = 0; i < Number(gamesS); i++) { simulateGame(home, away, { seed: Number(seedS) + Number(firstS) + i }); console.error('game', i, 'done'); }
