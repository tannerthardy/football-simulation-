// QB lane 2026-11-23 (Rules: the NFL releases a stop route about 0.2 s before the plant; ours at or after it).
// Measurement only. Staged stop-route concepts; the first read that is a stop route (hitch, quick_hitch, curl, hook,
// comeback, stick). From the first tick ready() is true for him, every tick until the throw or 1.2 s: the price's terms
// (pOpen, pClear, pAcc, hands, pick terms), P and pick risk against his bar, his receiver picture's age and the
// window's closer (the defender that sets the contest), and the receiver's true speed (so the plant is known).
//   node --import tsx scripts/diag/eyes/stop-price.ts > rows.jsonl
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const STOP = new Set(['hitch', 'quick_hitch', 'curl', 'hook', 'comeback', 'stick']);
for (const concept of ['curl_flat', 'stick', 'quick_hitch', 'hitch_cross', 'dagger']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4', 'cover6'])
  for (const roster of [2, 5, 9]) for (const seed of [1, 2]) for (const flip of [false, true]) {
    let sim: any;
    try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip })); } catch { continue; }
    let target: any = null, readyAt: number | null = null, thrown: number | null = null, plant: number | null = null, peak = 0;
    const rows: any[] = [];
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (p: any, t: any, ...rest: any[]) => { if (p === sim.qb && thrown === null) thrown = +sim.t.toFixed(2) + (t === target ? 0 : 100); return tb(p, t, ...rest); };
    for (let i = 0; i < 120 && sim.phase === 'live' && thrown === null; i++) {
      sim.tick();
      const b: any = sim.qb.behavior; if (b?.kind !== 'qb-pass' || !b.reads) continue;
      if (!target) target = b.reads.find((r: any) => STOP.has(r.behavior?.route?.id)) ?? null;
      if (!target) break;
      const sp = Math.hypot(target.vel.x, target.vel.y); peak = Math.max(peak, sp);
      if (plant === null && peak > 3 && sp < 0.5 * peak) plant = +sim.t.toFixed(2);
      let ready = false; try { ready = b.ready(target, sim); } catch { /* */ }
      if (ready && readyAt === null) readyAt = sim.t;
      if (readyAt === null || sim.t > readyAt + 1.2) continue;
      b.marginProbe = true; let ev: any = null; try { ev = b.evaluate(sim.qb, sim, target, b.barNow?.u ?? 0); } catch { /* */ } b.marginProbe = false;
      if (!ev) continue;
      const pic = b.receiverForecasts.get(target)?.lastPicture?.();
      const top = (b.marginLast ?? []).slice().sort((p: any, q: any) => (q.contest + 5 * (q.iPath + q.iJump + q.iContest)) - (p.contest + 5 * (p.iPath + p.iJump + p.iContest)))[0];
      rows.push({ t: +sim.t.toFixed(2), sp: +sp.toFixed(2), cur: b.reads[b.readIdx] === target, ph: b.phase, P: +ev.P.toFixed(3), iR: +ev.intRisk.toFixed(4), need: b.barNow?.thr ?? null, risk: b.barNow?.maxInt ?? null,
        parts: Object.fromEntries(Object.entries(ev.parts ?? {}).map(([k, v]: any) => [k, +(+v).toFixed(3)])), picAge: pic ? +(sim.t - pic.sampledAt).toFixed(2) : null,
        closer: top ? { slot: top.slot, contest: top.contest, iPath: top.iPath, dTgt: top.dTgt, blind: top.blind } : null });
    }
    if (target) console.log(JSON.stringify({ concept, coverage, roster, seed, flip, route: target.behavior?.route?.id, expBreak: null, plant, readyAt: readyAt && +readyAt.toFixed(2), thrown, rows }));
  }
