/** Defender energy at the snap and at the end of pass plays in whole games (read-only tap).
 *   node --import tsx scripts/diag/snap-energy.ts [seeds=7,8] */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
const seeds = (process.argv[2] ?? '7,8').split(',').map(Number);
const rows: { pos: string; e0: number; e1: number; dur: number; streak: number }[] = [];
for (const seed of seeds) {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const last = new Map<string, { index: number; streak: number }>();
  let index = 0;
  simulateGame(home, away, { seed, hooks: {
    playSetup: (_s, ctx) => { index = ctx.index; },
    playResult: (sim) => {
      const start = sim.agents.map((a) => a.body.energy);
      const r = sim.run();
      if (sim.offCall.kind === 'pass') sim.agents.forEach((a, k) => {
        const prev = last.get(a.player.id);
        const streak = prev && prev.index === index - 1 ? prev.streak + 1 : 1;
        last.set(a.player.id, { index, streak });
        if (a.team === 'D' && ['CB', 'S', 'LB'].includes(a.player.position)) rows.push({ pos: a.player.position, e0: start[k], e1: a.body.energy, dur: r.duration ?? NaN, streak });
      });
      return r;
    },
  } });
}
const q = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
console.log(`defender (CB/S/LB) pass-play reps: ${rows.length}`);
for (const pos of ['CB', 'S', 'LB', 'all']) {
  const r = rows.filter((x) => pos === 'all' || x.pos === pos);
  console.log(`${pos.padEnd(3)} n=${r.length} energy at snap mean ${mean(r.map((x) => x.e0)).toFixed(3)} p10 ${q(r.map((x) => x.e0), .1).toFixed(3)} p50 ${q(r.map((x) => x.e0), .5).toFixed(3)} | at end of play mean ${mean(r.map((x) => x.e1)).toFixed(3)} p10 ${q(r.map((x) => x.e1), .1).toFixed(3)} | spent mean ${mean(r.map((x) => x.e0 - x.e1)).toFixed(3)} | play length mean ${mean(r.map((x) => x.dur).filter(Number.isFinite)).toFixed(2)} s`);
}
for (const [lo, hi] of [[1, 1], [2, 3], [4, 99]]) {
  const r = rows.filter((x) => x.streak >= lo && x.streak <= hi);
  if (r.length) console.log(`consecutive snaps ${lo}-${hi}: n=${r.length} snap energy mean ${mean(r.map((x) => x.e0)).toFixed(3)} spent ${mean(r.map((x) => x.e0 - x.e1)).toFixed(3)}`);
}
