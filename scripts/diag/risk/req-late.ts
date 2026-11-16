// Late starters (no sample of the ball at the catch): requested vs achieved after the catch. For each, the time from
// the catch to (a) the catch in his picture (observedHolder names the catcher), (b) his request pointing at the carrier
// (cmd velocity within 45 deg at 3 yd/s+), (c) his body doing so (start). Tags at the request, speed at the picture.
// Reads only. usage: [flags] npx tsx scripts/diag/risk/req-late.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { observedHolder } from '../../../src/sim/possession-read.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const P: any = PlaySim.prototype, tick0 = P.tick, ev0 = P.event, b0 = P.buildResult, out: any[] = [];
const toward = (v: any, d: any, c: any) => { const sp = Math.hypot(v.x, v.y), dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, l = Math.hypot(dx, dy) || 1; return sp >= 3 && (v.x * dx + v.y * dy) / (l * sp) >= Math.SQRT1_2; };
const cosv = (v: any, d: any, c: any) => { const sp = Math.hypot(v.x, v.y), dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, l = Math.hypot(dx, dy) || 1; return sp < 0.3 ? NaN : (v.x * dx + v.y * dy) / (l * sp); };
P.tick = function () {
  const r = tick0.call(this); const S = this.__rl;
  if (S?.catchT !== undefined && this.t - S.catchT <= 2.5) for (const n of S.late) {
    const d = n.d, c = S.carrier, i = this.agents.indexOf(d), cmd = this.cmds[i]; const dt = this.t - S.catchT;
    if (n.seen === undefined) { const o = observedHolder(d, this); if (o && o.target === c) { n.seen = dt; n.spAtSeen = Math.hypot(d.vel.x, d.vel.y); n.cosAtSeen = cosv(d.vel, d, c); } }
    if (n.seen !== undefined && n.cmdAt === undefined && cmd && toward(cmd.vel, d, c)) { n.cmdAt = dt; n.tag = [...(d.tags ?? [])].filter((x: string) => x !== 'looking').sort().join(',') || '-'; }
    if (n.seen !== undefined && n.cmdAt === undefined && n.tag0 === undefined && dt >= n.seen + 0.2) { n.tag0 = [...(d.tags ?? [])].filter((x: string) => x !== 'looking').sort().join(',') || '-'; n.cmdCos = cmd ? cosv(cmd.vel, d, c) : NaN; n.cmdSp = cmd ? Math.hypot(cmd.vel.x, cmd.vel.y) : NaN; n.eng = !!d.engagement; }
    if (n.start === undefined && toward(d.vel, d, c)) n.start = dt;
  }
  return r;
};
P.event = function (type: string, a?: any, b?: any, note?: string) {
  const r = ev0.call(this, type, a, b, note);
  if (type === 'catch' && a?.team === 'O' && this.offCall?.kind === 'pass' && !this.__rl) {
    const E = this.ballEstimates;
    this.__rl = { catchT: this.t, carrier: a, late: this.defense.filter((d: any) => !((E?.samplesOf?.(d) ?? 0) > 0)).map((d: any) => ({ d, role: d.behavior?.kind ?? '?', dist: Math.hypot(a.pos.x - d.pos.x, a.pos.y - d.pos.y) })) };
  }
  return r;
};
P.buildResult = function () { const res = b0.call(this), S = this.__rl; if (S && this.stats?.completed) for (const n of S.late) out.push({ ...n, d: undefined }); this.__rl = undefined; return res; };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: any[], k = 2) => { const w = v.filter((x): x is number => Number.isFinite(x)).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(k)).join('/') : '-'; };
for (const role of ['zone', 'man', 'rush']) for (const near of [true, false]) {
  const V = out.filter(n => n.role === role && (n.dist <= 8) === near); if (!V.length) continue;
  console.log(`${role} ${near ? '<=8yd' : '>8yd'} n ${V.length} | seen ${q(V.map(n => n.seen))} | request on him ${q(V.map(n => n.cmdAt))} (never ${V.filter(n => n.cmdAt === undefined).length}) | start ${q(V.map(n => n.start))} | req-seen ${q(V.map(n => n.cmdAt - n.seen))} | start-req ${q(V.map(n => n.start - n.cmdAt))} | speed@seen ${q(V.map(n => n.spAtSeen), 1)} cos@seen ${q(V.map(n => n.cosAtSeen))}`);
  const by = new Map<string, any[]>(); for (const n of V.filter(n => n.seen !== undefined && (n.cmdAt === undefined || n.cmdAt - n.seen > 0.25))) { const k = (n.eng ? 'ENG ' : '') + (n.tag0 ?? '?'); if (!by.has(k)) by.set(k, []); by.get(k)!.push(n); }
  for (const [k, W] of [...by].sort((a, b) => b[1].length - a[1].length).slice(0, 4)) console.log(`    req >0.25 s after seen: ${String(W.length).padStart(3)} ${k.slice(0, 60).padEnd(60)} cmd cos ${q(W.map(n => n.cmdCos))} cmd sp ${q(W.map(n => n.cmdSp), 1)}`);
}
