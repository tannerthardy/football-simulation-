// What holds a deep safety at his depth (sim only; engine instrumentation). On pass calls, each deep ZoneCoverage
// defender (deep zone, 9+ yd at the snap): at 0.5 / 1.0 / 1.5 s and at the throw, the technique his zone command names
// (deep-read = no vertical in his zone: he goes to his landmark, shaded toward the QB's eyes; deep-drive / carry labels
// = playing a route), his depth, his landmark's depth, depth minus landmark, his commanded and actual backward speed.
// usage: [SAFETY_DEPTH=1] npx tsx scripts/diag/risk/safety-bind.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ZoneCoverage } from '../../../src/sim/behaviors/defense.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 6);
const Z: any = ZoneCoverage.prototype, up0 = Z.update, P: any = PlaySim.prototype, ev0 = P.event;
const last = new WeakMap<any, any>();
Z.update = function (a: any, sim: any) { const c = up0.call(this, a, sim); if (this.deep) last.set(a, { label: facingTechnique(c)?.label ?? 'other', vx: c.vel.x, lm: this.landmark.x - sim.los }); return c; };
const rows: any[] = [];
const snap = (sim: any, tag: string) => {
  for (const d of sim.defense) {
    const L = last.get(d); if (!L || d.__x0 === undefined || d.__x0 < 9 || d.__x0 > 25) continue;
    rows.push({ tag, label: L.label, depth: d.pos.x - sim.los, lm: L.lm, cmd: L.vx, act: d.vel.x, call: sim.defCall?.coverage?.id });
  }
};
const tick0 = P.tick;
P.tick = function () {
  if (this.__sb === undefined) { this.__sb = { done: this.offCall?.kind !== 'pass', marks: [0.5, 1.0, 1.5] }; for (const d of this.defense) d.__x0 = d.pos.x - this.los; }
  const r = tick0.call(this), S = this.__sb;
  if (!S.done) {
    while (S.marks.length && this.t >= S.marks[0] - 1e-9) { if (this.ball.kind === 'held' && this.ball.carrier === this.qb) snap(this, `${S.marks[0].toFixed(1)} s`); S.marks.shift(); }
    if (this.phase !== 'live' || this.ball.kind === 'air') S.done = true;
  }
  return r;
};
P.event = function (type: string, a: any, b: any, n?: string) { if (type === 'throw' && b && this.__sb && !this.__sb.thrown) { this.__sb.thrown = true; snap(this, 'throw'); } return ev0.call(this, type, a, b, n); };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const p50 = (v: number[]) => { const x = [...v].sort((a, b) => a - b); return x.length ? x[Math.floor((x.length - 1) / 2)].toFixed(1) : '-'; };
console.log(`seed ${seed}, ${games} games, SAFETY_DEPTH=${process.env.SAFETY_DEPTH ?? '0'}: deep safeties`);
for (const tag of ['0.5 s', '1.0 s', '1.5 s', 'throw']) {
  const v = rows.filter(r => r.tag === tag); if (!v.length) continue;
  const L = new Map<string, any[]>(); for (const r of v) L.set(r.label, [...(L.get(r.label) ?? []), r]);
  console.log(`  ${tag}: n ${v.length} | depth ${p50(v.map(r => r.depth))} | landmark ${p50(v.map(r => r.lm))} | depth - landmark ${p50(v.map(r => r.depth - r.lm))} | at or past his landmark (>= -0.5) ${(100 * v.filter(r => r.depth - r.lm >= -0.5).length / v.length).toFixed(0)}% | backward speed commanded ${p50(v.map(r => r.cmd))}, actual ${p50(v.map(r => r.act))}`);
  console.log('     by technique: ' + [...L].sort((a, b) => b[1].length - a[1].length).map(([k, w]) => `${k} ${(100 * w.length / v.length).toFixed(0)}% (depth - landmark ${p50(w.map((r: any) => r.depth - r.lm))}, cmd ${p50(w.map((r: any) => r.cmd))})`).join(', '));
}
