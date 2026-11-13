/** Arrival speed, tackling rating and outcome in the sim (Defense, report only). Each defender's first arrival inside
 * 1.5 yd of the open-field carrier: his closing speed and speed, his tackling rating; outcome within 1 s: ended (play
 * over with him within 2 yd), past (he is > 1.5 yd away and behind the carrier), other. Table: ended / past share by
 * closing-speed tercile x tackling tercile, by group (DL / LB / DB).
 * usage: node --import tsx scripts/diag/effective-mass/arrival-control.mts [games] [seed] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 4), seed0 = Number(process.argv[3] ?? 101);
const grp = (slot: string) => { const s = slot.split('_')[0]; return /^(DE|DT|NT)/.test(s) ? 'DL' : /LB/.test(s) ? 'LB' : 'DB'; };
const rows: any[] = []; const St = new WeakMap<any, any>();
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this; tick0.call(this);
  let s = St.get(sim); if (!s) { s = { t0: -1, c: null, done: new Set(), pend: [] }; St.set(sim, s); }
  for (let i = s.pend.length - 1; i >= 0; i--) { const P = s.pend[i]; if (sim.phase === 'live' && sim.t < P.due) continue; s.pend.splice(i, 1);
    const d = P.d, c = P.c, dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
    const cs = Math.hypot(c.vel.x, c.vel.y), behind = cs > 1 && ((d.pos.x - c.pos.x) * c.vel.x + (d.pos.y - c.pos.y) * c.vel.y) / cs < 0;
    P.row.out = sim.phase !== 'live' && dist <= 2 ? 'ended' : dist > 1.5 && behind ? 'past' : 'other';
    const E = sim.events.filter((e: any) => e.t >= P.t0 - 0.05 && e.t <= P.t0 + 1.0 && (e.a === d.idx || e.b === d.idx)).map((e: any) => e.type + (e.note ? ':' + e.note : ''));
    const has = (t: string) => E.some((e: string) => e.startsWith(t));
    P.row.ev = has('missed_tackle') ? (has('tackle_wrap') ? 'whiff then wrap' : 'whiff') : has('tackle_wrap') ? (has('broken_tackle') ? 'wrap, broken' : 'wrap') : has('carrier_contact') ? 'contact, no wrap' : 'no attempt';
    P.row.kind = sim.offCall?.kind; rows.push(P.row); }
  if (sim.phase !== 'live') return;
  const c = sim.ball.kind === 'held' ? sim.ball.carrier : null; if (!c || c.team !== 'O') return;
  if (s.t0 < 0) { const open = sim.offCall?.kind === 'pass' ? c !== sim.qb : c.pos.x > sim.los; if (!open) return; s.t0 = sim.t; s.c = c; }
  if (c !== s.c || sim.t - s.t0 > 3) return;
  for (const d of sim.defense) { if (s.done.has(d)) continue; const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, dist = Math.hypot(dx, dy);
    if (dist > 1.5) continue; s.done.add(d);
    const closing = ((d.vel.x - c.vel.x) * dx + (d.vel.y - c.vel.y) * dy) / dist;
    s.pend.push({ due: sim.t + 1, t0: sim.t, d, c, row: { g: grp(d.slot), closing, speed: Math.hypot(d.vel.x, d.vel.y), tk: d.r('tackling') } }); }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const tert = (v: number[]) => { const w = [...v].sort((a, b) => a - b); return [w[Math.floor(w.length / 3)], w[Math.floor(2 * w.length / 3)]]; };
console.log(`arrivals ${rows.length}`);
for (const kind of ['run', 'pass']) for (const g of ['DB', 'LB', 'DL']) {
  const X = rows.filter(r => r.g === g && r.kind === kind); if (X.length < 40) continue;
  for (const [lab, lo, hi] of [['<2', -99, 2], ['2-4', 2, 4], ['4+', 4, 99]] as const) {
    const Y = X.filter(r => r.closing >= lo && r.closing < hi); if (Y.length < 10) continue;
    const m: Record<string, { n: number; ended: number }> = {}; for (const r of Y) { m[r.ev] ??= { n: 0, ended: 0 }; m[r.ev].n++; if (r.out === 'ended') m[r.ev].ended++; }
    console.log(`  ${kind} ${g} closing ${lab} n ${Y.length}, ended ${(100 * Y.filter(r => r.out === 'ended').length / Y.length).toFixed(0)}%: ` + Object.entries(m).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `${k} ${(100 * v.n / Y.length).toFixed(0)}% (ended ${(100 * v.ended / v.n).toFixed(0)}%)`).join(', '));
  }
}
for (const g of ['DL', 'LB', 'DB']) {
  const X = rows.filter(r => r.g === g); if (X.length < 60) continue;
  const [c1, c2] = tert(X.map(r => r.closing)), [t1, t2] = tert(X.map(r => r.tk));
  console.log(`  ${g} n ${X.length}: closing cuts ${c1.toFixed(1)} / ${c2.toFixed(1)} yd/s, tackling cuts ${t1.toFixed(2)} / ${t2.toFixed(2)}; cells ended% / past% (n)`);
  for (const [tl, lo, hi] of [['low tackling', -1, t1], ['mid', t1, t2], ['high tackling', t2, 2]] as const) {
    const cells = [[-99, c1], [c1, c2], [c2, 99]].map(([a, b]) => { const Y = X.filter(r => r.tk >= lo && r.tk < hi && r.closing >= a && r.closing < b);
      return Y.length ? `${(100 * Y.filter(r => r.out === 'ended').length / Y.length).toFixed(0)}/${(100 * Y.filter(r => r.out === 'past').length / Y.length).toFixed(0)} (${Y.length})` : '-'; });
    console.log(`    ${tl.padEnd(14)} slow ${cells[0].padEnd(12)} mid ${cells[1].padEnd(12)} fast ${cells[2]}`);
  }
}
