// Fixed-call panel (sim only): No. 1's comeback / out / hitch against a Cover 3 match corner, with the ball forced to him
// at his break. Concepts comebacks (S1/W1 comeback, 14 yd), double_outs (S1 out 10 yd, W1 hitch 5 yd) and
// curl_hitch-style hitch (whatever concept gives No. 1 a hitch); gun_doubles_11, cover3_match, seeds 1..N (roster =
// seed). The break: the first tick after he has run over 3 yd/s upfield that his upfield speed drops below 1.5 or his
// lateral speed passes his upfield speed; at the first tick the QB is set and ready to throw to him at or after it, the
// throw is forced (qb.evaluate / startThrow, as test/catch-choice.test.ts). At the break: his corner's depth over him and
// distance. Outcome of the forced ball: caught (the play not incomplete and no turnover) and its yards.
// usage: [CARRY_READ=1] npx tsx scripts/diag/risk/break-panel.ts [seeds]
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
const N = Number(process.argv[2] ?? 24);
const CASES: [string, string, string][] = [['comebacks', 'S1', 'comeback'], ['comebacks', 'W1', 'comeback'], ['double_outs', 'S1', 'out'], ['double_outs', 'W1', 'hitch']];
const q = (v: number[]) => { if (v.length < 3) return '-'; const x = [...v].sort((a, b) => a - b); return [.25, .5, .75].map(f => x[Math.floor(f * (x.length - 1))].toFixed(1)).join('/'); };
const mean = (v: number[]) => v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '-';
console.log(`== break panel, cover3_match, seeds 1-${N}, CARRY_READ=${process.env.CARRY_READ ?? '0'}`);
for (const [concept, ref, rid] of CASES) {
  const rows: any[] = [];
  for (let seed = 1; seed <= N; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3_match', concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
    const r = sim.slot(sim.offAlign.numbering[ref]);
    if (!r || !(r.behavior instanceof RouteRunner) || r.behavior.route?.id !== rid) continue;
    const cbs = sim.defense.filter((d: any) => d.player?.position === 'CB');
    const c = cbs.reduce((b: any, d: any) => Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y) < Math.hypot(b.pos.x - r.pos.x, b.pos.y - r.pos.y) ? d : b);
    let qb: any = null, up = false, brk: any = null, forced = false;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      const dir = sim.attackDir(sim.offense[0].team), vx = r.vel.x * dir, vy = Math.abs(r.vel.y);
      if (vx > 3) up = true;
      if (up && !brk && (vx < 1.5 || vy > vx)) brk = { t: sim.t, over: (c.pos.x - r.pos.x) * dir, dist: Math.hypot(c.pos.x - r.pos.x, c.pos.y - r.pos.y) };
      if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
      if (qb && brk && !forced && sim.throwAt < 0 && qb.phase === 'set' && qb.ready(r, sim)) {
        const ev = qb.evaluate(sim.qb, sim, r, 0); if (ev) { forced = true; brk.ft = sim.t; qb.startThrow(sim.qb, sim, ev); } } };
    const res = sim.run();
    if (brk) rows.push({ ...brk, forced, caught: forced && res.outcome !== 'incomplete' && !res.turnover, yards: res.yards, int: res.turnover });
  }
  const F = rows.filter(r => r.forced), C = F.filter(r => r.caught);
  console.log(`   ${concept} ${ref} ${rid.padEnd(8)} n ${rows.length} | at the break ${q(rows.map(r => r.t))} s: over him ${q(rows.map(r => r.over))} | distance ${q(rows.map(r => r.dist))} | forced ${F.length}: caught ${C.length} (${F.length ? (100 * C.length / F.length).toFixed(0) : '-'}%), int ${F.filter(r => r.int).length}, yards per throw ${mean(F.map(r => r.caught ? r.yards : 0))}, per catch ${mean(C.map(r => r.yards))}`);
}
