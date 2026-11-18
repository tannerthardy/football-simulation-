// node --import tsx scripts/diag/eyes/peek-staged.ts > rows.jsonl   (QB lane, 2026-11-18, QB_PEEK_CLOCK)
// Every concept whose installed plan is a vertical peek, staged: 8 coverages x 3 rosters x 4 seeds, from gun doubles
// and trips. Per play: when he left the peek, the throw (time, route, air), the result, sacks. Passive.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { installedPlan } from '../../../src/playbook/read-compiler/runtime.js';
const COVS = 'cover1 cover2man cover2 cover2_match tampa2 cover3 cover4 cover6'.split(' ');
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const [id, c] of Object.entries(PASS_BY_ID) as [string, any][]) {
  let plan: any = null; try { plan = installedPlan(c, formation); } catch { plan = null; }
  if (plan?.style !== 'vertical_peek') continue;
  for (const coverage of COVS) for (const roster of [3, 7, 11]) for (const seed of [1, 2, 3, 4]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept: id, seed, roster, formation, flip: false })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team); let offPeek: number | null = null, key: any = null;
    const tick0 = sim.tick.bind(sim); sim.tick = () => { tick0(); const b: any = sim.qb.behavior; if (offPeek === null && b?.kind === 'qb-pass' && b.triDone) offPeek = +sim.t.toFixed(2); if (!key && b?.kind === 'qb-pass' && b.keyRead && b.plan?.key) key = { at: +b.keyRead.at.toFixed(2), to: b.keyRead.throwTo, mode: b.keyRead.mode ?? null, role: b.plan.key.role, man: b.plan.key.man?.slot ?? null, target: (b.keyRead.throwTo === 'low' ? b.plan.key.low : b.plan.key.high)?.slot ?? null }; };
    let thr: any = null, thrDefs: any[] = [], price: any = null; const tb = sim.throwBall.bind(sim);
    sim.throwBall = (p: any, target: any, v0: any, intended: any, ...rest: any[]) => { if (p === sim.qb && !thr) { const b: any = p.behavior, r = b?.throwRec; b.marginProbe = true; try { b.evaluate(p, sim, target, 0); } catch {} b.marginProbe = false; price = { P: r ? +r.P.toFixed(3) : null, iR: r ? +r.intRisk.toFixed(3) : null, parts: r?.parts ? Object.fromEntries(Object.entries(r.parts).map(([k2, v]) => [k2, +(+(v as number)).toFixed(3)])) : null, T: r?.T !== undefined ? +r.T.toFixed(2) : null, flight: +(rest[0] - sim.t).toFixed(2), decT: r ? +r.t.toFixed(2) : null, margins: b.marginLast ?? [] }; } if (p === sim.qb && !thr) thrDefs = sim.defense.map((d: any) => ({ d, slot: d.slot, zone: d.behavior?.zone ?? d.behavior?.kind ?? null, at: [+(((d.pos.x - sim.los) * dir)).toFixed(1), +(d.pos.y - sim.ballY).toFixed(1)], toT: target ? +Math.hypot(d.pos.x - target.pos.x, d.pos.y - target.pos.y).toFixed(1) : null })); if (p === sim.qb && !thr) thr = { t: +sim.t.toFixed(2), slot: target?.slot ?? null, route: target?.behavior?.route?.id ?? null, back: target?.slot === 'RB', air: intended ? +((intended.x - sim.los) * dir).toFixed(1) : null }; return tb(p, target, v0, intended, ...rest); };
    let res: any; try { res = sim.run(); } catch { continue; }
    const ev = sim.events.map((e: any) => e.type);
    const ie = sim.events.find((e: any) => e.type === 'interception'); const pk = ie ? thrDefs.find((x: any) => x.d.idx === ie.a) : null;
    console.log(JSON.stringify({ concept: id, formation, coverage, roster, seed, offPeek, key, thr, picker: pk ? { slot: pk.slot, zone: pk.zone, at: pk.at, toTarget: pk.toT, pickT: +ie.t.toFixed(2), m: (price?.margins ?? []).find((m: any) => m.slot === pk.slot) ?? 'not counted' } : null, price: price ? { ...price, margins: undefined } : null, cmp: !!res.stats.completed, int: ev.includes('interception'), sack: ev.includes('sack'), yards: res.yards ?? 0 }));
  }
}
