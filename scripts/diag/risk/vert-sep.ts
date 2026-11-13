// How tight our verticals and hitches are at the moment the QB moves off them (sim only; the twin of
// scripts/diag/pass-operators/vert_sep_nfl.py). Non-PA pass calls. Receivers on a go or seam route (GO) or a hitch
// (HITCH): at 2.85 s (GO) / 2.15 s (HITCH) after the snap, with the ball still in the QB's hands, if he is 12-15 yd
// (GO) / 4-7 yd (HITCH) past the line, the true distance to his nearest defender; by shell and man/zone.
// usage: [SAFETY_DEPTH=1] npx tsx scripts/diag/risk/vert-sep.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, tick0 = P.tick;
const WIN: Record<string, [number, number, number]> = { GO: [2.85, 12, 15], HITCH: [2.15, 4, 7] };
const kind = (id: string) => (id === 'go' || id === 'seam' ? 'GO' : id === 'hitch' ? 'HITCH' : null);
const shell = (id: string) => { const t = id.replace(/[^a-z0-9]/g, ''); for (const [a, b] of [['2man', 'cover2-man'], ['cover0', 'cover0'], ['cover1', 'cover1'], ['cover2', 'cover2'], ['tampa', 'cover2'], ['cover3', 'cover3'], ['cover4', 'cover4'], ['quarters', 'cover4'], ['cover6', 'cover6']]) if (t.includes(a)) return b; return 'other'; };
const out = new Map<string, number[]>();
P.tick = function () {
  const r = tick0.call(this);
  if (this.offCall?.kind === 'pass' && !String(this.offCall?.pass?.id ?? '').startsWith('pa_') && this.ball.kind === 'held' && this.ball.carrier === this.qb) {
    (this.__vs ??= new Set<string>());
    const dir = this.attackDir(this.offense[0].team);
    for (const o of this.offense) {
      const id = o.behavior?.route?.id ?? o.behavior?.fallback?.route?.id; const k = id ? kind(id) : null;
      if (!k || this.__vs.has(`${o.slot}`)) continue;
      const [t0, lo, hi] = WIN[k];
      if (this.t < t0 - 1e-9) continue;
      this.__vs.add(`${o.slot}`);
      const depth = (o.pos.x - this.los) * dir;
      if (depth < lo || depth > hi) continue;
      const d = Math.min(...this.defense.map((x: any) => Math.hypot(x.pos.x - o.pos.x, x.pos.y - o.pos.y)));
      if (d > 25) continue; // not a scrimmage play (no defense near): the non-game sims some systems run
      const key = `${k}|${shell(String(this.defCall?.coverage?.id ?? ''))}|${this.defCall?.coverage?.man ? 'Man' : 'Zone'}`;
      out.set(key, [...(out.get(key) ?? []), d]);
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { if (v.length < 5) return '-'; const x = [...v].sort((a, b) => a - b); return [.25, .5, .75].map(f => x[Math.floor(f * (x.length - 1))].toFixed(1)).join('/'); };
console.log(`== sim seed ${seed}, ${games} games, SAFETY_DEPTH=${process.env.SAFETY_DEPTH ?? '0'}: nearest defender to a GO / HITCH runner at the sample time, in the depth window (p25/p50/p75 yd)`);
for (const k of ['GO', 'HITCH']) {
  const all = [...out].filter(([key]) => key.startsWith(k + '|')).flatMap(([, v]) => v);
  console.log(`   ${k.padEnd(5)} all n ${all.length} | ${q(all)} | within 1.5 yd ${(100 * all.filter(d => d < 1.5).length / Math.max(1, all.length)).toFixed(0)}%`);
  for (const mz of ['Man', 'Zone']) { const v = [...out].filter(([key]) => key.startsWith(k + '|') && key.endsWith('|' + mz)).flatMap(([, v]) => v); console.log(`     ${mz.padEnd(5)} n ${v.length} | ${q(v)}`); }
  for (const s of ['cover0', 'cover1', 'cover2-man', 'cover2', 'cover3', 'cover4', 'cover6', 'other']) { const v = [...out].filter(([key]) => key.startsWith(`${k}|${s}|`)).flatMap(([, v]) => v); if (v.length >= 10) console.log(`       ${s.padEnd(10)} n ${v.length} | ${q(v)}`); }
}
