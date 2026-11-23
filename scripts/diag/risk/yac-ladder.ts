// The defense's cue ladder on completions: for the defenders within 6 yd of the receiver at the catch, when each cue
// reached him (relative to the release, his own sample times where the cue has one), and when he started on the
// carrier. Cues: the throwing motion (loadingAt), the release believed (releasedAt, from the arm or the ball), the ball
// in his view (ballAt), his first own sample of the flight (BALL_EST), and the catch in his picture (the carrier seen
// holding it, observedHolder). Start: his velocity closing on the carrier at 1.5 yd/s or more after the catch.
// Reads only; nothing here changes what a defender does.
// usage: [BALL_EST=... flags] npx tsx scripts/diag/risk/yac-ladder.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { releaseBelief } from '../../../src/sim/release-belief.js';
import { observedHolder } from '../../../src/sim/possession-read.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, ev0 = P.event, tick0 = P.tick, b0 = P.buildResult, rows: any[] = [], defs: any[] = [];
P.event = function (type: string, a?: any, b?: any, note?: string) {
  const r = ev0.call(this, type, a, b, note);
  if (this.offCall?.kind !== 'pass') return r;
  const S = (this.__yl ??= {});
  if (type === 'catch' && a && a.team === 'O' && S.catchT === undefined) {
    S.catchT = this.t; S.carrier = a; S.catchX = a.pos.x; S.catchY = a.pos.y; S.dir = this.attackDir(a.team);
    S.near = this.defense.filter((d: any) => Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y) <= Number(process.env.LADDER_R ?? 6))
      .map((d: any) => { const dx = a.pos.x - d.pos.x, dy = a.pos.y - d.pos.y, l = Math.hypot(dx, dy) || 1;
        return { d, dist: l, closing: (d.vel.x * dx + d.vel.y * dy) / l, role: d.behavior?.kind ?? '?', at: { x: d.pos.x, y: d.pos.y } }; });
  } else if (S.catchT !== undefined && ['hit', 'tackle', 'missed_tackle', 'tackled'].includes(type)) {
    if (S.contact === undefined) { S.contact = this.t - S.catchT; S.contactYd = Math.hypot(S.carrier.pos.x - S.catchX, S.carrier.pos.y - S.catchY); }
    if (type === 'missed_tackle') S.missed = (S.missed ?? 0) + 1;
  }
  return r;
};
P.tick = function () {
  const r = tick0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  const S = (this.__yl ??= {});
  if (S.relT === undefined && this.ball?.kind === 'air' && this.ball.thrower) S.relT = this.t;
  if (S.relT !== undefined && S.catchT === undefined) {
    // First own sample per defender (his estimate's store), while the ball is up.
    S.sample ??= new Map();
    for (const d of this.defense) if (!S.sample.has(d.idx) && (this.ballEstimates?.samplesOf?.(d) ?? 0) > 0) S.sample.set(d.idx, this.t);
  }
  if (S.catchT !== undefined && S.near && this.t - S.catchT <= 2) {
    for (const n of S.near) {
      const d = n.d, c = S.carrier;
      if (n.seen === undefined) { const h = observedHolder(d, this); if (h && h.target === c) n.seen = this.t; }
      if (n.start === undefined) {
        const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, l = Math.hypot(dx, dy) || 1;
        const sp = Math.hypot(d.vel.x, d.vel.y);
        if (sp >= 3 && (d.vel.x * dx + d.vel.y * dy) / (l * sp) >= Math.cos(Math.PI / 4)) n.start = this.t;
      }
      if (n.tags === undefined && this.t - S.catchT >= 0.5) n.tags = [...(d.tags ?? [])].filter((x: string) => !/^(looking)$/.test(x)).slice(-4).join(',') + '|' + (d.behavior?.kind ?? '?');
    }
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__yl;
  if (S?.catchT !== undefined && this.stats?.completed && S.relT !== undefined) {
    rows.push({ yac: (res.yards ?? 0) - (S.catchX - this.los) * S.dir, contact: S.contact, contactYd: S.contactYd, missed: S.missed ?? 0 });
    for (const n of S.near) {
      const rb = releaseBelief(this, n.d), rel = (t: number | undefined) => (t === undefined ? undefined : t - S.relT);
      defs.push({ tags: n.tags, yac: rows[rows.length - 1].yac, closing: n.closing, role: n.role, dist: n.dist, load: rel(rb.loadingAt), released: rel(rb.releasedAt), src: rb.source, ball: rel(rb.ballAt),
        sample: rel(S.sample?.get(n.d.idx)), seen: rel(n.seen), start: rel(n.start), catch: S.catchT - S.relT });
    }
  }
  this.__yl = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: (number | undefined)[]) => { const w = v.filter((x): x is number => Number.isFinite(x)).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(2)).join('/') : '-'; };
const had = (k: string) => `${defs.filter((d) => d[k] !== undefined).length}/${defs.length}`;
const mean = (v: number[]) => (v.reduce((a, b) => a + b, 0) / Math.max(1, v.length)).toFixed(2);
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: completions ${rows.length}, YAC mean ${mean(rows.map(r => r.yac))}, first contact ${q(rows.map(r => r.contact))} s after the catch`);
console.log(`   defenders within 6 yd at the catch: ${defs.length}; catch at ${q(defs.map(d => d.catch))} s after the release`);
console.log('   cue (s after the release, p25/50/75) | had it');
for (const k of ['load', 'released', 'ball', 'sample', 'seen', 'start']) console.log(`   ${k.padEnd(9)} ${q(defs.map(d => d[k])).padEnd(18)} | ${had(k)}`);
console.log(`   release from: arm ${defs.filter(d => d.src === 'arm').length}, ball ${defs.filter(d => d.src === 'ball').length}, none ${defs.filter(d => d.src === undefined).length}`);
console.log(`   start minus catch-seen ${q(defs.map(d => (d.start !== undefined && d.seen !== undefined ? d.start - d.seen : undefined)))} s; start minus catch ${q(defs.map(d => (d.start !== undefined ? d.start - d.catch : undefined)))} s`);
for (const [name, f] of [['sampled the ball', (d: any) => d.sample !== undefined], ['never sampled', (d: any) => d.sample === undefined]] as const) {
  const V = defs.filter(f);
  console.log(`   ${name}: n ${V.length} | dist at catch ${q(V.map(d => d.dist))} | closing ${q(V.map(d => d.closing))} | start-catch ${q(V.map(d => (d.start !== undefined ? d.start - d.catch : undefined)))}`);
}
const roles = new Map<string, any[]>(); for (const d of defs) { if (!roles.has(d.role)) roles.set(d.role, []); roles.get(d.role)!.push(d); }
for (const [r, V] of [...roles].sort((a, b) => b[1].length - a[1].length).slice(0, 6)) console.log(`   role ${r}: n ${V.length} sampled ${V.filter((d: any) => d.sample !== undefined).length} | dist ${q(V.map((d: any) => d.dist))} closing ${q(V.map((d: any) => d.closing))}`);
const tg = new Map<string, number>(); for (const d of defs) tg.set(d.tags ?? '-', (tg.get(d.tags ?? '-') ?? 0) + 1);
console.log('   tags 0.5 s after the catch (top 8): ' + [...tg].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(' ; '));
console.log(`   first contact ${q(rows.map(r => r.contactYd))} yd from the catch spot | missed tackles ${rows.reduce((a, r) => a + r.missed, 0)} on ${rows.length} catches (${(rows.reduce((a, r) => a + r.missed, 0) / Math.max(1, rows.length)).toFixed(3)} a catch)`);
