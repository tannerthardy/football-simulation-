/** Where yards after the catch come from: time to first contact, contact to
 * down, misses and broken holds per completion (development aid; runs on
 * any engine that emits the standard play events).
 *   node --import tsx scripts/diag/yac-anatomy.ts [games] [seed] */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import type { PlaySim } from '../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 4);
const rng = new Rng(Number(process.argv[3] ?? 7));
type Row = { yac: number; toContact: number; contactToEnd: number; afterContact: number; missed: number; broken: number; nearAtCatch: number; firstDefDist: number; end: string };
const rows: Row[] = [];
const hooks = {
  playResult: (sim: PlaySim) => {
    const r = sim.run();
    const ev = sim.events;
    const catchE = ev.find((e) => e.type === 'catch');
    if (!catchE || catchE.a === undefined) return r;
    const rec = sim.agents[catchE.a];
    if (rec.team !== 'O') return r;
    const t0 = catchE.t;
    const after = ev.filter((e) => e.t >= t0);
    const contact = after.find((e) => e.type === 'carrier_contact' || e.type === 'tackle_wrap' || e.type === 'missed_tackle');
    const endX = sim.endSpot?.x ?? rec.pos.x;
    const dir = sim.attackDir('O');
    const catchX = catchE.pos?.x ?? rec.pos.x;
    const contactX = contact?.pos ? (contact.a !== undefined && sim.agents[contact.a] === rec ? contact.pos.x : (contact.b !== undefined && sim.agents[contact.b] === rec ? undefined : undefined)) : undefined;
    const yac = (endX - catchX) * dir;
    const tEnd = sim.t;
    rows.push({ yac, toContact: contact ? contact.t - t0 : NaN, contactToEnd: contact ? tEnd - contact.t : NaN,
      afterContact: contactX !== undefined ? (endX - contactX) * dir : NaN,
      missed: after.filter((e) => e.type === 'missed_tackle').length, broken: after.filter((e) => e.type === 'broken_tackle').length,
      nearAtCatch: 0, firstDefDist: NaN, end: sim.outcome ?? '' });
    return r;
  },
};
const t = Date.now();
for (let g = 0; g < games; g++) {
  const home = generateTeam(rng, 'H', 'HOM', { strength: 0.55 }), away = generateTeam(rng, 'A', 'AWY', { strength: 0.55 });
  simulateGame(home, away, { seed: rng.nextU32(), hooks } as never);
}
const q = (xs: number[], p: number) => { const s = xs.filter((x) => !Number.isNaN(x)).sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] : NaN; };
const mean = (xs: number[]) => { const s = xs.filter((x) => !Number.isNaN(x)); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : NaN; };
const f = (x: number) => x.toFixed(2);
console.log(`completions ${rows.length} in ${games} games (${((Date.now() - t) / 1000).toFixed(0)} s)`);
console.log(`YAC mean ${f(mean(rows.map((r) => r.yac)))} p50 ${f(q(rows.map((r) => r.yac), 0.5))} p90 ${f(q(rows.map((r) => r.yac), 0.9))}`);
console.log(`catch->first contact/attempt s: p50 ${f(q(rows.map((r) => r.toContact), 0.5))} p90 ${f(q(rows.map((r) => r.toContact), 0.9))}  none ${rows.filter((r) => Number.isNaN(r.toContact)).length}`);
console.log(`first contact->end s: p50 ${f(q(rows.map((r) => r.contactToEnd), 0.5))} mean ${f(mean(rows.map((r) => r.contactToEnd)))}`);
console.log(`missed/catch ${f(mean(rows.map((r) => r.missed)))} broken/catch ${f(mean(rows.map((r) => r.broken)))}`);
const bins = [[-99, 3], [3, 6], [6, 10], [10, 20], [20, 999]];
for (const [lo, hi] of bins) {
  const rs = rows.filter((r) => r.yac >= lo && r.yac < hi);
  console.log(`YAC [${lo},${hi}) n ${rs.length} (${(100 * rs.length / rows.length).toFixed(0)}%) toContact p50 ${f(q(rs.map((r) => r.toContact), 0.5))} missed ${f(mean(rs.map((r) => r.missed)))} broken ${f(mean(rs.map((r) => r.broken)))} TD ${rs.filter((r) => r.end === 'touchdown').length}`);
}
