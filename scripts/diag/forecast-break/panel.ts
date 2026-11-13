/**
 * Forced-concept panel (docs/reviews/2026-11-11-forecast-break.md; the same panel judges READ_PLAN in #592): every ordinary pass concept
 * (the 17 installed and CONCEPT_MENU's 15) from 2x2 and 3x1 against Cover 1, 2, 3 and 4, seeds (and rosters) 1-3,
 * both flips, on the current engine. One row per play: the plan and key read (READ_PLAN, #592; null here), where the ball went (receiver
 * number and route), time to throw, sack, interception, completion, yards. Arms are set by the environment.
 *   [FORECAST_BREAK=1] node --import tsx scripts/diag/forecast-break/panel.ts <arm>  -> out/forecast-break/panel-<arm>.jsonl
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { MENU_CONCEPTS, PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const arm = process.argv[2] ?? 'x';
const concepts = [...Object.values(PASS_BY_ID).filter((c) => !MENU_CONCEPTS.includes(c)), ...MENU_CONCEPTS];
mkdirSync('out/forecast-break', { recursive: true });
const rows: string[] = [];
const routeOf = (sim: any, a: any): string | null => {
  const c = sim.offCall.pass; const ref = sim.offAlign.refOf[a.slot];
  if (a.behavior?.route?.id) return a.behavior.route.id;
  if (ref === 'B') return c.back;
  return null;
};
for (const c of concepts) for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4'])
  for (const seed of [1, 2, 3]) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: c.id, seed, roster: seed, formation, flip }));
    let qb: any = null, tgt: any = null, tgtRoute: string | null = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      const air = sim.ball.kind === 'air';
      if (sim.ball.kind !== 'air' && !tgt) for (const o of sim.offense) o.__route ??= o.behavior?.route?.id ?? null;
      tick();
      if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
      if (!air && sim.ball.kind === 'air' && !tgt && sim.ball.target) { tgt = sim.ball.target; tgtRoute = tgt.__route ?? routeOf(sim, tgt); }
    };
    const r = sim.run(), s = sim.stats;
    rows.push(JSON.stringify({ concept: c.id, formation, coverage, seed, flip, plan: qb?.plan?.style ?? null, key: qb?.keyRead?.throwTo ?? null,
      keyDef: qb?.keyRead ? qb.keyRead.defender !== null : null,
      target: tgt ? sim.offAlign.refOf[tgt.slot] ?? tgt.slot : null, route: tgtRoute,
      ttt: s.timeToThrow ?? (sim.throwAt >= 0 ? sim.throwAt : null), att: !!s.attempted, cmp: !!s.completed, sack: !!s.sacked,
      int: !!s.interceptedBy || r.events.some((e: any) => e.type === 'interception'), yards: +r.yards.toFixed(2), air: s.airYards ?? null }));
  }
writeFileSync(`out/forecast-break/panel-${arm}.jsonl`, rows.join('\n') + '\n');
console.log(`${arm}: ${rows.length} plays`);
