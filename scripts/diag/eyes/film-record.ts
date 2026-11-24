// QB lane 2026-11-23: the vision-cone film (Integration + the user). The same six staged plays with one passer at three
// levels of his mental ratings (as rating-panel.ts), recorded every tick for a film page: every player's position, the
// ball, the passer's head angle, his clear and peripheral cone half-widths (QBMind), his current read, how resolved his
// look at it is (QB_STEP_CLOCK), his phase, the throw. Flags from the environment.
//   node --import tsx scripts/diag/eyes/film-record.ts > film.json
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const PLAYS = [
  { concept: 'curl_flat', coverage: 'cover3' }, { concept: 'smash', coverage: 'cover2' }, { concept: 'dagger', coverage: 'cover4' },
  { concept: 'mesh', coverage: 'cover1' }, { concept: 'flood', coverage: 'cover3' }, { concept: 'stick', coverage: 'cover2' },
];
const MENTAL = ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency'];
const r1 = (x: number) => Math.round(x * 10) / 10;
const out: any[] = [];
for (const p of PLAYS) for (const level of [35, 60, 88]) {
  const setup: any = nativeTraceSetup({ ...p, seed: 1, roster: 3, formation: 'gun_doubles_11', flip: false });
  const qbP = setup.offense.QB;
  for (const k of MENTAL) qbP.ratings[k] = level;
  qbP.experience = level < 50 ? 0 : level < 75 ? 4 : 10;
  const sim: any = new PlaySim(setup);
  const frames: any[] = []; let qbb: any = null, thrown: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (q: any, target: any, ...rest: any[]) => { if (q === sim.qb && !thrown) thrown = { t: r1(sim.t * 10) / 10, slot: target?.slot ?? null }; return tb(q, target, ...rest); };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0();
    const b: any = sim.qb.behavior; if (!qbb && b?.kind === 'qb-pass') qbb = b;
    const m: any = sim.qbMind, qb = sim.qb, holding = sim.carrier === qb && !thrown;
    const cur = holding && qbb?.reads ? qbb.reads[qbb.readIdx] ?? null : null;
    frames.push({ t: Math.round(sim.t * 100) / 100,
      o: sim.offense.map((a: any) => [a.slot, r1(a.pos.x), r1(a.pos.y)]), d: sim.defense.map((a: any) => [a.slot, r1(a.pos.x), r1(a.pos.y)]),
      ball: sim.ball.kind === 'air' ? [r1(sim.ball.flight.pos.x), r1(sim.ball.flight.pos.y)] : null,
      head: holding ? Math.round((qb.head ?? qb.body.facing) * 1000) / 1000 : null,
      cur: cur?.slot ?? null, res: cur && qbb?.resolved ? Math.round(qbb.resolved(cur) * 100) / 100 : null, ph: holding ? qbb?.phase ?? null : null });
    if (sim.t > 5.5) sim.phase = 'dead';
  };
  try { sim.run(); } catch (e) { process.stderr.write(String((e as Error).stack).slice(0, 400) + "\n"); }
  const m: any = sim.qbMind;
  out.push({ ...p, level, los: setup.los, clearHalf: m.clearHalf, periphHalf: m.periphHalf, thrown, cmp: !!sim.stats.completed,
    int: (sim.events as any[]).some((e) => e.type === 'interception'), sack: (sim.events as any[]).some((e) => e.type === 'sack'), yards: sim.stats.yards ?? null, frames });
}
process.stdout.write(JSON.stringify(out));
