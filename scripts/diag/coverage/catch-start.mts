// The defense's start on a completed pass, by role and by the rung of the seen-catch link that held him (Coverage C14,
// the honest defender). Reads only.
// Per completion: YAC, catch to first contact. Per unblocked defender within 10 yd of the catcher at the catch:
//   role (behaviour kind, zone), separation at the catch, his closing speed on the carrier at the catch and 0.5 s on, his start (the first tick from the catch at which his velocity
//   toward the carrier is 1.5 yd/s or more; 0 if already), and his rung:
//     never-saw   no sample of the ball and no release belief
//     arm-only    a release belief from the arm, no sample of the ball
//     hands       no sample, but he played his man's hands (BALL_EST bit 8192)
//     catch-late  he sampled the ball, but the catch reached his picture (observedHolder names the catcher) over 0.5 s
//                 after it, or not within 2 s
//     saw-far     sampled, the catch in his picture within 0.5 s, but over 5 yd away
//     in-time     sampled, seen within 0.5 s, within 5 yd
// The start operator is chosen to run identically on NFL tracking (positions and velocities only).
//   [env] node --import tsx scripts/diag/coverage/catch-start.mts SEED GAMES out.jsonl
//   node --import tsx scripts/diag/coverage/catch-start.mts --report a.jsonl b.jsonl ...
import { appendFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const q = (v: (number | undefined)[], d = 2) => { const w = v.filter((x): x is number => Number.isFinite(x)).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map((f) => w[Math.floor(f * (w.length - 1))].toFixed(d)).join('/') : '-'; };
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const band = (d: number) => (d < 2 ? '0-2' : d < 4 ? '2-4' : d < 7 ? '4-7' : '7-10');
const group = (kind: string, zone?: string) => (kind === 'man' ? 'man' : kind === 'zone' ? (/deep|half|third|quarter|middle/.test(zone ?? '') ? 'zone-deep' : 'zone-under') : /rush/.test(kind) ? 'rush' : kind);

if (process.argv[2] === '--report') {
  for (const f of process.argv.slice(3)) {
    const plays = readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
    const defs = plays.flatMap((p) => p.defs.map((d: any) => ({ ...d, yac: p.yac })));
    console.log(`== ${f}: completions ${plays.length}, YAC ${mean(plays.map((p) => p.yac)).toFixed(2)}, first contact ${q(plays.map((p) => p.contact))} s (none in 2 s ${plays.filter((p) => p.contact === undefined).length})`);
    console.log('   role        n    start p25/50/75   never  closing@catch  @+0.5s     by band (n, start p50, closing@+0.5 p50)');
    for (const g of ['man', 'zone-under', 'zone-deep', 'rush']) {
      const V = defs.filter((d) => d.group === g); if (!V.length) continue;
      const bands = ['0-2', '2-4', '4-7', '7-10'].map((b) => { const B = V.filter((d) => band(d.dist) === b); return `${b} ${B.length} ${q(B.map((d) => d.start)).split('/')[1] ?? '-'} ${q(B.map((d) => d.c5 ?? undefined), 1).split('/')[1] ?? '-'}`; }).join(' | ');
      console.log(`   ${g.padEnd(11)} ${String(V.length).padStart(4)}  ${q(V.map((d) => d.start)).padEnd(17)} ${String(V.filter((d) => d.start === undefined).length).padStart(4)}   ${q(V.map((d) => d.c0), 1).padEnd(13)} ${q(V.map((d) => d.c5 ?? undefined), 1).padEnd(10)} ${bands}`);
    }
    // The film: late first contact (over 1.5 s, or none in 2 s): the nearest unblocked defender's rung.
    const late = plays.filter((p) => p.contact === undefined || p.contact > 1.5), by = new Map<string, { n: number; yac: number }>();
    for (const p of late) { const d = p.defs[0]; const k = d ? d.rung : '(nobody within 10 yd)'; const e = by.get(k) ?? { n: 0, yac: 0 }; e.n++; e.yac += p.yac; by.set(k, e); }
    console.log(`   late first contact: ${late.length} of ${plays.length}, YAC ${late.reduce((a, p) => a + p.yac, 0).toFixed(0)} of ${plays.reduce((a, p) => a + p.yac, 0).toFixed(0)}; the nearest unblocked defender's rung:`);
    for (const [k, e] of [...by].sort((a, b) => b[1].yac - a[1].yac)) console.log(`      ${k.padEnd(22)} ${String(e.n).padStart(4)} catches  ${e.yac.toFixed(0).padStart(5)} yd YAC`);
  }
  process.exit(0);
}

const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8), out = process.argv[4] ?? `out/diag/coverage/catch-start-${seed}.jsonl`;
mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, '');
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { releaseBelief } = await import(`${W}/src/sim/release-belief.ts`);
const { observedHolder } = await import(`${W}/src/sim/possession-read.ts`);
const { estimatesFor } = await import(`${W}/src/sim/ball-estimate.ts`);
const P: any = PlaySim.prototype, ev0 = P.event, tick0 = P.tick, b0 = P.buildResult;
const closing = (d: any, c: any) => { const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, l = Math.hypot(dx, dy) || 1; return (d.vel.x * dx + d.vel.y * dy) / l; };
P.event = function (type: string, a?: any, b?: any, note?: string) {
  const r = ev0.call(this, type, a, b, note);
  if (this.offCall?.kind !== 'pass') return r;
  const S = (this.__cs ??= { hands: new Set<number>() });
  if (type === 'catch' && a && a.team === 'O' && S.catchT === undefined) {
    S.catchT = this.t; S.carrier = a; S.catchX = a.pos.x; S.dir = this.attackDir(a.team);
    S.near = this.defense.filter((d: any) => !d.engagement && Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y) <= 10)
      .map((d: any) => {
        // 'sample': his own sample of the ball on his estimate; for a defender on the true flight, the ball in his release belief.
        const rb = releaseBelief(this, d), sample = estimatesFor(d) ? (this.ballEstimates?.samplesOf?.(d) ?? 0) > 0 : rb.ballAt !== undefined;
        return { d, dist: Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y), kind: d.behavior?.kind ?? '?', zone: d.behavior?.zone, src: rb.source, sample, hands: S.hands.has(d.idx), c0: closing(d, a), start: closing(d, a) >= 1.5 ? 0 : undefined };
      }).sort((x: any, y: any) => x.dist - y.dist);
  } else if (S.catchT !== undefined && S.contact === undefined && ['hit', 'tackle', 'missed_tackle', 'tackled'].includes(type)) S.contact = this.t - S.catchT;
  return r;
};
P.tick = function () {
  const r = tick0.call(this);
  if (this.offCall?.kind !== 'pass') return r;
  const S = (this.__cs ??= { hands: new Set<number>() });
  if (S.catchT === undefined && this.ball?.kind === 'air') for (const d of this.defense) if (d.tags?.has?.('play-hands')) S.hands.add(d.idx);
  if (S.catchT !== undefined && S.near && this.t - S.catchT <= 2) for (const n of S.near) {
    if (n.seen === undefined) { const h = observedHolder(n.d, this); if (h && h.target === S.carrier) n.seen = this.t - S.catchT; }
    if (n.start === undefined && closing(n.d, S.carrier) >= 1.5) n.start = this.t - S.catchT;
    if (n.c5 === undefined && this.t - S.catchT >= 0.5 - 1e-9) n.c5 = closing(n.d, S.carrier);
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__cs;
  if (S?.catchT !== undefined && this.stats?.completed) {
    const yac = (res.yards ?? 0) - (S.catchX - this.los) * S.dir;
    const defs = S.near.map((n: any) => {
      const rung = !n.sample ? (n.hands ? 'hands' : n.src === 'arm' ? 'arm-only' : 'never-saw')
        : n.seen === undefined || n.seen > 0.5 ? 'catch-late' : n.dist > 5 ? 'saw-far' : 'in-time';
      return { group: group(n.kind, n.zone), kind: n.kind, zone: n.zone, dist: +n.dist.toFixed(2), start: n.start, c0: +n.c0.toFixed(2), c5: n.c5 === undefined ? null : +n.c5.toFixed(2), seen: n.seen, src: n.src ?? null, sample: n.sample, hands: n.hands, rung };
    });
    appendFileSync(out, JSON.stringify({ yac: +yac.toFixed(2), contact: S.contact, defs }) + '\n');
  }
  this.__cs = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
console.log(`wrote ${out}`);
