// QB lane: for staged V2 plays with an interception, the interceptor and D's roles for the thrown receiver at the decision.
import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const [concept, coverage, seeds, formation = 'gun_doubles_11'] = process.argv.slice(2);
for (const seed of seeds.split(',').map(Number)) {
  const setup: any = nativeTraceSetup({ concept, coverage, seed, roster: 3, formation, flip: false });
  if (concept === 'slant_flat') setup.offCall.pass = { ...PASS_BY_ID[concept], back: 'check' };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline']) setup.offense.QB.ratings[k] = 60;
  const sim: any = new PlaySim(setup); let rolesAt: any = null, b: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (q: any, target: any, ...rest: any[]) => { if (q === sim.qb && !rolesAt && b?.v2) rolesAt = { t: +(sim.t - b.snapAt).toFixed(2), to: target?.slot, roles: [...b.v2.lastRoles.entries()].map(([ref, rs]: any) => [ref, rs.map((r: any) => `${sim.agents[r.id].slot}:${r.role}:m${r.margin.toFixed(2)}:pA${r.pArrive.toFixed(2)}:pk${r.pPick.toFixed(2)}`)]) }; return tb(q, target, ...rest); };
  const t0 = sim.tick.bind(sim); sim.tick = () => { t0(); const x = sim.qb.behavior; if (x?.kind === 'qb-pass' && x.v2) b = x; if (sim.t > 5) sim.phase = 'dead'; };
  sim.run();
  const ie = (sim.events as any[]).find((e) => e.type === 'interception');
  const unseen = ie && b ? +b.mind.pictureAge(sim.agents[ie.a]).toFixed(2) : null;
  console.log(seed, 'int by', ie ? sim.agents[ie.a].slot : null, 'pictureAge at end', unseen, JSON.stringify(rolesAt));
}
