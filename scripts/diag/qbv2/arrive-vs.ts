// QB lane: D's believed arrival (ball arrival - margin) against the actual (first tick within his reach + 0.5 of the
// catch point), per judged defender of the thrown receiver, on staged V2 plays; with his true path every 0.1 s.
import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const [concept, coverage, seeds] = process.argv.slice(2);
for (const seed of seeds.split(',').map(Number)) {
  const setup: any = nativeTraceSetup({ concept, coverage, seed, roster: 3, formation: 'gun_doubles_11', flip: false });
  if (concept === 'slant_flat') setup.offCall.pass = { ...PASS_BY_ID[concept], back: 'check' };
  if (concept === 'quick_outs') setup.offCall.pass = { ...PASS_BY_ID[concept], back: 'back_flat' };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline']) setup.offense.QB.ratings[k] = 60;
  const sim: any = new PlaySim(setup); let rel: any = null, b: any = null; const path: Record<number, string[]> = {};
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (q: any, target: any, v0: any, intended: any, arrivalT: number, ...rest: any[]) => { if (q === sim.qb && !rel && b?.v2) { const ref = Object.entries(sim.offAlign.numbering).find(([, s]) => s === target?.slot)?.[0]; rel = { t: sim.t, arr: arrivalT, pt: intended, ref, roles: b.v2.lastRoles.get(ref) ?? [] }; } return tb(q, target, v0, intended, arrivalT, ...rest); };
  const t0 = sim.tick.bind(sim); sim.tick = () => { t0(); const x = sim.qb.behavior; if (x?.kind === 'qb-pass' && x.v2) b = x;
    if (rel && sim.t <= rel.arr + 0.3 && Math.round(sim.t * 10) % 1 === 0) for (const r of rel.roles) (path[r.id] ??= []).push(`${(sim.t - b.snapAt).toFixed(1)}:${Math.hypot(sim.agents[r.id].pos.x - rel.pt.x, sim.agents[r.id].pos.y - rel.pt.y).toFixed(1)}`);
    if (sim.t > 5) sim.phase = 'dead'; };
  sim.run();
  if (!rel) continue;
  const ie = (sim.events as any[]).find((e) => e.type === 'interception');
  console.log(`seed ${seed} to ${rel.ref} release ${(rel.t - b.snapAt).toFixed(2)} ball arrives ${(rel.arr - b.snapAt).toFixed(2)} int ${ie ? sim.agents[ie.a].slot : '-'}`);
  for (const r of rel.roles) { const d = sim.agents[r.id], rad = d.profile.reach + 0.5; const at = (path[r.id] ?? []).find((s) => Number(s.split(':')[1]) <= rad);
    console.log(`  ${d.slot} ${r.role} believed arrive ${(rel.arr - b.snapAt - r.margin).toFixed(2)} actual ${at ? at.split(':')[0] : 'never'} | dist to pt: ${(path[r.id] ?? []).filter((_, i) => i % 2 === 0).slice(0, 10).join(' ')}`); }
}
