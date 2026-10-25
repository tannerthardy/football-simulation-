import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
const rng = new Rng(5);
const how: Record<string, number> = {};
const conc: Record<string, { n: number; s: number }> = {};
let shown = 0;
for (let g = 0; g < 6; g++) {
  const r = simulateGame(generateTeam(rng, 'H', 'HOM', { strength: 0.55 }), generateTeam(rng, 'A', 'AWY', { strength: 0.55 }), { seed: rng.nextU32(), record: true });
  for (const p of r.log) {
    if (p.kind !== 'run' || !p.replay) continue;
    const name = p.call.split('—').pop()!.trim();
    const c = (conc[name] ??= { n: 0, s: 0 });
    c.n++;
    if (p.yards > 0) continue;
    c.s++;
    const ev = p.replay.events;
    const first = ev.find((e) => e.type === 'hit' || e.type === 'tackle' || e.type === 'missed_tackle');
    if (!first || first.a === undefined) { how['no contact event'] = (how['no contact event'] ?? 0) + 1; continue; }
    const tk = first.a;
    const slot = p.replay.players[tk].slot;
    const shed = ev.find((e) => e.type === 'shed' && e.a === tk && e.t <= first.t);
    const grp = slot.startsWith('LB') ? 'LB' : /^(DE|DT|NT)/.test(slot) ? 'DL' : 'DB';
    const k = `${grp} ${shed ? 'shed a block' : 'unblocked / never engaged'}`;
    how[k] = (how[k] ?? 0) + 1;
    if (shown++ < 8) console.log(`${p.call} | ${p.defense} | ${slot} ${shed ? `shed ${shed.b !== undefined ? p.replay.players[shed.b].slot : ''} at ${shed.t}` : 'free'} hit at ${first.t.toFixed(2)} yds ${p.yards.toFixed(1)}`);
  }
}
console.log(how);
console.log(Object.fromEntries(Object.entries(conc).map(([k, v]) => [k, `${v.n} runs, ${((100 * v.s) / v.n).toFixed(0)}% stuffed`])));
