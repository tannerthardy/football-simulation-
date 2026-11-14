// Late shallow against quarters / Cover 6 / Cover 3 match (Integration 2026-11-14, the QB lane's drive rows): drive, the
// QB lane's staged set (rosters 3 7 11 19, seeds 1-6, gun doubles else trips), CONCEPT_DROPS=1 for the late arm. For
// throws to the shallow: at the throw and at the catch, every non-lineman defender's slot, rule / job / technique, depth
// past the line, lateral offset from the shallow (yd, + ahead of him along his run), distance; the nearest at the catch.
//   CONCEPT_DROPS=1 npx tsx scripts/diag/escape/shallow-late.ts
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const COVS = (process.env.COVS ?? 'cover4,cover6,cover3_match').split(',');
const DL = ['DE_S', 'DE_W', 'DT_S', 'DT_W'];
const lab = (d: any) => { const b = d.behavior; const n = b?.constructor?.name ?? '?';
  if (n === 'CoverageDefender') return `${b.rule}:${String(b.job)}${b.state?.mode ? '/' + b.state.mode : ''}${b.state?.cut ? '/cut ' + b.state.cut.slot : ''}`;
  return `${n}${b?.zone ? ':' + b.zone : ''}${b?.target ? ':man ' + b.target.slot : ''}`; };
const out: any[] = [];
for (const coverage of COVS) for (const roster of [3, 7, 11, 19]) for (const seed of [1, 2, 3, 4, 5, 6]) for (const formation of ['gun_doubles_11', 'gun_trips_11']) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept: 'drive', seed, roster, formation, flip: false })); } catch { continue; }
  const dir = sim.attackDir(sim.offense[0].team);
  const snapAt = (S: any, R: any) => sim.defense.filter((d: any) => !DL.includes(d.slot)).map((d: any) => {
    const side = Math.sign(R.vel.y) || 1;
    return { slot: d.slot, lab: lab(d), depth: +((d.pos.x - sim.los) * dir).toFixed(1), ahead: +((d.pos.y - R.pos.y) * side).toFixed(1), dist: +Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y).toFixed(1) };
  }).sort((a: any, b: any) => a.dist - b.dist);
  let thr: any = null, atThrow: any = null, atCatch: any = null; const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, ...rest: any[]) => {
    if (p === sim.qb && !thr && target) { thr = { t: +sim.t.toFixed(2), route: target.behavior?.route?.id ?? null, aim: intended ? +((intended.x - sim.los) * dir).toFixed(1) : null, R: target, aimY: intended?.y }; atThrow = snapAt(sim, target); }
    return tb(p, target, v0, intended, ...rest);
  };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (thr && !atCatch && sim.ball.kind === 'held' && sim.ball.carrier === thr.R) atCatch = { t: +sim.t.toFixed(2), rows: snapAt(sim, thr.R), y: +((thr.R.pos.x - sim.los) * dir).toFixed(1) }; };
  let res: any; try { res = sim.run(); } catch { break; }
  if (thr && thr.route === 'shallow') out.push({ coverage, roster, seed, formation, t: thr.t, aim: thr.aim, cmp: !!res.stats.completed, yards: res.yards, atThrow: atThrow.slice(0, 5), atCatch: atCatch ? { t: atCatch.t, depth: atCatch.y, rows: atCatch.rows.slice(0, 4) } : null });
  break;
}
const late = out.filter((r) => r.t >= 2.5);
console.log(`== shallow throws: ${out.length}, late (>= 2.5 s) ${late.length} | CONCEPT_DROPS=${process.env.CONCEPT_DROPS ?? 0}`);
for (const c of COVS) { const R = late.filter((r) => r.coverage === c); if (R.length) console.log(`  ${c}: late n ${R.length}, complete ${R.filter((r) => r.cmp).length}, yards p50 ${[...R.map((r) => r.yards ?? 0)].sort((a, b) => a - b)[Math.floor(R.length / 2)]}`); }
for (const r of late.filter((x) => !process.env.ONLY || x.coverage === process.env.ONLY).slice(0, Number(process.env.N ?? 14))) {
  console.log(`\n${r.coverage} r${r.roster} s${r.seed} ${r.formation} thrown ${r.t}s aim ${r.aim} -> ${r.cmp ? 'C' : 'I'} ${r.yards} yd`);
  console.log('  at throw (nearest 5): ' + r.atThrow.map((d: any) => `${d.slot} ${d.lab} d${d.depth} ahead${d.ahead} dist${d.dist}`).join(' | '));
  if (r.atCatch) console.log(`  at catch ${r.atCatch.t}s (rcv at ${r.atCatch.depth}): ` + r.atCatch.rows.map((d: any) => `${d.slot} ${d.lab} d${d.depth} ahead${d.ahead} dist${d.dist}`).join(' | '));
}
