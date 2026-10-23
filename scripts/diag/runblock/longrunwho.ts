/** Designed runs that reach 20 yd: what happened to each defender who could
 * have stopped it (observation only; flags from the environment). For every
 * defender: his group (DL, LB, box DB, deep = a deep-zone DB), the carrier's
 * yard line at the defender's closest approach before the carrier reached 20,
 * that distance, whether he touched him (a contact event naming both), and
 * whether he was blocked at that moment. Summarised per group: share who got
 * within 1 yd, who made contact, who missed or broke off, and, for the deep
 * defenders, their depth past the carrier and closing speed when the
 * carrier was at the line.
 * node --import tsx scripts/diag/runblock/longrunwho.ts [--seed 301] [--games 4] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { Agent } from '../../../src/sim/agent.js';
import { isDeepZone } from '../../../src/playbook/alignment.js';
import type { DefSlot } from '../../../src/playbook/types.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '301')), games = Number(arg('--games', '4'));
type Who = { group: string; minDist: number; atYard: number; touched: boolean; missed: boolean; blocked: boolean; depthAtLos?: number; downhillAtLos?: number };
const rows: Who[][] = [];
let runs = 0, long = 0;
const hooks = {
  playResult: (sim: PlaySim) => {
    if (sim.isPass) return sim.run();
    const dir = sim.attackDir('O');
    const info = new Map<Agent, Who>();
    const group = (d: Agent) => {
      const role = sim.defAlign.spots[d.slot as DefSlot]?.role;
      if (role?.kind === 'zone' && isDeepZone(role.zone)) return 'deep';
      const x = (sim.defAlign.spots[d.slot as DefSlot]!.pos.x - sim.los) * dir;
      return x < 2 ? 'DL' : d.slot.startsWith('LB') ? 'LB' : 'boxDB';
    };
    for (const d of sim.defense) info.set(d, { group: group(d), minDist: Infinity, atYard: NaN, touched: false, missed: false, blocked: false });
    const event = sim.event.bind(sim);
    sim.event = (type, a, b, note) => {
      event(type, a, b, note);
      const c = sim.carrier;
      if (!c || c.team !== 'O' || c === sim.qb || (c.pos.x - sim.los) * dir >= 20) return;
      for (const x of [a, b]) {
        const w = x && info.get(x as Agent);
        if (!w) continue;
        if (['tackle_wrap', 'hit', 'carrier_contact', 'missed_tackle'].includes(type)) w.touched = true;
        if (type === 'missed_tackle') w.missed = true;
      }
    };
    let atLos = false;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      const c = sim.carrier;
      if (!c || c.team !== 'O' || c === sim.qb) return;
      const yard = (c.pos.x - sim.los) * dir;
      if (!atLos && yard >= 0) {
        atLos = true;
        for (const [d, w] of info) if (w.group === 'deep') { w.depthAtLos = (d.pos.x - c.pos.x) * dir; w.downhillAtLos = -d.vel.x * dir; }
      }
      if (yard >= 20) return;
      for (const [d, w] of info) {
        const dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
        if (dist < w.minDist) { w.minDist = dist; w.atYard = yard; w.blocked = !!d.engagement; }
      }
    };
    const r = sim.run();
    if (sim.offCall.run) runs++;
    if (sim.offCall.run && r.yards >= 20) { long++; rows.push([...info.values()]); }
    return r;
  },
};
for (let g = 0; g < games; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  simulateGame(home, away, { seed, hooks } as never);
}
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
console.log(`designed runs ${runs}, reaching 20 ${long}`);
for (const g of ['DL', 'LB', 'boxDB', 'deep']) {
  const W = rows.flat().filter(w => w.group === g);
  if (!W.length) continue;
  const n = W.length, pct = (k: number) => `${(100 * k / n).toFixed(0)}%`;
  console.log(`  ${g.padEnd(5)} n ${n} | within 1 yd ${pct(W.filter(w => w.minDist <= 1).length)}, touched ${pct(W.filter(w => w.touched).length)}, missed ${pct(W.filter(w => w.missed).length)}`
    + ` | closest ${med(W.map(w => w.minDist))} yd with the carrier at ${med(W.map(w => w.atYard))} yd, blocked then ${pct(W.filter(w => w.blocked).length)}`
    + (g === 'deep' ? ` | at the line: deeper than the carrier ${med(W.map(w => w.depthAtLos ?? NaN))} yd, downhill ${med(W.map(w => w.downhillAtLos ?? NaN))} yd/s` : ''));
}
