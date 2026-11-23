// (A) What the defense does in the flight, by role: each defender's behaviour tags at the middle of the flight (the
//     branch he is in), and his closing on the eventual catcher at the catch, per tag signature. Run under 2049 and 2081
//     to see what passive sight changes in each role's branch.
// (B) The late starters: for a defender with no sample of the ball at the catch, the time from the catch to (a) the
//     catcher in his view (his estimator head, else his body facing: inside the 30 deg eye cone, and inside the 1.8 rad
//     body view), (b) the catch in his picture (observedHolder names the catcher) with his see() delay then, and (c) his
//     start (running within 45 deg of the catcher at 3 yd/s or more). Reads only.
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/def-late.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { observedHolder } from '../../../src/sim/possession-read.js';
import { releaseBelief } from '../../../src/sim/release-belief.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const P: any = PlaySim.prototype, tick0 = P.tick, ev0 = P.event, b0 = P.buildResult;
const mids: any[] = [], late: any[] = [];
const ang = (v: number) => { let x = v; while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return Math.abs(x) * 180 / Math.PI; };
P.tick = function () {
  const r = tick0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  const S = (this.__dl ??= {});
  if (this.ball?.kind === 'air' && !this.ball.securing) {
    S.rel ??= this.t;
    const path = this.ballPath, end = path.length ? path[path.length - 1].t : this.t;
    if (!S.mid && this.t >= S.rel + (end - S.rel) / 2) {
      S.mid = this.defense.map((d: any) => ({ d, role: d.behavior?.kind ?? '?', sig: [...(d.tags ?? [])].filter((x: string) => x !== 'looking').sort().join(',') || '-', eng: !!d.engagement }));
    }
  }
  if (S.catchT !== undefined && this.t - S.catchT <= 2) {
    const c = S.carrier, E = this.ballEstimates;
    for (const n of S.late ?? []) {
      const d = n.d, brg = Math.atan2(c.pos.y - d.pos.y, c.pos.x - d.pos.x), h = E?.headOf?.(d) ?? d.facing;
      if (n.eye === undefined && ang(brg - h) <= 30) n.eye = this.t - S.catchT;
      if (n.body === undefined && ang(brg - d.facing) <= 103) n.body = this.t - S.catchT;
      if (n.seen === undefined) { const o = observedHolder(d, this); if (o && o.target === c) { n.seen = this.t - S.catchT; n.age = o.cue.age; } }
      if (n.seen !== undefined && n.tag === undefined && this.t - S.catchT >= n.seen + 0.2) n.tag = [...(d.tags ?? [])].filter((x: string) => x !== 'looking').sort().join(',') || '-';
      if (n.start === undefined) { const sp = Math.hypot(d.vel.x, d.vel.y), dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, l = Math.hypot(dx, dy) || 1;
        if (sp >= 3 && (d.vel.x * dx + d.vel.y * dy) / (l * sp) >= Math.cos(Math.PI / 4)) n.start = this.t - S.catchT; }
    }
  }
  return r;
};
P.event = function (type: string, a?: any, b?: any, note?: string) {
  const r = ev0.call(this, type, a, b, note);
  const S = this.__dl;
  if (type === 'catch' && S && S.catchT === undefined && a?.team === 'O') {
    S.catchT = this.t; S.carrier = a;
    const E = this.ballEstimates;
    S.late = this.defense.filter((d: any) => !((E?.samplesOf?.(d) ?? 0) > 0)).map((d: any) => { const dx = a.pos.x - d.pos.x, dy = a.pos.y - d.pos.y, l = Math.hypot(dx, dy) || 1; const rb = releaseBelief(this, d); return { d, src: rb.source ?? 'none', load: rb.loadingAt !== undefined, role: d.behavior?.kind ?? '?', c0: (d.vel.x * dx + d.vel.y * dy) / l, dist: l }; });
    S.close = new Map(this.defense.map((d: any) => { const dx = a.pos.x - d.pos.x, dy = a.pos.y - d.pos.y, l = Math.hypot(dx, dy) || 1; return [d.idx, (d.vel.x * dx + d.vel.y * dy) / l]; }));
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__dl;
  if (S?.catchT !== undefined && this.stats?.completed) {
    for (const m of S.mid ?? []) mids.push({ role: m.role, sig: m.sig, eng: m.eng, close: S.close.get(m.d.idx) });
    for (const n of S.late ?? []) late.push({ src: n.src, load: n.load, tag: n.tag, c0: n.c0, dist: n.dist, role: n.role, eye: n.eye, body: n.body, seen: n.seen, age: n.age, start: n.start });
  }
  this.__dl = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: (number | undefined)[], d = 2) => { const w = v.filter((x): x is number => Number.isFinite(x)).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(d)).join('/') : '-'; };
console.log(`BALL_EST=${process.env.BALL_EST ?? 0}`);
for (const role of ['zone', 'man', 'rush']) {
  const V = mids.filter(m => m.role === role), by = new Map<string, any[]>();
  for (const m of V) { const k = (m.eng ? 'ENG ' : '') + m.sig; if (!by.has(k)) by.set(k, []); by.get(k)!.push(m); }
  console.log(`(A) ${role}: n ${V.length}, closing at the catch ${q(V.map(m => m.close))}`);
  for (const [k, W] of [...by].sort((a, b) => b[1].length - a[1].length).slice(0, 5)) console.log(`      ${String(W.length).padStart(4)}  ${k.slice(0, 70).padEnd(70)} closing ${q(W.map(m => m.close))}`);
}
for (const role of ['zone', 'man', 'rush']) {
  const V = late.filter(n => n.role === role); if (!V.length) continue;
  console.log(`(B) ${role} never sampled n ${V.length} | catcher in his 30 deg eye ${q(V.map(n => n.eye))} s (never ${V.filter(n => n.eye === undefined).length}) | in his body view ${q(V.map(n => n.body))} | catch in his picture ${q(V.map(n => n.seen))} s (see() age then ${q(V.map(n => n.age))}) | start ${q(V.map(n => n.start))} s (never ${V.filter(n => n.start === undefined).length})`);
}
for (const role of ['zone', 'man', 'rush']) {
  const V = late.filter(n => n.role === role); if (!V.length) continue;
  console.log(`(C) ${role} never sampled: closing at the catch ${q(V.map(n => n.c0))} | dist ${q(V.map(n => n.dist), 1)} | start-seen ${q(V.map(n => n.start !== undefined && n.seen !== undefined ? n.start - n.seen : undefined))}`);
  const by = new Map<string, any[]>(); for (const n of V) { const k = n.tag ?? '(no picture)'; if (!by.has(k)) by.set(k, []); by.get(k)!.push(n); }
  for (const [k, W] of [...by].sort((a, b) => b[1].length - a[1].length).slice(0, 5)) console.log(`      ${String(W.length).padStart(4)}  ${k.slice(0, 60).padEnd(60)} start ${q(W.map(n => n.start))} closing@catch ${q(W.map(n => n.c0))}`);
}
for (const role of ['zone', 'man', 'rush']) { const V = late.filter(n => n.role === role); if (!V.length) continue;
  const by = new Map<string, any[]>(); for (const n of V) { const k = `${n.src}${n.load ? '+motion' : ''}`; if (!by.has(k)) by.set(k, []); by.get(k)!.push(n); }
  console.log(`(D) ${role} never sampled, release belief at the catch: ` + [...by].map(([k, W]) => `${k} ${W.length} (start ${q(W.map(n => n.start))})`).join(' ; ')); }
