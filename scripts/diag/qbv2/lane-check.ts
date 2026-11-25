// QB lane (Integration's lane diagnostic): for each lane dropper D judged on the thrown receiver, D's belief at the throw
// (margin, arrival, near-catch arrival), whether the passer sees his head on him, his seen velocity, against the actual:
// his closest approach to the ball during the flight and the share of the flight it came at; and whether he touched it.
import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const [concept, coverage, seedArg, formation = 'gun_doubles_11'] = process.argv.slice(2);
const [s0, s1] = seedArg.split('-').map(Number);
for (let seed = s0; seed <= s1; seed++) {
  const setup: any = nativeTraceSetup({ concept, coverage, seed, roster: 3, formation, flip: false });
  if (concept === 'quick_outs') setup.offCall.pass = { ...PASS_BY_ID[concept], back: 'back_flat' };
  if (concept === 'slant_flat') setup.offCall.pass = { ...PASS_BY_ID[concept], back: 'check' };
  for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline']) setup.offense.QB.ratings[k] = 60;
  setup.offense.QB.experience = 4;
  const sim: any = new PlaySim(setup); let rel: any = null, b: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (q: any, target: any, v0: any, intended: any, arrivalT: number, ...rest: any[]) => {
    if (q === sim.qb && !rel && b?.v2 && target) {
      const ref = Object.entries(sim.offAlign.numbering).find(([, s]) => s === target.slot)?.[0] as string;
      const lanes = (b.v2.lastRoles.get(ref) ?? []).filter((r: any) => r.role === 'lane' && r.pArrive < 0.99).map((r: any) => {
        const d = sim.agents[r.id], e = b.mind.estimate(d), head = sim.see(q, d).head ?? e.facing, toQB = Math.atan2(q.pos.y - e.pos.y, q.pos.x - e.pos.x);
        return { id: r.id, slot: d.slot, m: +r.margin.toFixed(2), pA: +r.pArrive.toFixed(2), pick: +r.pPick.toFixed(3), eyesOn: Math.abs(Math.atan2(Math.sin(head - toQB), Math.cos(head - toQB))) < Math.PI / 3,
          seenV: [+e.vel.x.toFixed(1), +e.vel.y.toFixed(1)], min: Infinity, at: null as number | null };
      });
      rel = { t: sim.t, arr: arrivalT, slot: target.slot, flip: b.v2.presnap?.flip ?? null, lanes };
    }
    return tb(q, target, v0, intended, arrivalT, ...rest);
  };
  const t0 = sim.tick.bind(sim); sim.tick = () => { t0(); const x = sim.qb.behavior; if (x?.kind === 'qb-pass' && x.v2) b = x;
    if (rel && sim.ball?.kind === 'air') { const bp = sim.ball.flight.pos; for (const l of rel.lanes) { const d = sim.agents[l.id], dist = Math.hypot(d.pos.x - bp.x, d.pos.y - bp.y); if (dist < l.min) { l.min = +dist.toFixed(2); l.at = +((sim.t - rel.t) / (rel.arr - rel.t)).toFixed(2); } } }
    if (sim.t > 5) sim.phase = 'dead'; };
  sim.run();
  if (!rel) continue;
  const ev = sim.events as any[];
  for (const l of rel.lanes) console.log(JSON.stringify({ concept, coverage, seed, to: rel.slot, flip: rel.flip, ...l, touched: ev.some((e) => e.a === l.id && ['pbu', 'deflection', 'interception'].includes(e.type)), int: ev.some((e) => e.a === l.id && e.type === 'interception') }));
}
