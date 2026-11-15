// usage: npm run ref -- --flag HEAD=1 --flag ZONE_EYES=0|1 -- npx tsx scripts/diag/eyes/break-speed.ts SEED GAMES
// Break out of the drop: underneath zone defenders within 8 yd of the targeted receiver at the release, on completed
// passes. Stance at the release: torso (shoulders) more than 30 deg off the passer ("open") or not ("square"), and his
// speed then. From the release: time until his velocity toward the catch spot (the catcher at the catch) first reaches
// 3 yd/s, and that velocity at +0.5 s. Medians; no move = never 3 yd/s before the catch. Diagnostic only.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, ev0 = P.event, b0 = P.buildResult;
const dif = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
const rows: any[] = [];
P.event = function (type: string, a: any, b: any, note?: string) {
  if (type === 'throw' && b && !this.__bs && !this.defCall?.coverage?.man) {
    const q = this.qb.pos;
    this.__bs = { R: b, t0: this.t, ds: this.defense.filter((d: any) => d.behavior?.kind === 'zone' && !d.behavior.deep && Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) < 8)
      .map((d: any) => { const toQB = Math.atan2(q.y - d.pos.y, q.x - d.pos.x); return { d, toQB, hips: d.body.facing, open: dif(d.shoulders, toQB) > 30, sp0: Math.hypot(d.vel.x, d.vel.y), hist: [] as any[] }; }) };
  }
  if ((type === 'catch' || type === 'secure') && this.__bs && a === this.__bs.R && !this.__bs.cp) this.__bs.cp = { x: a.pos.x, y: a.pos.y, t: this.t };
  return ev0.call(this, type, a, b, note);
};
P.tick = function () {
  const r = t0.call(this);
  if (this.__bs && !this.__bs.cp) for (const x of this.__bs.ds) x.hist.push({ t: this.t, p: { ...x.d.pos }, v: { ...x.d.vel } });
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__bs;
  if (S?.cp) for (const x of S.ds) {
    const tow = (h: any) => { const dx = S.cp.x - h.p.x, dy = S.cp.y - h.p.y, n = Math.hypot(dx, dy) || 1; return (h.v.x * dx + h.v.y * dy) / n; };
    const hit = x.hist.find((h: any) => tow(h) >= 3), at5 = x.hist.find((h: any) => h.t - S.t0 >= 0.5 - 1e-6);
    const sgn = (v: number) => Math.sign(Math.sin(v)), toC = Math.atan2(S.cp.y - x.hist[0].p.y, S.cp.x - x.hist[0].p.x);
    const openSide = sgn(x.hips - x.toQB) === sgn(toC - x.toQB);
    rows.push({ openSide, open: x.open, sp0: x.sp0, tb: hit ? hit.t - S.t0 : null, v5: at5 ? tow(at5) : null, flight: S.cp.t - S.t0 });
  }
  this.__bs = undefined; return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const med = (v: (number | null)[]) => { const w = v.filter((x): x is number => x !== null).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
for (const [nm, f] of [['open', (r: any) => r.open], ['open, catch on his open side', (r: any) => r.open && r.openSide], ['open, catch on the other side', (r: any) => r.open && !r.openSide], ['square', (r: any) => !r.open], ['all', () => true]] as const) {
  const T = rows.filter(f);
  console.log(`BS ${nm}: n ${T.length} | speed at release ${med(T.map(r => r.sp0))} | time to 3 yd/s toward the catch ${med(T.map(r => r.tb))} s (no move ${(T.filter(r => r.tb === null).length / Math.max(1, T.length)).toFixed(2)}) | toward the catch at +0.5 s ${med(T.map(r => r.v5))} | flight ${med(T.map(r => r.flight))}`);
}
