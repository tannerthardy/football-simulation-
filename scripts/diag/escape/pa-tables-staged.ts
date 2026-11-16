// PA_TABLES staged: PA-tagged calls (PA_CALL's tag, as playcaller.ts builds it) of the keyed concepts, from gun doubles
// (stick from trips), against 8 coverages x 4 rosters x 6 seeds. Same bodies and seeds; only the flag differs.
// [PA_TABLES=1] [PA_CONCEPTS=a,b] node --import tsx scripts/diag/escape/pa-tables-staged.ts > rows.jsonl
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const COVS = 'cover1 cover2man cover2 tampa2 cover3 cover3_match cover4 cover6'.split(' ');
const ALL = 'smash slant_flat quick_outs dagger levels drive curl_flat stick'.split(' ');
const ONLY = (process.env.PA_CONCEPTS ?? '').split(',').filter(Boolean);
for (const concept of ONLY.length ? ALL.filter((c) => ONLY.includes(c)) : ALL) for (const coverage of COVS) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3, 4, 5, 6]) {
  const formation = concept === 'stick' ? 'gun_trips_11' : 'gun_doubles_11';
  const setup = nativeTraceSetup({ coverage, concept, seed, roster, formation, flip: false });
  const c = setup.offCall.pass!;
  setup.offCall = { ...setup.offCall, pass: { ...c, id: `${c.id}+pa`, name: `PA ${c.name}`, family: 'playaction', drop: 'pa', fake: 'insideZone' } };
  const sim: any = new PlaySim(setup);
  const ref = (a: any) => sim.offAlign.refOf[a.slot] ?? a.slot;
  let target: string | null = null, thrT: number | null = null, plan: any = null; const tick0 = sim.tick.bind(sim);
  sim.tick = () => { const air = sim.ball.kind === 'air'; tick0(); const b: any = sim.qb.behavior; if (b?.plan && !plan) plan = { style: b.plan.style, key: b.plan.key ? `${ref(b.plan.key.low)}<${ref(b.plan.key.high)}` : null };
    if (!air && sim.ball.kind === 'air' && !target) { target = sim.ball.target ? ref(sim.ball.target) : null; thrT = +sim.t.toFixed(2); } };
  const res = sim.run();
  console.log(JSON.stringify({ concept, formation, coverage, roster, seed, plan, target, thrT, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy, sacked: !!res.stats.sacked, yards: res.yards ?? null }));
}
