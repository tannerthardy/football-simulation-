// Zone defenders near the catch: do they see the QB's eyes on the eventual target before the release, and what do they
// request? Sim only. Completions to a receiver; zone calls; defenders (any zone behaviour) within 8 yd of the catch
// point at the catch who face the QB (within 60 deg, averaged over the 0.5 s before the release). Over -0.5..0 s:
// share of ticks his seen QB eyes (seenQbEyes) are the target; the QB's true eyes (sim.qbEyes) on the target; at the
// release, his requested and achieved closing on the catch point; his technique label.
// usage: [QB_EYES=1] npx tsx scripts/diag/risk/eyes-probe.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ZoneCoverage, seenQbEyes } from '../../../src/sim/behaviors/defense.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const Z: any = ZoneCoverage.prototype, z0 = Z.update, last = new WeakMap<any, any>();
Z.update = function (a: any, sim: any) { const c = z0.call(this, a, sim); last.set(a, { c, lab: facingTechnique(c)?.label ?? '?' }); return c; };
const P: any = PlaySim.prototype, t0 = P.tick, rows: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.defCall?.coverage?.man) return r;
  const S = this.__ep ?? (this.__ep = { hist: [] as any[], rel: null as any, done: false });
  if (S.done) return r;
  if (this.ball.kind === 'held' && !S.rel) {
    const snap: any[] = [];
    for (const d of this.defense) if (d.behavior instanceof ZoneCoverage || (d.behavior as any)?.sub instanceof ZoneCoverage) {
      const L = last.get(d); snap.push({ d, seen: seenQbEyes(d, this), req: L?.c?.vel ? { ...L.c.vel } : null, lab: L?.lab, pos: { ...d.pos }, vel: { ...d.vel }, f: d.body.facing, lean: d.tags?.has('eyes-lean') ?? false });
    }
    S.hist.push({ t: this.t, eyes: this.qbEyes, snap, qb: { ...this.qb.pos } });
    if (S.hist.length > 12) S.hist.shift();
  } else if (this.ball.kind === 'air' && !S.rel) S.rel = { t: this.t, target: this.ball.target, hist: S.hist.slice() };
  if (S.rel && this.ball.kind === 'held' && this.ball.carrier && this.offense.includes(this.ball.carrier) && this.ball.carrier !== this.qb) {
    const T = S.rel.target, R = this.ball.carrier; S.done = true;
    if (T !== R) return r;
    const cp = { ...R.pos }, H = S.rel.hist, h0 = H[H.length - 1]; if (!h0) return r;
    for (const s of h0.snap) {
      if (Math.hypot(s.d.pos.x - cp.x, s.d.pos.y - cp.y) > 8) continue;
      const toQB = Math.atan2(h0.qb.y - s.pos.y, h0.qb.x - s.pos.x);
      if (Math.cos(s.f - toQB) < Math.cos(Math.PI / 3)) continue;
      const seenT = H.filter((h: any) => h.snap.find((x: any) => x.d === s.d)?.seen === T).length / H.length;
      const trueT = H.filter((h: any) => h.eyes === T).length / H.length;
      const u = { x: cp.x - s.pos.x, y: cp.y - s.pos.y }, L = Math.hypot(u.x, u.y) || 1;
      const at = (back: number) => { const h = H[H.length - 1 - back]; const x = h?.snap.find((y: any) => y.d === s.d); if (!x || !x.req) return null;
        const uu = { x: cp.x - x.pos.x, y: cp.y - x.pos.y }, LL = Math.hypot(uu.x, uu.y) || 1, sp = Math.hypot(x.req.x, x.req.y) || 1;
        return { req: (x.req.x * uu.x + x.req.y * uu.y) / LL, ach: (x.vel.x * uu.x + x.vel.y * uu.y) / LL, rel: Math.abs(Math.atan2(Math.sin(x.f - Math.atan2(x.req.y, x.req.x)), Math.cos(x.f - Math.atan2(x.req.y, x.req.x)))) * 57.3, lean: x.lean, spd: Math.hypot(x.vel.x, x.vel.y) }; };
      const tl = [10, 6, 3, 0].map(at);
      rows.push({ tl, seenT, trueT, reqC: s.req ? (s.req.x * u.x + s.req.y * u.y) / L : NaN, achC: (s.vel.x * u.x + s.vel.y * u.y) / L, lab: s.lab, seenAny: H.filter((h: any) => h.snap.find((x: any) => x.d === s.d)?.seen).length / H.length });
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(x => Number.isFinite(x)).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
const cnt = (v: string[]) => { const m = new Map<string, number>(); for (const k of v) m.set(k, (m.get(k) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} ${n}`).join(', '); };
console.log(`== seed ${seed} QB_EYES=${process.env.QB_EYES ?? 0}: zone defenders within 8 yd of the catch facing the QB, n ${rows.length}`);
console.log(`   QB's true eyes on the target over -0.7..0 s: mean share ${(rows.reduce((t, r) => t + r.trueT, 0) / Math.max(1, rows.length)).toFixed(2)} | his seen eyes on the target ${(rows.reduce((t, r) => t + r.seenT, 0) / Math.max(1, rows.length)).toFixed(2)} | any seen eyes ${(rows.reduce((t, r) => t + r.seenAny, 0) / Math.max(1, rows.length)).toFixed(2)}`);
{ const V = rows.filter(r => r.seenT >= 0.5);
  for (const [i, back] of [[0, 1.0], [1, 0.6], [2, 0.3], [3, 0]] as const) { const W = V.map(r => r.tl[i]).filter(Boolean);
    console.log(`   seen-on-target, ${back.toFixed(1)} s before the release: requested closing ${q(W.map((w: any) => w.req))} | achieved ${q(W.map((w: any) => w.ach))} | his speed ${q(W.map((w: any) => w.spd))} | facing off the requested travel ${q(W.map((w: any) => w.rel))} deg | leaning ${(100 * W.filter((w: any) => w.lean).length / Math.max(1, W.length)).toFixed(0)}%`); } }
for (const [name, F] of [['seen eyes on target most of the window', (r: any) => r.seenT >= 0.5], ['not', (r: any) => r.seenT < 0.5]] as const) {
  const V = rows.filter(F); console.log(`   ${name}: n ${V.length} | requested closing on the catch point at the release ${q(V.map(r => r.reqC))} | achieved ${q(V.map(r => r.achC))} | label ${cnt(V.map(r => r.lab))}`);
}
