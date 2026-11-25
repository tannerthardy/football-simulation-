import { PlaySim } from '../../../src/sim/playsim.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { nativeTraceSetup } from '../command-trace.js';
const r2 = (x: number) => Math.round(x * 100) / 100;
for (const seed of [1, 2, 3]) {
  const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage: process.argv[2] ?? 'cover3', seed, roster: 3, formation: 'gun_doubles_11', flip: false });
  setup.offCall.pass = { ...PASS_BY_ID.slant_flat, back: 'check' };
  const qbP = setup.offense.QB; for (const k of ['playRecognition', 'decisionMaking', 'awareness', 'composure', 'discipline', 'anticipation', 'consistency']) qbP.ratings[k] = 60; qbP.experience = 4;
  const sim: any = new PlaySim(setup); let done = false, thrownAt = -1;
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0(); const b = sim.qb.behavior; if (sim.ball?.kind === 'air' && thrownAt < 0) thrownAt = sim.t;
    if (!done && b?.v2 && b.v2?.cycle?.state === 'throw') {
      done = true; const s1 = Object.entries(sim.offAlign.numbering).find(([, sl]) => true && false);
      for (const ref of ['S1', 'S2']) {
        const j = b.v2.judgedFor(ref), slot = sim.offAlign.numbering[ref] ?? Object.entries(sim.offAlign.numbering).find(([k]) => k === ref)?.[1];
        console.log(seed, 't', r2(sim.t), ref, slot, 'P', r2(j?.P), 'risk', r2(j?.risk), (b.v2.lastRoles.get(ref) ?? []).map((x: any) => { const d = sim.agents[x.id]; return `${d.slot}:${x.role} pA ${r2(x.pArrive)} m ${r2(x.margin)} play ${r2(x.pPlay)} pick ${r2(x.pPick)} @(${r2(d.pos.x - sim.los)},${r2(d.pos.y)}) v(${r2(d.vel.x)},${r2(d.vel.y)})`; }).join(' | '));
      }
      const rcv = sim.offense.filter((a: any) => a.behavior?.kind === 'route').map((a: any) => `${a.slot} ${a.behavior.route.id} @(${r2(a.pos.x - sim.los)},${r2(a.pos.y)}) v(${r2(a.vel.x)},${r2(a.vel.y)})`);
      console.log('   receivers', rcv.join(' | '));
    }
    if (sim.t > 4) sim.phase = 'dead';
  };
  try { sim.run(); } catch {}
  console.log('   numbering', JSON.stringify(sim.offAlign.numbering));
}
