/** SAM_ON_TE check in fresh run-only games (restage keeps saved calls): samdepth operator at the snap,
 * Over/Even LB_S over an attached TE, plus run yards by call. usage: <seed>... (env flags apply) */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
const R: Record<string, number[]> = {}; const Y: Record<string, number[]> = {};
for (const seed of process.argv.slice(2).map(Number)) {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed, record: false, runOnly: true, hooks: { playResult(sim: any, kind: string) {
    if (kind !== 'scrimmage' || sim.isPass) return undefined;
    const call = sim.defCall; const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
    const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map((s: string) => sim.slot(s)); const ys = OL.map((o: any) => o.pos.y).sort((a: number, b: number) => a - b); const cy = ys.reduce((a: number, b: number) => a + b, 0) / 5;
    const att = sim.offense.filter((o: any) => !OL.includes(o) && o !== sim.qb && Math.abs((o.pos.x - los) * d2) <= 3 && (o.pos.y < ys[0] - .5 || o.pos.y > ys[4] + .5) && Math.min(Math.abs(o.pos.y - ys[0]), Math.abs(o.pos.y - ys[4])) < 3.5);
    for (const d of sim.defense) { const grp = /LB/.test(d.slot) ? 'LB' : /^(DE|DT|NT)/.test(d.slot) ? 'DL' : ''; if (!grp) continue; const x = (d.pos.x - los) * d2; if (x < 0 || x > 7 || Math.abs(d.pos.y - cy) > 8) continue;
      const over = att.some((t: any) => Math.abs(t.pos.y - d.pos.y) <= 1), out = d.pos.y < ys[0] - .5 || d.pos.y > ys[4] + .5;
      (R[grp + ' ' + (over ? 'over attached TE/wing' : out ? 'outside tackles, no TE' : 'inside tackles')] ??= []).push(x); }
    const r = sim.run(); const tag = `${call?.front?.id ?? '?'}${call?.samOn ? '+samOn' : ''}`;
    (Y[tag] ??= []).push(r.yards);
    return r; } } });
}
for (const [k, v] of Object.entries(R).sort()) { v.sort((a, b) => a - b); const n = v.length; const band = (a: number, b: number) => Math.round(100 * v.filter(x => x >= a && x < b).length / n);
  console.log(`${k}: n ${n} p50 ${v[Math.floor(n / 2)].toFixed(2)} | bands <1.6/1.6-2.5/2.5-3.5/3.5+ ${band(-9, 1.6)}/${band(1.6, 2.5)}/${band(2.5, 3.5)}/${band(3.5, 99)}%`); }
for (const [k, v] of Object.entries(Y).sort()) { const n = v.length, m = v.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / n); console.log(`yards ${k}: n ${n} mean ${m.toFixed(2)} (SE ${(sd / Math.sqrt(n)).toFixed(2)})`); }
