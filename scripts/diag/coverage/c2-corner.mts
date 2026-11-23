// The Cover 2 / Cover 6 hard corner against his #1 from the snap to the release (read-only taps; Tools' game set).
// For each dropback against a Cover 2 family or Cover 6 call, the flat corner on each side and his side's #1: every
// 0.1 s the corner's depth and width, his downfield speed, his facing (cos of the angle between his body and
// downfield: -1 faces the QB, i.e. pedalling; 0 side-on; +1 turned and running), his job / technique label, and #1's
// depth, width and speed.
//   node --import tsx scripts/diag/coverage/c2-corner.mts <seed> <first> <games> [out.jsonl]
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ZoneCoverage } from '../../../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../../../src/sim/coverage/defender.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
import { FIELD_WIDTH } from '../../../src/core/field.js';
import { compilingPlan } from '../../../src/playbook/read-compiler/runtime.js';

const seed = Number(process.argv[2] ?? 101), first = Number(process.argv[3] ?? 0), games = Number(process.argv[4] ?? 1);
const out = process.argv[5] ?? 'out/diag/coverage/c2-corner.jsonl';
mkdirSync(dirname(out), { recursive: true });
const FAM = new Set(['cover2', 'tampa2', 'cover6']);
const Z: any = ZoneCoverage.prototype, P: any = PlaySim.prototype, M: any = {};
const up0 = Z.update, tick0 = P.tick;
const label = new WeakMap<any, string>();
Z.update = function (a: any, sim: any) { const c = up0.call(this, a, sim); try { label.set(a, facingTechnique(c)?.label ?? 'other'); } catch { /* */ } return c; };
void M;
const r2 = (v: number) => Math.round(v * 100) / 100;

P.tick = function () {
  if (this.__c2 === undefined) {
    const cov = this.defCall?.coverage;
    this.__c2 = !compilingPlan() && this.offCall?.kind === 'pass' && !this.offCall.pass?.screen && cov && FAM.has(cov.family) ? { pairs: null as any, done: false } : null;
  }
  const res = tick0.call(this);
  const st = this.__c2;
  if (!st || st.done) return res;
  const dir = this.attackDir('O');
  if (!st.pairs) {
    st.pairs = [];
    for (const side of ['S', 'W']) {
      const oneSlot = this.offAlign.numbering[`${side}1`];
      const one = oneSlot && this.offense.find((r: any) => r.slot === oneSlot);
      if (!one) continue;
      const c = this.defense.filter((d: any) => /^flat_/.test(d.behavior?.zone ?? '') && Math.sign(d.pos.y - this.ballY) === Math.sign(one.pos.y - this.ballY))
        .sort((p: any, q: any) => Math.abs(p.pos.y - one.pos.y) - Math.abs(q.pos.y - one.pos.y))[0];
      if (!c) continue;
      st.pairs.push({ c, one, rec: { seed, cov: this.defCall.coverage.id, fam: this.defCall.coverage.family, concept: this.offCall.pass?.id, side, cs: c.slot, rule: c.behavior?.rule ?? null,
        style: c.behavior?.style ?? this.defCall.zoneStyle ?? null, route: null as any, rows: [] as any[] } });
    }
  }
  const air = this.ball?.kind === 'air';
  const k = Math.round(this.t * 10);
  for (const p of st.pairs) {
    if (p.rec.rows.length && p.rec.rows.at(-1).k === k) continue;
    const c = p.c, o = p.one, b: any = c.behavior;
    const side = Math.sign(o.pos.y - this.ballY) || 1;
    const job = b instanceof CoverageDefender ? b.job + ((b as any).state?.mode ? `[${(b as any).state.mode}]` : '') : b?.kind ?? '';
    const sub = b instanceof CoverageDefender ? (b as any).sub : b;
    const tech = sub?.kind === 'zone' ? label.get(c) ?? '' : sub?.kind === 'man' ? `man${sub.hipsOpen ? '-open' : ''}${sub.opts?.trail ? '-trail' : ''}` : sub?.kind ?? '';
    p.rec.route ??= o.behavior?.route?.id ?? null;
    p.rec.rows.push({ k, cx: r2((c.pos.x - this.los) * dir), cw: r2(Math.min(c.pos.y, FIELD_WIDTH - c.pos.y)), cin: r2((this.ballY - c.pos.y) * side),
      cv: r2(c.vel.x * dir), cs: r2(Math.hypot(c.vel.x, c.vel.y)), cf: r2(Math.cos(c.body.facing - (dir > 0 ? 0 : Math.PI))),
      ox: r2((o.pos.x - this.los) * dir), ow: r2(Math.min(o.pos.y, FIELD_WIDTH - o.pos.y)), oin: r2((this.ballY - o.pos.y) * side), ov: r2(o.vel.x * dir), os: r2(Math.hypot(o.vel.x, o.vel.y)),
      job, tech, run: !!c.recog?.read && c.recog.read === 'run' });
  }
  if (air || k >= 40 || this.phase !== 'live') {
    st.done = true;
    for (const p of st.pairs) appendFileSync(out, JSON.stringify({ ...p.rec, rel: air ? k : null }) + '\n');
  }
  return res;
};

const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let i = 0; i < games; i++) { simulateGame(home, away, { seed: seed + first + i }); console.error(`seed ${seed} game ${first + i} done`); }
