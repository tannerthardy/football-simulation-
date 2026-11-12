// WINDUP_READ in games (sim only; engine instrumentation). Same games and seeds per arm.
//  - reads: underneath ZoneCoverage defenders who broke on a motion (windupReads); on thrown motions, whether his first
//    read and his read at the release were the receiver the ball went to;
//  - pumps: defenders who bit (had a read on the pulled-down motion), and how long until he restarted;
//  - commitment: target switches per read; per underneath defender windup to release + 0.6 s, turns > 90 deg over
//    0.3 s at >= 1 yd/s and depth-direction flips;
//  - zone throws caught or targeted 0-10 yd past the line: completion, INT, yd/att; zone catches 0-10 yd: YAC.
// usage: [SHOULDER_READ=1] [WINDUP_READ=1] npx tsx scripts/diag/risk/windup-games.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { windupReads } from '../../../src/sim/behaviors/defense.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, tick0 = P.tick, ev0 = P.event;
const under = (sim: any) => sim.defense.filter((d: any) => d.behavior?.kind === 'zone' && !d.behavior?.deep);
const S = { reads: 0, readFirstOnR: 0, readRelOnR: 0, readThrown: 0, switches: 0, pumps: 0, bites: 0, biteHold: [] as number[],
  turns: [] as number[], flips: [] as number[], short: [] as any[] };
P.event = function (type: string, a: any, b: any, note?: string) {
  const L = this.__w;
  if (L && type === 'pump') L.pumps.push({ t: this.t, w: L.lastW });
  if (L && type === 'throw' && b && L.R === undefined) {
    L.R = b; L.relT = this.t;
    for (const d of under(this)) { const r: any = windupReads.get(d); if (r && r.sim === this && r.windup === this.windupAt && r.first) {
      S.readThrown++; if (r.first === b) S.readFirstOnR++; if (r.target === b) S.readRelOnR++; } }
  }
  return ev0.call(this, type, a, b, note);
};
P.tick = function () {
  if (!this.__w) this.__w = { pumps: [], lastW: -1, track: new Map(), seenRead: new Map(), done: false };
  const L = this.__w;
  if (this.windupAt >= 0 && this.windupAt !== L.lastW) { L.lastW = this.windupAt; L.firstW ??= this.t; for (const d of under(this)) if (!L.track.has(d)) L.track.set(d, []); }
  const r = tick0.call(this);
  if (L.done) return r;
  const dir = this.offense?.length ? this.attackDir(this.offense[0].team) : 1;
  for (const d of under(this)) {
    const w: any = windupReads.get(d);
    if (w && w.sim === this) {
      const key = `${w.windup}`, m = L.seenRead.get(d) ?? new Map(); L.seenRead.set(d, m);
      const s = m.get(key) ?? { first: null, last: null, sw: 0, restart: null }; m.set(key, s);
      if (w.target && !s.first) { s.first = w.target; S.reads++; }
      if (w.target && s.last && w.target !== s.last) { s.sw++; S.switches++; }
      if (w.target) s.last = w.target;
      if (s.restart === null && d.tags.has('plant-restart')) s.restart = this.t;
    }
  }
  if (Math.round(this.t / this.dt) % Math.round(0.1 / this.dt) === 0) for (const [d, tr] of L.track) tr.push({ t: this.t, vx: d.vel.x, vy: d.vel.y });
  if (L.R && L.catchX === undefined && this.ball.kind === 'held' && this.ball.carrier === L.R) L.catchX = L.R.pos.x;
  if (L.R && L.intc === undefined && this.ball.kind === 'held' && this.ball.carrier?.team !== L.R.team) L.intc = true;
  if (this.phase !== 'live' && L.firstW) {
    L.done = true;
    for (const pu of L.pumps) { S.pumps++;
      for (const [d, m] of L.seenRead) { const s = m.get(`${pu.w}`); if (s?.first) { S.bites++; if (s.restart !== null) S.biteHold.push(s.restart - pu.t); } } }
    const end = (L.relT ?? this.t) + 0.6;
    for (const [, tr] of L.track) {
      const sm = tr.filter((q: any) => q.t >= L.firstW && q.t <= end); let turns = 0, flips = 0, last = 0;
      for (let i = 3; i < sm.length; i += 3) { const a = sm[i - 3], b = sm[i], sa = Math.hypot(a.vx, a.vy), sb = Math.hypot(b.vx, b.vy);
        if (sa >= 1 && sb >= 1 && (a.vx * b.vx + a.vy * b.vy) / (sa * sb) < 0) turns++; }
      for (const q of sm) { const v = q.vx * dir, sg = v > 0.5 ? 1 : v < -0.5 ? -1 : 0; if (sg && last && sg !== last) flips++; if (sg) last = sg; }
      S.turns.push(turns); S.flips.push(flips);
    }
    if (L.R && !this.defCall?.coverage?.man) {
      const tgtDepth = ((this.ball.kind === 'held' ? (L.catchX ?? L.R.pos.x) : L.R.pos.x) - this.los) * dir;
      if (tgtDepth >= 0 && tgtDepth <= 10) {
        const caught = L.catchX !== undefined;
        S.short.push({ caught, int: !!L.intc, yds: caught ? (L.R.pos.x - this.los) * dir : 0, yac: caught ? (L.R.pos.x - L.catchX) * dir : null });
      }
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const pct = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
const mean = (v: number[]) => v.length ? (v.reduce((s, x) => s + x, 0) / v.length).toFixed(2) : '-';
const q = (v: number[], f = .5) => { const x = [...v].sort((a, b) => a - b); return x.length ? x[Math.floor(f * (x.length - 1))].toFixed(2) : '-'; };
console.log(`seed ${seed}, ${games} games, SHOULDER_READ=${process.env.SHOULDER_READ ?? '0'} WINDUP_READ=${process.env.WINDUP_READ ?? '0'}`);
console.log(`  reads ${S.reads} | on thrown motions ${S.readThrown}: first read on the receiver thrown to ${pct(S.readFirstOnR, S.readThrown)}, read at the release ${pct(S.readRelOnR, S.readThrown)} | target switches ${S.switches} (${(S.switches / Math.max(1, S.reads)).toFixed(2)} per read)`);
console.log(`  pumps ${S.pumps} | bites ${S.bites} (${(S.bites / Math.max(1, S.pumps)).toFixed(2)} per pump) | pump to his restart p25/p50/p75 ${q(S.biteHold, .25)}/${q(S.biteHold)}/${q(S.biteHold, .75)} s (n ${S.biteHold.length})`);
const sh = S.short; console.log(`  zone throws 0-10 yd: n ${sh.length} | complete ${pct(sh.filter(r => r.caught).length, sh.length)} | INT ${pct(sh.filter(r => r.int).length, sh.length)} | yd/att ${mean(sh.map(r => r.yds))} | YAC ${mean(sh.filter(r => r.caught).map(r => r.yac))}`);
console.log(`  per underneath defender (n ${S.turns.length}): turns mean ${mean(S.turns)}, any ${pct(S.turns.filter(n => n > 0).length, S.turns.length)} | depth flips any ${pct(S.flips.filter(n => n > 0).length, S.flips.length)}, 2+ ${pct(S.flips.filter(n => n > 1).length, S.flips.length)}`);
