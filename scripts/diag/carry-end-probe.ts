/** How each run carry ends after first contact. Reads only; one JSON row per run play.
 *   node --import tsx scripts/diag/carry-end-probe.ts <seed> [games=2] > out/run/end/<arm>-s<seed>.jsonl
 *   python3 -I scripts/diag/carry_end_summary.py out/run/end/<arm>-s*.jsonl
 * Row: first carrier contact (time, yards past the line, velocity), the bond,
 * the carrier's first fall after it (cause, direction, the grasp joints on him:
 * legs share at the grasp and now, arm span, slip), and the end of the carry.
 * Existing flags come from the environment. */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import type { PlaySim } from '../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 7), games = Number(process.argv[3] ?? 2);
const r2 = (x: number) => Math.round(x * 100) / 100;
let play = 0;
function watch(sim: PlaySim, id: number) {
  const s = sim as any, concept = s.offCall.run?.id;
  const tick = sim.tick.bind(sim);
  const row: any = { seed, id, concept, tc: null, bond: null, fall: null, end: null };
  const first = new Map<any, any>();
  let last: any = null, prevState = 'up', nT = 0;
  sim.tick = () => {
    const wasLive = sim.phase === 'live';
    tick();
    const c = sim.carrier ?? last?.c;
    if (!c) return;
    const dir = sim.attackDir(c.team);
    const sup = c.body.support;
    if (row.tc === null && sim.firstContactX !== null) row.tc = { t: r2(sim.t), x: r2((c.pos.x - sim.los) * dir), vx: r2(c.vel.x * dir), vy: r2(c.vel.y) };
    if (sim.bond && row.bond === null) row.bond = { t: r2(sim.bond.start), n: sim.bond.tacklers.length };
    if (sim.bond) nT = Math.max(nT, sim.bond.tacklers.length);
    for (const j of sim.world.joints as any[]) if (j.kind === 'grasp' && j.b === c.body && !first.has(j)) first.set(j, { legs: j.legs, t: sim.t, hold: j.hold ?? 0, slipT: 0 });
    for (const j of sim.world.joints as any[]) if (first.has(j) && j.slipping) first.get(j).slipT += sim.dt;
    if (sup && sup.state === 'falling' && prevState === 'up') {
      const sp = Math.hypot(c.vel.x, c.vel.y) || 1;
      row.fall = { t: r2(sim.t), cause: sup.cause, vx: r2(c.vel.x * dir),
        fwd: r2((sup.fall.x * c.vel.x + sup.fall.y * c.vel.y) / sp), fallDownfield: r2(sup.fall.x * dir),
        held: sim.bond ? sim.bond.tacklers.length : 0,
        joints: sim.world.joints.filter((j: any) => j.kind === 'grasp' && j.b === c.body).map((j: any) => {
          if (!first.has(j)) first.set(j, { legs: j.legs, t: sim.t });
          const a = j.a, rx = a.pos.x - c.pos.x, ry = a.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
          return { legs0: r2(first.get(j).legs), legs: r2(j.legs), hold0: r2(first.get(j).hold), hold: r2(j.hold ?? 0), slipT: r2(first.get(j).slipT), reach: r2(j.reach), age: r2(sim.t - first.get(j).t), slip: !!j.slipping, force: r2(j.force ?? 0), cap: r2(j.capacity),
            behind: r2((rx * c.vel.x + ry * c.vel.y) / rd / sp), holderUp: a.support?.state, origin: j.origin }; }), causes: sup.causes && { c: r2(sup.causes.contact), l: r2(sup.causes.legs), o: r2(sup.causes.overspeed) } };
    }
    if (sup) prevState = sup.state;
    last = { c, t: sim.t, x: (c.pos.x - sim.los) * dir, vx: c.vel.x * dir, stalled: sim.bond?.stalled ?? 0, state: sup?.state,
      req: sim.intents[c.idx] ? r2(sim.intents[c.idx].vel.x * dir) : null };
    if (wasLive && sim.phase !== 'live' && !row.end) {
      row.end = { t: r2(last.t), x: r2(last.x), vx: r2(last.vx), state: last.state, stalled: r2(last.stalled), tacklers: nT, req: last.req,
        kind: s.result?.kind ?? s.whistleKind ?? null };
      if (s.isPass === false) console.log(JSON.stringify(row));
    }
  };
}
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(home, away, { seed: seed + g, record: false, runOnly: true, hooks: {
  playResult(sim, kind) { if (kind === 'scrimmage' && !sim.isPass) watch(sim, play++); return undefined; } } });
