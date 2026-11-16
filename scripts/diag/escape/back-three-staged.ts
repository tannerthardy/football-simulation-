// BACK_AS_THREE staged: stick and flood from gun doubles, as called off (the back on his check, no #3) and with the
// back as #3 (to the flat, out of the protection). 8 coverages x 4 rosters x 6 seeds a cell; same bodies and seeds.
// [BACK_AS_THREE=1] node --import tsx scripts/diag/escape/back-three-staged.ts > rows.jsonl
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { asBackThree } from '../../../src/game/concept-fit.js';
const COVS = 'cover1 cover2man cover2 tampa2 cover3 cover3_match cover4 cover6'.split(' ');
const ON = process.env.BACK_AS_THREE === '1';
for (const concept of ['stick', 'flood']) for (const coverage of COVS) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3, 4, 5, 6]) {
  const setup = nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false });
  if (ON) setup.offCall = { ...setup.offCall, pass: asBackThree(setup.offCall.pass!) };
  const sim: any = new PlaySim(setup);
  const ref = (a: any) => sim.offAlign.refOf[a.slot] ?? a.slot;
  let target: string | null = null, thrT: number | null = null; const tick0 = sim.tick.bind(sim);
  sim.tick = () => { const air = sim.ball.kind === 'air'; tick0(); if (!air && sim.ball.kind === 'air' && !target) { target = sim.ball.target ? ref(sim.ball.target) : null; thrT = +sim.t.toFixed(2); } };
  const res = sim.run();
  const sk = sim.events.find((e: any) => e.type === 'sack');
  console.log(JSON.stringify({ concept, coverage, roster, seed, target, thrT, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy, sacked: !!res.stats.sacked, sackT: sk ? +sk.t.toFixed(2) : null, yards: res.yards ?? null, backRoute: sim.slot?.('RB')?.behavior?.route?.id ?? sim.slot?.('RB')?.behavior?.kind ?? null }));
}
