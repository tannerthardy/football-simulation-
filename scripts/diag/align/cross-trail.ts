// Man trail on crossing routes, sim side of nfl_cross_trail.py: man calls, a WR or TE on a crossing route (cross /
// shallow / shallow_high / mesh_under / over), his man = the defender whose man technique targets him. The break: his
// heading turns 45+ deg off his stem (stem: heading once over 3 yd/s, 0.4 s after the snap). At the break and +0.3 /
// +0.6 s: separation, how far the man is behind him along his running line (+ behind) and across it; his speed 0.3 s
// before and after the break; by the receiver's position and the defender's seat.
// usage: [CROSS_OVER=1] npx tsx cross-trail.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { routeOfAgent } from '../../../src/sim/behaviors/receiver.js';
const seed = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 16);
const CROSS = /:(cross|shallow|shallow_high|mesh_under|over)$/;
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
const ang = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) * 180 / Math.PI;
const tgtOf = (d: any) => { const b = d.behavior; return b?.target ?? b?.sub?.target ?? b?.movement?.target ?? null; };
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || !this.defCall?.coverage?.man || this.t < 0.05) return r;
  this.__ct ??= new Map();
  if (this.ball.kind !== 'held' || this.ball.carrier !== this.qb) return r;
  for (const o of this.offense) {
    if (!CROSS.test(String(routeOfAgent.get(o) ?? '')) || !['WR', 'TE'].includes(o.player?.position)) continue;
    let S = this.__ct.get(o);
    if (!S) { S = { stem: null, brk: -1, man: null, log: [] as any[] }; this.__ct.set(o, S); }
    const sp = Math.hypot(o.vel.x, o.vel.y), h = Math.atan2(o.vel.y, o.vel.x);
    S.man ??= this.defense.find((d: any) => tgtOf(d) === o) ?? null;
    S.log.push({ t: this.t, sp, h, x: o.pos.x, y: o.pos.y, mx: S.man?.pos.x, my: S.man?.pos.y });
    if (S.stem === null && sp > 3 && this.t > 0.4) S.stem = h;
    else if (S.stem !== null && S.brk < 0 && sp > 2 && ang(h, S.stem) > 45) S.brk = this.t;
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), M = this.__ct; this.__ct = undefined;
  if (M) for (const [o, S] of M) {
    if (S.brk < 0 || !S.man) continue;
    const at = (t: number) => S.log.find((x: any) => x.t >= t - 1e-6);
    const geo = (t: number) => { const a = at(t); if (!a || a.mx === undefined) return null; const dx = a.mx - a.x, dy = a.my - a.y, ux = Math.cos(a.h), uy = Math.sin(a.h); return [Math.hypot(dx, dy), -(dx * ux + dy * uy), Math.abs(-dx * uy + dy * ux)]; };
    const g = [geo(S.brk), geo(S.brk + 0.3), geo(S.brk + 0.6)];
    if (!g[0]) continue;
    rows.push({ rpos: o.player.position, dslot: S.man.slot, g, vin: at(S.brk - 0.3)?.sp, vout: at(S.brk + 0.3)?.sp });
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: any[]) => { v = v.filter((x) => x !== undefined && x !== null && Number.isFinite(x)).sort((a, b) => a - b); return v.length < 5 ? '-' : v[v.length >> 1].toFixed(2); };
const line = (R: any[], tag: string) => {
  const out = [`${tag}: n ${R.length}`];
  ['break', '+0.3', '+0.6'].forEach((t, i) => { const G = R.map(r => r.g[i]).filter(Boolean); out.push(`${t} sep ${q(G.map((x: any) => x[0]))} behind ${q(G.map((x: any) => x[1]))} across ${q(G.map((x: any) => x[2]))}`); });
  out.push(`v_in ${q(R.map(r => r.vin))} v_out ${q(R.map(r => r.vout))}`);
  console.log(out.join(' | '));
};
line(rows, `sim man, crossing (WR+TE) CROSS_OVER=${process.env.CROSS_OVER ?? 0}`);
for (const rp of ['WR', 'TE']) line(rows.filter(r => r.rpos === rp), `  receiver ${rp}`);
const seats = [...new Set(rows.map(r => r.dslot))];
for (const s of seats) { const R = rows.filter(r => r.dslot === s); if (R.length >= 8) line(R, `  defender ${s}`); }
// Matched speed: WR receivers with v_out within the NFL WR's 6.5-8 yd/s band.
line(rows.filter(r => r.rpos === 'WR' && r.vout >= 6.5 && r.vout <= 8), '  WR with v_out 6.5-8 (matched)');
