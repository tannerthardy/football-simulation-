/** At the first tick the ball is in the air: per defender, the angle between his hips and the bearing to the passer (deg), per play.
 *   [YAW_CAP=1] node --import tsx scripts/diag/body/yaw-throw-facing.ts KEYS.txt OUT.json */
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const keys = readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean); const out: Record<string, any> = {};
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
for (const k of keys) {
  const [formation, concept, coverage, roster, seed] = k.split('|'); let sim: any;
  try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed: Number(seed), roster: Number(roster), formation, flip: false })); } catch { continue; }
  const tick0 = sim.tick.bind(sim); let done = false; const rec: any = {};
  sim.tick = () => { tick0(); if (!done && sim.ball?.kind === 'air') { done = true; const qb = sim.agents.find((a: any) => a.slot === 'QB'); const q = qb.pos;
    rec.t = sim.t; rec.d = sim.agents.filter((a: any) => a.team === 'D' && a.slot !== 'DE_W' && a.slot !== 'DE_S' && a.slot !== 'DT_S' && a.slot !== 'DT_W').map((a: any) => [a.slot, Math.round(Math.abs(wrap(a.body.facing - Math.atan2(q.y - a.pos.y, q.x - a.pos.x))) * 57.3), Math.round(Math.hypot(a.vel.x, a.vel.y) * 10) / 10]); } };
  try { sim.run(); out[k] = rec; } catch { continue; }
}
writeFileSync(process.argv[3], JSON.stringify(out)); console.log(Object.keys(out).length, 'plays');
