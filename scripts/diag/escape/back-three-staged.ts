// BACK_AS_THREE staged: stick and flood from gun doubles, as called off (the back on his check, no #3) and with the
// back as #3 (to the flat, out of the protection). 8 coverages x 4 rosters x 6 seeds a cell; same bodies and seeds.
// [BACK_AS_THREE=1] [STAGED_FORM=gun_trips_11] node --import tsx scripts/diag/escape/back-three-staged.ts > rows.jsonl
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { asBackThree } from '../../../src/game/concept-fit.js';
const COVS = 'cover1 cover2man cover2 tampa2 cover3 cover3_match cover4 cover6'.split(' ');
const ON = process.env.BACK_AS_THREE === '1', FORM = process.env.STAGED_FORM ?? 'gun_doubles_11';
for (const concept of ['stick', 'flood']) for (const coverage of COVS) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3, 4, 5, 6]) {
  const setup = nativeTraceSetup({ coverage, concept, seed, roster, formation: FORM, flip: false });
  if (ON) setup.offCall = { ...setup.offCall, pass: asBackThree(setup.offCall.pass!) };
  const sim: any = new PlaySim(setup);
  const ref = (a: any) => sim.offAlign.refOf[a.slot] ?? a.slot;
  let target: string | null = null, thrT: number | null = null; const tick0 = sim.tick.bind(sim);
  sim.tick = () => { const air = sim.ball.kind === 'air'; tick0(); if (!air && sim.ball.kind === 'air' && !target) { target = sim.ball.target ? ref(sim.ball.target) : null; thrT = +sim.t.toFixed(2); } };
  let key: any = null, plan: string | null = null, lastRead: string | null = null, leftS2: any = null; const reads: string[] = []; const tick1 = sim.tick.bind(sim);
  sim.tick = () => { tick1(); const b: any = sim.qb.behavior; if (b?.plan && !plan) plan = b.plan.style; if (b?.keyRead && !key) key = { to: b.keyRead.throwTo, by: b.keyRead.defender, at: +b.keyRead.at.toFixed(2) };
    // Where his eyes go after the key, and #2 when they leave him.
    if (b?.kind === 'qb-pass' && b.reads?.length && b.phase !== 'snap') { const r = b.reads[b.readIdx]; const ag = r ? (r.target ?? sim.agents[r.idx]) : null; const rf = ag ? ref(ag) : null;
      if (rf && rf !== lastRead) { if (lastRead === 'S2' && !leftS2) { const s2 = sim.offense.find((o: any) => ref(o) === 'S2'); const ds = sim.defense.map((d: any) => Math.hypot(d.pos.x - s2.pos.x, d.pos.y - s2.pos.y)); leftS2 = { t: +sim.t.toFixed(2), sep: +Math.min(...ds).toFixed(1), depth: +((s2.pos.x - sim.los) * sim.attackDir('O')).toFixed(1) }; } reads.push(`${rf}@${sim.t.toFixed(2)}`); lastRead = rf; } } };
  const res = sim.run();
  const sk = sim.events.find((e: any) => e.type === 'sack');
  console.log(JSON.stringify({ concept, coverage, roster, seed, target, thrT, cmp: !!res.stats.completed, int: !!res.stats.interceptedBy, sacked: !!res.stats.sacked, sackT: sk ? +sk.t.toFixed(2) : null, yards: res.yards ?? null, plan, key, reads: reads.join(' '), leftS2, backRoute: sim.slot?.('RB')?.behavior?.route?.id ?? sim.slot?.('RB')?.behavior?.kind ?? null }));
}
