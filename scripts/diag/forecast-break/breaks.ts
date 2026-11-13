/**
 * FORECAST_BREAK: when the quarterback expects each flat, arrow, swing and back's-flat route to break, read from his
 * own receiver forecasts one tick after the snap, for every concept that carries one, from 2x2 and 3x1 (current
 * engine; run once with FORECAST_BREAK=0 and once with =1).
 *   [FORECAST_BREAK=1] node --import tsx scripts/diag/forecast-break/breaks.ts
 */
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const ROUTES = new Set(['flat', 'arrow', 'swing', 'back_flat']);
const out: Record<string, number[]> = {};
for (const c of Object.values(PASS_BY_ID)) for (const formation of ['gun_doubles_11', 'gun_trips_11']) {
  if (c.family === 'screen') continue;
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: c.id, seed: 1, roster: 1, formation, flip: false }));
  for (let i = 0; i < 2; i++) sim.tick();
  const qb = sim.qb.behavior;
  if (!qb?.receiverForecasts) continue;
  for (const [r, f] of qb.receiverForecasts) {
    const id = r.behavior?.route?.id;
    if (!ROUTES.has(id)) continue;
    const b = f.breakAt();
    (out[id] ??= []).push(b === null ? NaN : b);
  }
}
const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
for (const [id, v] of Object.entries(out)) console.log(`${id.padEnd(10)} n ${String(v.length).padStart(3)} | expected break s after the snap p25/p50/p75 ${q(v, .25).toFixed(2)} / ${q(v, .5).toFixed(2)} / ${q(v, .75).toFixed(2)} | none ${v.filter((x) => !Number.isFinite(x)).length}`);
