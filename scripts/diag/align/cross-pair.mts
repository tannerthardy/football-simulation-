/** CUT_WALL size check (Integration's condition 3): stage shallow crossers through the hook droppers of match calls
 * (mesh / y_cross / hitch_cross / post_cross against cover3_match and cover2_match, seeds x flips) and record the
 * crosser's nearest defender distance, across and over at 1.5 / 2.0 / 2.5 / 3.0 s while the ball is held, with the
 * nearest defender's technique; split by whether the nearest was walling (CrossWall). NFL curve: 3.0 / 3.5 / 3.8 / 3.7.
 *   CUT_WALL=1 npx tsx cross-pair.mts [seeds] */
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const N = Number(process.argv[2] ?? 20);
const MARKS = [1.5, 2.0, 2.5, 3.0];
const rows: any[] = [];
for (const concept of ['mesh', 'y_cross', 'hitch_cross', 'post_cross']) for (const coverage of ['cover3_match', 'cover2_match']) for (let seed = 1; seed <= N; seed++) for (const flip of [false, true]) {
  let sim: any;
  try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip })); } catch { continue; }
  const crossers = sim.offense.filter((o: any) => /shallow|cross/.test(String(o.behavior?.route?.id ?? '')));
  if (!crossers.length) continue;
  const got = new Map<any, any>();
  while (sim.phase !== 'dead' && sim.t < 3.2 && sim.ball.kind === 'held' && sim.ball.carrier === sim.qb) {
    sim.tick();
    for (const m of MARKS) if (Math.abs(sim.t - m) < 1e-6) for (const c of crossers) {
      let best: any = null, bd = Infinity;
      for (const d of sim.defense) { if (d.player.position === 'DT' || d.player.position === 'DE' || d.player.position === 'EDGE') continue; const dd = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y); if (dd < bd) { bd = dd; best = d; } }
      const tech = best?.behavior?.sub?.constructor?.name ?? best?.behavior?.constructor?.name ?? '?';
      rows.push({ m, dist: bd, across: Math.abs(best.pos.y - c.pos.y), over: (best.pos.x - c.pos.x) * sim.attackDir('O'), tech });
    }
  }
}
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? `- (n ${v.length})` : `${[.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/')} (n ${v.length})`; };
console.log(`== CUT_WALL=${process.env.CUT_WALL ?? 0}: staged crossers vs match hooks`);
for (const m of MARKS) {
  const R = rows.filter(r => r.m === m), W = R.filter(r => r.tech === 'CrossWall');
  const techs: Record<string, number> = {}; for (const r of R) techs[r.tech] = (techs[r.tech] ?? 0) + 1;
  console.log(`   ${m} s: nearest dist ${q(R.map(r => r.dist))} across ${q(R.map(r => r.across))} over ${q(R.map(r => r.over))} | when the nearest walls: dist ${q(W.map(r => r.dist))} across ${q(W.map(r => r.across))} over ${q(W.map(r => r.over))} | ${Object.entries(techs).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
