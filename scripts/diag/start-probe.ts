/** Per-tick gait plan vs achieved for RBs and OL on run plays (0-3 s): request, facing offset,
 * directional factor, effort, posture, squeeze, planned and achieved accel along the request,
 * request turn rate, plan kind, nearest DL, depth. Reads only; one JSON row per body per tick.
 *   node --import tsx scripts/diag/start-probe.ts <seed> [games=1] | gzip > out/accel/<arm>-s<seed>.jsonl.gz */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { directionalSpeedFactor } from '../../src/physics/kinematics.js';
import { angleDiff } from '../../src/core/vec.js';
import type { PlaySim } from '../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 7), games = Number(process.argv[3] ?? 1);
const r3 = (x: number) => Math.round(x * 1000) / 1000;
let play = 0;
function watch(sim: PlaySim, id: number) {
  const w = sim.world as any, s = sim as any;
  const plan = w.plan.bind(w);
  const last = new Map<number, any>(), prevHead = new Map<number, number>();
  w.plan = (b: any, i: number, intent: any, dt: number) => {
    const before = { vx: b.vel.x, vy: b.vel.y, facing: b.facing };
    const out = plan(b, i, intent, dt);
    last.set(i, { intent, before, ax: out.ax, ay: out.ay, posture: b.support?.posture, state: b.support?.state, squeeze: b.squeeze ?? 0 });
    return out;
  };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const t0 = sim.t;
    tick();
    if (t0 < 0 || t0 > 3.0) return;
    for (const a of sim.agents) {
      const grp = a.slot === 'RB' ? 'RB' : (a.team === 'O' && /^(LT|LG|C|RG|RT)$/.test(a.slot)) ? 'OL' : null;
      if (!grp) continue;
      const L = last.get(a.idx); if (!L || !L.intent) continue;
      const rv = L.intent.vel, req = Math.hypot(rv.x, rv.y); if (req < 0.5) continue;
      const ux = rv.x / req, uy = rv.y / req;
      const off = Math.abs(angleDiff(L.before.facing, Math.atan2(rv.y, rv.x)));
      const dirf = directionalSpeedFactor(a.profile, off);
      const vAlong = L.before.vx * ux + L.before.vy * uy;
      const achieved = ((a.vel.x - L.before.vx) * ux + (a.vel.y - L.before.vy) * uy) / sim.dt;
      const planned = L.ax * ux + L.ay * uy;
      const engaged = !!a.engagement, carrier = sim.carrier === a;
      const head = Math.atan2(rv.y, rv.x), ph = prevHead.get(a.idx); prevHead.set(a.idx, head);
      const turn = ph === undefined ? 0 : Math.abs(angleDiff(ph, head)) / sim.dt;
      const speed = Math.hypot(a.vel.x, a.vel.y), vang = speed > .3 ? Math.abs(angleDiff(Math.atan2(a.vel.y, a.vel.x), head)) : 0;
      const plan = (a.behavior as any).plan?.kind ?? a.behavior.kind;
      const dl = sim.agents.filter((o) => o.team !== a.team && /^(DE|DT|NT)/.test(o.slot)).reduce((m, o) => Math.min(m, Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y)), 99);
      console.log(JSON.stringify([seed, id, grp, r3(t0), r3(req), r3(off), r3(dirf), r3(L.intent.effort ?? 1), r3(L.posture ?? 0), r3(L.squeeze),
        r3(vAlong), r3(planned), r3(achieved), r3(a.profile.vmax), r3(a.profile.tau), engaged ? 1 : 0, carrier ? 1 : 0, L.state, r3(turn), r3(speed), r3(vang), plan, r3(dl), r3((a.pos.x - sim.los) * sim.attackDir(a.team))]));
    }
  };
}
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(home, away, { seed: seed + g, record: false, runOnly: true, hooks: {
  playResult(sim, kind) { if (kind === 'scrimmage' && !sim.isPass) watch(sim, play++); return undefined; } } });
