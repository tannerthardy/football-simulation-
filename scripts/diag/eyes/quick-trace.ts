// QB lane 2026-11-18 (Integration: why the quick game is not thrown on time). slant_flat x doubles / trips x 7 zone
// shells x 3 rosters x 3 seeds x flip, READ_WINDOW as set. Per read visit (the ticks his read index is on it, once
// set): ready ticks, his best P against his bar, pick risk against his max, whether the footwork step allowed it, the
// cause it was not thrown, and the defenders closing the window most at his best look (marginProbe: slot, depth, margin).
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover2', 'cover2_match', 'cover3', 'cover3_match', 'cover4', 'cover6', 'tampa2'])
  for (const roster of [3, 7, 11]) for (const seed of [1, 2, 3]) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept: process.env.QC ?? 'slant_flat', seed, roster, formation, flip })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team);
    const visits: any[] = []; let cur: any = null, thrown: any = null;
    for (let i = 0; i < 160 && sim.phase === 'live'; i++) {
      const was = sim.ball.kind; sim.tick();
      if (!thrown && was !== 'air' && sim.ball.kind === 'air') thrown = { t: +sim.t.toFixed(2), slot: sim.ball.target?.slot ?? null };
      const b: any = sim.qb.behavior;
      if (thrown || b?.kind !== 'qb-pass' || sim.carrier !== sim.qb || b.setAt < 0 || !b.reads) continue;
      const r = b.reads[b.readIdx] ?? null;
      if (!r) continue;
      if (!cur || cur.r !== r) { cur = { r, slot: r.slot, route: r.behavior?.route?.id, idx: b.readIdx, from: +sim.t.toFixed(2), to: 0, ticks: 0, ready: 0, best: null as any, stepBlocked: 0, riskBlocked: 0 }; visits.push(cur); }
      cur.to = +sim.t.toFixed(2); cur.ticks++;
      const u = b.barNow?.u ?? 0, need = b.barNow?.thr ?? 0.5, risk = b.barNow?.maxInt ?? 0.05;
      let ready = false; try { ready = b.ready(r, sim); } catch {}
      if (!ready) continue;
      cur.ready++;
      b.marginProbe = true; let ev: any = null; try { ev = b.evaluate(sim.qb, sim, r, u); } catch {} b.marginProbe = false;
      if (!ev) continue;
      const step = (() => { try { return b.onStep(sim.qb, r, u, sim.t); } catch { return true; } })();
      if (ev.P >= need && ev.intRisk <= risk && !step) cur.stepBlocked++;
      if (ev.P >= need && ev.intRisk > risk) cur.riskBlocked++;
      if (!cur.best || ev.P > cur.best.P) cur.best = { t: +sim.t.toFixed(2), P: +ev.P.toFixed(2), need: +need.toFixed(2), iR: +ev.intRisk.toFixed(3), risk: +risk.toFixed(3), parts: ev.parts && Object.fromEntries(Object.entries(ev.parts).map(([k, v]: any) => [k, +(+v).toFixed(3)])),
        margins: (b.marginLast ?? []).slice().sort((x: any, y: any) => x.m - y.m).slice(0, 2).map((m: any) => { const d = sim.defense.find((q: any) => q.slot === m.slot); return { slot: m.slot, m: m.m, depth: d ? +((d.pos.x - sim.los) * dir).toFixed(1) : null }; }) };
    }
    let res: any; try { res = sim.run(); } catch { continue; }
    const ev = sim.events as any[];
    console.log(JSON.stringify({ key: [formation, coverage, roster, seed, flip].join('|'), thrown, throwaway: ev.some((e) => e.type === 'throwaway'), sack: ev.some((e) => e.type === 'sack'), cmp: !!sim.stats.completed,
      visits: visits.map(({ r, ...v }) => ({ ...v, cause: v.ready === 0 ? 'not-ready' : v.stepBlocked > 0 ? 'step' : v.riskBlocked > 0 ? 'risk' : v.best && v.best.P < v.best.need ? 'price' : 'other' })) }));
  }
