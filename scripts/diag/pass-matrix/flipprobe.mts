/** Sim side of nflflip.py: time from side-on (70-110 deg off downfield) to running (under 30) for deep defenders over a
 * receiver at 1.0 s, snap to release + 0.5 s; flips over 1.5 s not counted. Also the requested facing during the flip. */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 8), seed0 = Number(process.argv[3] ?? 101);
const St = new WeakMap<object, any>(); const R: Record<string, any[]> = { man: [], zone: [] };
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this; tick0.call(this);
  if (sim.offCall?.kind === 'run') return;
  let s = St.get(sim); if (!s) { s = { pairs: null, tRel: null }; St.set(sim, s); }
  if (s.tRel === null && sim.ball?.kind === 'air') s.tRel = sim.t;
  if (s.tRel !== null && sim.t > s.tRel + 0.5) return;
  if (!s.pairs && sim.t >= 1.0 - 1e-9) {
    const recs = sim.offense.filter((o: any) => o !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
    s.pairs = sim.defense.filter((d: any) => /^(CB|FS|SS)/.test(d.slot) && recs.some((r: any) => Math.hypot(r.pos.x - d.pos.x, r.pos.y - d.pos.y) < 8 && d.pos.x - r.pos.x > 2))
      .map((d: any) => ({ d, last: null, done: false, hist: [] }));
  }
  if (!s.pairs) return;
  for (const pr of s.pairs) {
    if (pr.done) continue;
    const off = Math.abs(Math.atan2(Math.sin(pr.d.body.facing), Math.cos(pr.d.body.facing))) * 180 / Math.PI;
    if (off >= 70 && off <= 110) pr.last = { t: sim.t, spd: Math.hypot(pr.d.vel.x, pr.d.vel.y) };
    else if (off < 30 && pr.last) { pr.done = true; const dt = sim.t - pr.last.t; if (dt <= 1.5) R[sim.defCall.coverage.man ? 'man' : 'zone'].push([dt, pr.last.spd]); }
  }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const q = (v: number[], f = .5) => { const a = [...v].sort((x, y) => x - y); return a.length ? a[Math.floor(f * (a.length - 1))] : NaN; };
for (const k of ['man', 'zone']) { const T = R[k].map(v => v[0]); console.log(`sim ${k} (CUSHION_BREAK ${process.env.CUSHION_BREAK}): flips n ${T.length}: time p25/50/75 ${q(T, .25).toFixed(2)}/${q(T).toFixed(2)}/${q(T, .75).toFixed(2)} s, speed at side-on p50 ${q(R[k].map(v => v[1])).toFixed(1)} yd/s`); }
