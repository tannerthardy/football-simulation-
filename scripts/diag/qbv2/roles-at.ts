// QB lane: D's role breakdown for each candidate of the read he is on, at a few ticks after the plant (staged).
import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const [concept, coverage, seed, formation = 'gun_doubles_11'] = process.argv.slice(2);
const setup: any = nativeTraceSetup({ concept, coverage, seed: Number(seed), roster: 3, formation, flip: false });
if (concept === 'slant_flat') setup.offCall.pass = { ...PASS_BY_ID[concept], back: 'check' };
if (concept === 'quick_outs') setup.offCall.pass = { ...PASS_BY_ID[concept], back: 'back_flat' };
for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline']) setup.offense.QB.ratings[k] = 60;
const sim: any = new PlaySim(setup); const seen = new Set<number>();
const t0 = sim.tick.bind(sim);
sim.tick = () => { t0(); const b = sim.qb.behavior, v2 = b?.v2, h = b?.v2h;
  if (v2 && h) { const k = Math.round((sim.t - h.snapAt) * 10); if (k >= 9 && k <= 15 && !seen.has(k)) { seen.add(k);
    for (const [ref, roles] of v2.lastRoles) console.log((sim.t - h.snapAt).toFixed(2), ref, JSON.stringify(roles.map((r: any) => ({ id: r.id, slot: sim.agents[r.id]?.slot, role: r.role, m: +r.margin.toFixed(2), sg: +r.sigma.toFixed(2), pA: +r.pArrive.toFixed(2), pick: +r.pPick.toFixed(2) })))); } }
  if (sim.t > 3) sim.phase = 'dead'; };
sim.run();
