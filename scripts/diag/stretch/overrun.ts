/** Zone-flow overrun (observation only). RunBlocker.zoneFlow is the
 * pre-contact track toward a defender in front of the blocker. Counts the
 * ticks it commands while the blocker is already level with or beyond his
 * target's near surface (true positions), how often the lateral request is
 * then saturated (>= 0.9 vmax) and how often it reverses sign at >= 0.5 vmax
 * on consecutive overrun ticks, for OL and inline TE separately.
 * node --import tsx scripts/diag/stretch/overrun.ts [--formations gun_doubles_11,ace_12] [--seeds 77,71001,1] */
import type { Agent } from '../../../src/sim/agent.js';
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import type { PlaySim } from '../../../src/sim/playsim.js';
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
type Row = { flow: number; over: number; sat: number; flips: number; blockers: Set<string>; plays: Set<string> };
const rows = new Map<string, Row>();
const last = new Map<Agent, { t: number; y: number }>();
let current = '';
const proto = RunBlocker.prototype as unknown as { zoneFlow: (a: Agent, sim: PlaySim) => { vel: { x: number; y: number } } | null };
const original = proto.zoneFlow;
proto.zoneFlow = function (this: { plan: { target: Agent | null } }, a: Agent, sim: PlaySim) {
  const cmd = original.call(this, a, sim);
  const target = this.plan.target;
  if (!cmd || !target) return cmd;
  const key = `${(sim.offCall.formation.id)}/${sim.offCall.run!.scheme}/${a.player.position === 'TE' ? 'TE' : 'OL'}`;
  const row = rows.get(key) ?? { flow: 0, over: 0, sat: 0, flips: 0, blockers: new Set(), plays: new Set() };
  rows.set(key, row);
  row.flow++;
  const dir = sim.attackDir(a.team);
  if ((target.pos.x - a.pos.x) * dir < a.profile.radius + target.profile.radius) {
    row.over++; row.blockers.add(`${current}/${a.slot}`); row.plays.add(current);
    if (Math.abs(cmd.vel.y) >= .9 * a.profile.vmax) row.sat++;
    const prev = last.get(a);
    if (prev && sim.t - prev.t < sim.dt * 1.5 && prev.y * cmd.vel.y < 0 && Math.min(Math.abs(prev.y), Math.abs(cmd.vel.y)) >= .5 * a.profile.vmax) row.flips++;
    last.set(a, { t: sim.t, y: cmd.vel.y });
  }
  return cmd;
};
const R = rosters();
let plays = 0;
for (const formation of list('--formations', 'gun_doubles_11,ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,71001,1').map(Number)) {
      const c: LabCase = { concept, dir, look, roster, seed, formation };
      current = [concept, dir, formation, look, roster, seed].join('/');
      last.clear();
      const sim = makeSim(c, R);
      while (sim.phase === 'live' && sim.t < 8) sim.tick();
      plays++;
    }
console.log(`plays ${plays}`);
for (const [key, r] of [...rows].sort()) console.log(`${key.padEnd(32)} flow ticks ${String(r.flow).padStart(6)} overrun ${String(r.over).padStart(5)} (${(100 * r.over / r.flow).toFixed(1)}%) saturated ${(100 * r.sat / Math.max(1, r.over)).toFixed(0)}% flips ${r.flips} | blockers ${r.blockers.size} plays ${r.plays.size}`);
