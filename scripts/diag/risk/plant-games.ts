// SHOULDER_READ (the underneath plant) in games: same games and seeds per arm; run once with SHOULDER_READ=0 and =1.
// Reads (sim only; engine instrumentation):
//  - break timing on zone completions 0-10 yd (under-break.ts's population and definition);
//  - plants per dropback and pumps: underneath defenders planted on a motion that was pulled down (wrong plants) and
//    the depth each gave up by 1.0 s after the pump vs his depth at the windup;
//  - throws to digs and seams (the routes behind the hook) against zone: completion, yd/att, catch depth;
//  - all zone throws caught 0-10 yd: yd/att and YAC;
//  - commitment: per underneath defender from the windup to 0.6 s after the release, plant restarts, turns (heading
//    change > 90 deg over 0.3 s at >= 1 yd/s) and depth-direction flips (stop-and-go).
// usage: SHOULDER_READ=0|1 npx tsx scripts/diag/risk/plant-games.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, tick0 = P.tick, ev0 = P.event;
const under = (sim: any) => sim.defense.filter((d: any) => d.behavior?.kind === 'zone' && !d.behavior?.deep);
const S = { dropbacks: 0, plantsPer: [] as number[], pumps: 0, wrongPlants: 0, wrongDepth: [] as number[], restarts: 0, plantsAll: 0,
  reversals: [] as number[], flips: [] as number[], brk: [] as any[], behind: [] as any[], short: [] as any[] };
P.event = function (type: string, a: any, b: any, note?: string) {
  const dir = this.offense?.length ? this.attackDir(this.offense[0].team) : 1;
  if (type === 'pump' && this.__pl) {
    this.__pl.pumps.push({ t: this.t, w: this.__pl.lastWindup });
  }
  if (type === 'throw' && b && this.__pl && !this.__pl.throwT) {
    const qb = this.qb;
    this.__pl.throwT = this.t; this.__pl.R = b; this.__pl.route = b.behavior?.route?.id ?? b.behavior?.fallback?.route?.id ?? '?';
    this.__pl.U = under(this).filter((d: any) => (d.pos.x - this.los) * dir >= 1 && (d.pos.x - this.los) * dir <= 12 && Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) > 3)
      .map((d: any) => ({ d, path: [] as any[] }));
  }
  return ev0.call(this, type, a, b, note);
};
P.tick = function () {
  if (!this.__pl) this.__pl = { pumps: [], lastWindup: -1, planted: new Map(), track: new Map(), done: false };
  const L = this.__pl;
  if (this.windupAt >= 0 && this.windupAt !== L.lastWindup) {
    L.lastWindup = this.windupAt;
    if (!L.firstWindup) { L.firstWindup = this.t; S.dropbacks++; }
    for (const d of under(this)) if (!L.track.has(d)) L.track.set(d, { x0: d.pos.x, samples: [] as any[] });
  }
  const r = tick0.call(this);
  if (L.done) return r;
  const dir = this.offense?.length ? this.attackDir(this.offense[0].team) : 1;
  for (const d of under(this)) {
    if (d.tags.has('plant') && !L.planted.has(d)) L.planted.set(d, { t: this.t, w: this.windupAt, depth: (d.pos.x - this.los) * dir });
    if (d.tags.has('plant-restart') && !L.planted.get(d)?.restart) { const p = L.planted.get(d); if (p) p.restart = this.t; }
  }
  for (const [d, tr] of L.track) if (Math.round(this.t / this.dt) % Math.round(0.1 / this.dt) === 0) tr.samples.push({ t: this.t, vx: d.vel.x, vy: d.vel.y, x: d.pos.x });
  for (const u of L.U ?? []) u.path.push({ t: this.t, x: u.d.pos.x, y: u.d.pos.y, vx: u.d.vel.x, vy: u.d.vel.y });
  if (L.R && L.catchX === undefined && this.ball.kind === 'held' && this.ball.carrier === L.R) L.catchX = L.R.pos.x;
  if (this.phase !== 'live' && L.firstWindup) {
    L.done = true;
    S.plantsPer.push(L.planted.size); S.plantsAll += L.planted.size;
    for (const [, p] of L.planted) if (p.restart) S.restarts++;
    // Pumps: defenders planted on the pulled-down motion; depth given up by 1.0 s after the pump vs at the windup.
    for (const pu of L.pumps) {
      S.pumps++;
      for (const [d, p] of L.planted) if (p.w === pu.w) {
        S.wrongPlants++;
        const tr = L.track.get(d), s = tr?.samples.find((q: any) => q.t >= pu.t + 1.0);
        if (s) S.wrongDepth.push(((s.x - tr.x0) * dir));
      }
    }
    // Reversals per underneath defender, windup to release + 0.6 s.
    const end = (L.throwT ?? this.t) + 0.6;
    for (const [, tr] of L.track) {
      const sm = tr.samples.filter((q: any) => q.t >= L.firstWindup && q.t <= end);
      // Turns: heading change > 90 deg between samples 0.3 s apart, both at >= 1 yd/s. Flips: his depth velocity
      // changing sign (beyond 0.5 yd/s each way) between consecutive 0.1 s samples (stop-and-go).
      let turns = 0, flips = 0, last = 0;
      for (let i = 3; i < sm.length; i += 3) { const a = sm[i - 3], b = sm[i], sa = Math.hypot(a.vx, a.vy), sb = Math.hypot(b.vx, b.vy);
        if (sa >= 1 && sb >= 1 && (a.vx * b.vx + a.vy * b.vy) / (sa * sb) < 0) turns++; }
      for (const q of sm) { const v = q.vx * dir, sg = v > 0.5 ? 1 : v < -0.5 ? -1 : 0; if (sg && last && sg !== last) flips++; if (sg) last = sg; }
      S.reversals.push(turns); S.flips.push(flips);
    }
    if (L.R && !this.defCall?.coverage?.man) {
      const caught = L.catchX !== undefined, depth = caught ? (L.catchX - this.los) * dir : null;
      const yds = caught ? (L.R.pos.x - this.los) * dir : 0, yac = caught ? (L.R.pos.x - L.catchX) * dir : null;
      if (['dig', 'seam', 'in'].includes(L.route)) S.behind.push({ route: L.route, caught, yds, depth });
      if (caught && depth! >= 0 && depth! <= 10) {
        S.short.push({ yds, yac });
        if (L.U?.length) {
          const cx = L.catchX, cy = L.R.pos.y;
          const u = L.U.reduce((b: any, x: any) => Math.hypot(x.path[0].x - cx, x.path[0].y - cy) < Math.hypot(b.path[0].x - cx, b.path[0].y - cy) ? x : b);
          const brk = u.path.find((s: any) => { const Lh = Math.hypot(cx - s.x, cy - s.y) || 1, sp = Math.hypot(s.vx, s.vy);
            return sp >= 1.5 && (s.vx * (cx - s.x) + s.vy * (cy - s.y)) / (Lh * sp) >= Math.cos(Math.PI / 4); });
          S.brk.push({ role: Math.abs(u.path[0].y - this.ballY) < 6 ? 'hook' : 'curl/flat', brk: brk ? brk.t - L.throwT : null });
        }
      }
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: (number | null)[], f = .5) => { const x = v.filter((n): n is number => n !== null && n === n).sort((a, b) => a - b); return x.length ? x[Math.floor(f * (x.length - 1))].toFixed(2) : '-'; };
const pct = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
const mean = (v: number[]) => v.length ? (v.reduce((s, x) => s + x, 0) / v.length).toFixed(2) : '-';
console.log(`seed ${seed}, ${games} games, SHOULDER_READ=${process.env.SHOULDER_READ ?? '0'}: dropbacks with a windup ${S.dropbacks}`);
for (const role of ['hook', 'curl/flat']) { const v = S.brk.filter(r => r.role === role);
  console.log(`  break, ${role}: n ${v.length} | at/before the release ${pct(v.filter(r => r.brk !== null && r.brk <= 0.05).length, v.length)} | p50 ${q(v.map(r => r.brk))} s`); }
console.log(`  plants: ${S.plantsAll} (${mean(S.plantsPer)} per dropback); restarted after a pulled-down motion ${S.restarts}`);
console.log(`  pumps ${S.pumps} | wrong plants ${S.wrongPlants} (${(S.wrongPlants / Math.max(1, S.pumps)).toFixed(2)} per pump) | their depth change windup -> pump + 1.0 s p25/p50/p75 ${q(S.wrongDepth, .25)}/${q(S.wrongDepth)}/${q(S.wrongDepth, .75)} yd`);
for (const rt of ['dig', 'seam', 'in']) { const v = S.behind.filter(r => r.route === rt);
  console.log(`  zone throws to ${rt.padEnd(4)}: n ${v.length} | complete ${pct(v.filter(r => r.caught).length, v.length)} | yd/att ${mean(v.map(r => r.yds))} | catch depth p50 ${q(v.map(r => r.depth))}`); }
console.log(`  zone catches 0-10 yd: n ${S.short.length} | yd/catch ${mean(S.short.map(r => r.yds))} | YAC ${mean(S.short.map(r => r.yac!))}`);
const rv = S.reversals, fv = S.flips; console.log(`  per underneath defender, windup to release + 0.6 s (n ${rv.length}): turns > 90 deg over 0.3 s mean ${mean(rv)}, any ${pct(rv.filter(n => n > 0).length, rv.length)} | depth-direction flips mean ${mean(fv)}, any ${pct(fv.filter(n => n > 0).length, fv.length)}, 2+ ${pct(fv.filter(n => n > 1).length, fv.length)}`);
