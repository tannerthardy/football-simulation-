// Why safeties come downhill in the first second (sim only; engine instrumentation). On every drop-back (pass call; PA
// split out by concept 'pa_*'), each safety (defender 9+ yd past the line at the snap): downhill = his shallowest depth
// over 0-1.0 s at least 0.3 yd (1.0 yd) shallower than at the snap. Per safety, over 0-1.0 s: whether he believed run
// (believesRun) at any tick, his behaviour kind(s), and his recognition read. Tabulated by coverage call, PA or not.
// usage: npx tsx scripts/diag/risk/safety-downhill.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { believesRun } from '../../../src/sim/behaviors/defense.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, tick0 = P.tick;
const rows: any[] = [];
P.tick = function () {
  if (!this.__sd) {
    const dir = this.attackDir(this.offense[0].team);
    const S = this.defense.filter((d: any) => (d.pos.x - this.los) * dir >= 9 && (d.pos.x - this.los) * dir <= 25).map((d: any) => ({ d, x0: (d.pos.x - this.los) * dir, min: Infinity, run: false, kinds: new Set<string>(), runAt: null as number | null, lm: null as number | null, zone: '' }));
    this.__sd = { dir, S, done: this.offCall?.kind !== 'pass' };
  }
  const r = tick0.call(this), L = this.__sd;
  if (!L.done) {
    for (const s of L.S) {
      const dep = (s.d.pos.x - this.los) * L.dir; s.min = Math.min(s.min, dep);
      s.kinds.add(s.d.behavior?.kind ?? '?');
      if (s.lm === null && s.d.behavior?.recordedLandmark) { const l = s.d.behavior.recordedLandmark(); if (l && Number.isFinite(l.x)) s.lm = (l.x - this.los) * L.dir; s.zone = String((s.d.behavior as any).zone ?? (s.d.behavior as any).band?.zone ?? (s.d.behavior as any).fallback?.zone ?? s.d.behavior?.kind); }
      if (!s.run && believesRun(this, s.d)) { s.run = true; s.runAt = this.t; }
    }
    if (this.t >= 1.0 - 1e-9 || this.phase !== 'live') {
      L.done = true;
      const call = this.defCall?.coverage?.id ?? '?', pa = String(this.offCall?.pass?.id ?? '').startsWith('pa_');
      for (const s of L.S) rows.push({ call, pa, bite: s.x0 - s.min, x0: s.x0, run: s.run, runAt: s.runAt, kinds: [...s.kinds].join('+'), lm: s.lm, zone: s.zone, slot: s.d.slot });
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const pct = (n: number, d: number) => d ? `${(100 * n / d).toFixed(0)}%` : '-';
const p50 = (v: number[]) => { const x = [...v].sort((a, b) => a - b); return x.length ? x[Math.floor((x.length - 1) / 2)].toFixed(1) : '-'; };
console.log(`seed ${seed}, ${games} games: safeties on pass calls, first second`);
for (const pa of [false, true]) {
  const v = rows.filter(r => r.pa === pa);
  const dn = v.filter(r => r.bite >= 0.3), run = v.filter(r => r.run);
  console.log(` ${pa ? 'PA' : 'non-PA'}: n ${v.length} | downhill >= 0.3 ${pct(dn.length, v.length)} (>= 1.0 ${pct(v.filter(r => r.bite >= 1).length, v.length)}) | believed run in the first second ${pct(run.length, v.length)}, p50 at ${p50(run.map(r => r.runAt))} s`);
  console.log(`   downhill when he believed run ${pct(run.filter(r => r.bite >= .3).length, run.length)} (n ${run.length}) | when he did not ${pct(v.filter(r => !r.run && r.bite >= .3).length, v.length - run.length)} (n ${v.length - run.length}) | share of the downhill who believed run ${pct(dn.filter(r => r.run).length, dn.length)}`);
  const lv = v.filter(r => r.lm !== null), sh = lv.filter(r => r.lm < r.x0 - 0.3);
  console.log(`   zone landmark shallower than his snap depth (by 0.3+): ${pct(sh.length, lv.length)} of safeties with a landmark (n ${lv.length}); downhill among them ${pct(sh.filter(r => r.bite >= .3).length, sh.length)}, among the rest ${pct(lv.filter(r => r.lm >= r.x0 - 0.3 && r.bite >= .3).length, lv.length - sh.length)}; share of the downhill with a shallower landmark ${pct(dn.filter(r => r.lm !== null && r.lm < r.x0 - 0.3).length, dn.length)} | landmark - snap depth p50 among the downhill ${p50(dn.filter(r => r.lm !== null).map(r => r.lm - r.x0))} yd`);
  const Z = new Map<string, any[]>(); for (const r of v) Z.set(r.zone || r.kinds, [...(Z.get(r.zone || r.kinds) ?? []), r]);
  console.log('   by zone: downhill / landmark shallower / snap p50 / landmark p50: ' + [...Z].sort((a, b) => b[1].length - a[1].length).map(([z, w]) => `${z} ${pct(w.filter((r: any) => r.bite >= .3).length, w.length)}/${pct(w.filter((r: any) => r.lm !== null && r.lm < r.x0 - .3).length, w.length)}/${p50(w.map((r: any) => r.x0))}/${p50(w.filter((r: any) => r.lm !== null).map((r: any) => r.lm))} (${w.length})`).join(', '));
  const K = new Map<string, any[]>(); for (const r of dn) K.set(r.kinds, [...(K.get(r.kinds) ?? []), r]);
  console.log(`   downhill by behaviour: ` + [...K].sort((a, b) => b[1].length - a[1].length).slice(0, 6).map(([k, w]) => `${k} ${w.length}`).join(', '));
  const B = new Map<string, any[]>(); for (const r of v) B.set(r.call, [...(B.get(r.call) ?? []), r]);
  console.log('   by call (n >= 10), downhill / believed run / snap depth p50: ' + [...B].filter(([, w]) => w.length >= 10).sort((a, b) => b[1].filter((r: any) => r.bite >= .3).length / b[1].length - a[1].filter((r: any) => r.bite >= .3).length / a[1].length)
    .map(([c, w]) => `${c} ${pct(w.filter((r: any) => r.bite >= .3).length, w.length)}/${pct(w.filter((r: any) => r.run).length, w.length)}/${p50(w.map((r: any) => r.x0))} (${w.length})`).join(', '));
}
