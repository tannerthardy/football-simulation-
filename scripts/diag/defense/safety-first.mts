// The deep safety's first second and where it leaves him (Defense; Integration's (3)). Games (the caller's real calls).
// Pass plays, zone or man: every safety (FS / SS) aligned 8+ yd deep at the snap; his depth and speed at 0.5, 1.0, 2.0 s
// and at the throw, his requested speed at 0.25 / 0.5 s, by coverage family (the call's id up to the first underscore).
// Run plays: the same safeties, by whether the run goes to his side (carrier past the line on his side of the ball):
// his time from the handoff to within 3 yd of the carrier and to within 1 yd, and his depth at the handoff + 1.0 s.
//   node --import tsx scripts/diag/defense/safety-first.mts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, ev0 = P.event;
const passRows: any[] = [], runRows: any[] = [];
P.event = function (type: string, ...q: any[]) { if (type === 'handoff' && this.__hand === undefined) this.__hand = this.t; if (type === 'throw' && this.__thr === undefined) this.__thr = this.t; return ev0.call(this, type, ...q); };
P.tick = function () {
  const sim = this;
  if (!sim.__sf) {
    const dir = sim.attackDir(sim.offense[0].team);
    sim.__dir = dir;
    sim.__sf = sim.defense.filter((d: any) => /^(FS|SS)$/.test(d.slot) && (d.pos.x - sim.los) * -dir >= 8 || /^(FS|SS)$/.test(d.slot) && (d.pos.x - sim.los) * dir >= 8)
      .map((d: any) => { const b = d.behavior; const row: any = { d, m: {}, req: {} }; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...q: any[]) => { row.r = u(...q); return row.r; }; b.__h = 1; } return row; });
  }
  const r = t0.call(this);
  const dep = (d: any) => Math.abs(d.pos.x - sim.los);
  for (const row of sim.__sf) {
    const d = row.d;
    for (const m of [0.25, 0.5, 1.0, 2.0]) if (row.m[m] === undefined && sim.t >= m - 1e-9) { row.m[m] = { depth: dep(d), sp: Math.hypot(d.vel.x, d.vel.y) }; row.req[m] = row.r?.vel ? Math.hypot(row.r.vel.x, row.r.vel.y) : NaN; }
    if (sim.__thr !== undefined && row.atThrow === undefined) row.atThrow = { depth: dep(d), sp: Math.hypot(d.vel.x, d.vel.y) };
    const c = sim.carrier;
    if (!sim.isPass && sim.__hand !== undefined && c && c !== sim.qb) {
      const dist = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y), t = sim.t - sim.__hand;
      if (row.t3 === undefined && dist < 3) row.t3 = t;
      if (row.t1 === undefined && dist < 1) row.t1 = t;
      if (row.h1 === undefined && t >= 1.0) row.h1 = dep(d);
      if (row.side === undefined && (c.pos.x - sim.los) * sim.attackDir(c.team) > 0.5) row.side = Math.sign(c.pos.y - sim.ballY) === Math.sign(d.pos.y - sim.ballY) ? 'his side' : 'away';
    }
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this);
  if (this.__sf) {
    const fam = String(this.defCall?.coverage?.id ?? '?').split('_')[0];
    for (const row of this.__sf) {
      if (this.isPass && this.__thr !== undefined && !/^pa_/.test(this.offCall?.pass?.id ?? '')) passRows.push({ fam, man: !!this.defCall?.coverage?.man, m: row.m, req: row.req, thr: row.atThrow, tThr: this.__thr });
      else if (!this.isPass && this.__hand !== undefined) runRows.push({ side: row.side ?? 'none', t3: row.t3 ?? null, t1: row.t1 ?? null, h1: row.h1 ?? null });
    }
  }
  this.__sf = undefined; this.__thr = undefined; this.__hand = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[], p: number) => { const s = v.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))].toFixed(1) : '-'; };
console.log(`dropback passes: safety-rows ${passRows.length}`);
for (const fam of ['all', ...[...new Set(passRows.map((r) => r.fam))].sort()]) {
  const S = passRows.filter((r) => fam === 'all' || r.fam === fam); if (S.length < 15) continue;
  console.log(`  ${fam.padEnd(8)} n ${String(S.length).padStart(4)} | requested 0.25 / 0.5 s ${q(S.map((r) => r.req[0.25]), .5)} / ${q(S.map((r) => r.req[0.5]), .5)} | speed 0.25 / 0.5 / 1.0 / 2.0 s ${q(S.map((r) => r.m[0.25]?.sp), .5)} / ${q(S.map((r) => r.m[0.5]?.sp), .5)} / ${q(S.map((r) => r.m[1.0]?.sp), .5)} / ${q(S.map((r) => r.m[2.0]?.sp), .5)} | depth snap->1.0 / 2.0 s ${q(S.map((r) => r.m[0.25]?.depth), .5)} -> ${q(S.map((r) => r.m[1.0]?.depth), .5)} / ${q(S.map((r) => r.m[2.0]?.depth), .5)} | at the throw (t ${q(S.map((r) => r.tThr), .5)}) depth ${q(S.map((r) => r.thr?.depth), .25)}/${q(S.map((r) => r.thr?.depth), .5)}/${q(S.map((r) => r.thr?.depth), .75)} speed ${q(S.map((r) => r.thr?.sp), .5)}`);
}
console.log(`runs: safety-rows ${runRows.length}`);
for (const side of ['his side', 'away']) {
  const S = runRows.filter((r) => r.side === side); if (!S.length) continue;
  console.log(`  run ${side.padEnd(8)} n ${String(S.length).padStart(4)} | within 3 yd of the carrier ${(S.filter((r) => r.t3 !== null).length / S.length).toFixed(2)}, p50 ${q(S.map((r) => r.t3), .5)} s | within 1 yd ${(S.filter((r) => r.t1 !== null).length / S.length).toFixed(2)}, p50 ${q(S.map((r) => r.t1), .5)} s | his depth at handoff + 1.0 s ${q(S.map((r) => r.h1), .5)}`);
}
