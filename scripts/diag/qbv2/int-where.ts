// QB lane: where along the ball's flight each staged V2 interception happens (distance from the passer, from the throw's
// point, and the share of the flight), and D's role for the interceptor at the throw.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const [concept, coverage, seeds, formation = 'gun_trips_11'] = process.argv.slice(2);
for (const seed of seeds.split(',').map(Number)) {
  const setup: any = nativeTraceSetup({ concept, coverage, seed, roster: 3, formation, flip: false });
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline']) setup.offense.QB.ratings[k] = 60;
  setup.offense.QB.experience = 4;
  const sim: any = new PlaySim(setup); let rel: any = null, b: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (q: any, target: any, v0: any, intended: any, arrivalT: number, ...rest: any[]) => { if (q === sim.qb && !rel && b?.v2) { const ref = Object.entries(sim.offAlign.numbering).find(([, s]) => s === target?.slot)?.[0]; rel = { t: sim.t, from: { ...q.pos }, pt: { x: intended.x, y: intended.y }, arr: arrivalT, roles: b.v2.lastRoles.get(ref) ?? [] }; } return tb(q, target, v0, intended, arrivalT, ...rest); };
  const t0 = sim.tick.bind(sim); sim.tick = () => { t0(); const x = sim.qb.behavior; if (x?.kind === 'qb-pass' && x.v2) b = x; if (sim.t > 5) sim.phase = 'dead'; };
  sim.run();
  const ie = (sim.events as any[]).find((e) => e.type === 'interception');
  if (!ie || !rel) continue;
  const p = ie.pos ?? sim.agents[ie.a].pos, d = sim.agents[ie.a];
  const role = rel.roles.find((r: any) => r.id === ie.a);
  console.log(seed, d.slot, 'at', (ie.t - rel.t).toFixed(2), 's of', (rel.arr - rel.t).toFixed(2), '| from passer', Math.hypot(p.x - rel.from.x, p.y - rel.from.y).toFixed(1), 'from point', Math.hypot(p.x - rel.pt.x, p.y - rel.pt.y).toFixed(1), '| D:', role ? `${role.role} pA${role.pArrive.toFixed(2)} pk${role.pPick.toFixed(3)}` : 'not judged');
}
