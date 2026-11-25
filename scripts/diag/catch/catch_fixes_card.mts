// Tools 2026-11-24: same-seed card for the three catching.ts fixes (HANDS_ON_ARMS, SECURE_SPLIT, SECURE_FACE_GEOM). Read-only tap on PlaySim.run / sim.event: no RNG draw, no behaviour change.
//   [FLAGS] node --import tsx scripts/diag/catch/catch_fixes_card.mts [--seed 101] [--games 8] [--first 0] [--out out/catchfix/arm.json]
// Per pass play with an attempt: completed, interception (and whether at the catch point: the interceptor within 3 yd of the target), pass breakup (and its kind: 'at the ball' = no reason given, 'through the hands', 'dislodged through the hands'
// = the securing hand play, 'dislodged by the hit' = the securing body arrival), dropped (and contested: a defender within 2.5 yd of the receiver at the drop), incomplete otherwise. Counts per arm.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8')), first = Number(arg('--first', '0')), out = arg('--out', 'out/catchfix/arm.json');
mkdirSync(dirname(out), { recursive: true });
const C: Record<string, number> = {};
const add = (k: string, n = 1) => { C[k] = (C[k] ?? 0) + n; };
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const ev0 = sim.event.bind(sim); const mine: string[] = [];
  sim.event = (type: string, a: any, b?: any, detail?: any) => {
    try {
      if (type === 'drop') { const near = sim.defense.some((d: any) => !d.isDown(sim.t) && Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y) <= 2.5); mine.push(near ? 'drop contested' : 'drop uncontested'); }
      else if (type === 'pbu') mine.push('pbu ' + (detail ?? 'at the ball'));
      else if (type === 'interception' && b !== undefined) { const t = sim.ball?.target ?? b; const near = t && a?.pos && b?.pos ? Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) <= 3 : false; mine.push(near ? 'int at the catch point' : 'int elsewhere'); }
    } catch { /* read-only */ }
    return ev0(type, a, b, detail);
  };
  const res = orig.apply(this);
  try {
    const st = sim.stats;
    if (st.attempted) {
      add('attempts'); if (st.completed) add('complete'); if (st.interceptedBy) add('int'); if (st.passDefendedBy && !st.interceptedBy) add('pbu'); if (st.dropped) add('dropped');
      for (const m of new Set(mine)) add(m);
    }
  } catch { /* read-only */ }
  return res;
} as typeof orig;
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) { simulateGame(home, away, { seed: seed + first + g }); console.error(`game ${g + 1}/${games}`); }
writeFileSync(out, JSON.stringify(C));
console.log(JSON.stringify(C));
