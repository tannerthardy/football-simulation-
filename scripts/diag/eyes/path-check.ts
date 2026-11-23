// QB lane 2026-11-23 (Integration: the targeted path-term check). Measurement only. Staged plays; the first read that is
// a stop route (hitch, quick_hitch, curl, hook, comeback, stick) or an out (out, quick_out). Every tick from 0.6 s to the
// throw (or the break + 0.8 s): his price of a throw to him now (P, pick risk, the terms) and the window's per-defender
// rows (marginLast); every defender's truth (pos, vel, coverage role) and the passer's picture of him (mind.estimate);
// the receiver's truth. The break (plant on a stop, sharpest turn on an out) is found afterwards on the receiver's track,
// and the tick 0.3 s before it is the one reported. On plays thrown to him: the windup start, the release, and for the
// defender nearest the catch point at the release, the first tick his velocity turns toward the catch point.
//   node --import tsx scripts/diag/eyes/path-check.ts > rows.jsonl
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const STOP = new Set(['hitch', 'quick_hitch', 'curl', 'hook', 'comeback', 'stick']), OUT = new Set(['out', 'quick_out']);
const v2 = (p: any) => ({ x: +p.x.toFixed(2), y: +p.y.toFixed(2) });
for (const concept of ['curl_flat', 'stick', 'quick_hitch', 'quick_outs', 'hitch_out', 'double_outs', 'smash', 'dagger']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4'])
  for (const roster of [2, 7]) for (const seed of [1, 2]) for (const flip of [false, true]) {
    let sim: any;
    try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip })); } catch { continue; }
    let target: any = null, decision: number | null = null, release: number | null = null, catchPt: any = null;
    const track: any[] = [], ticks: any[] = [], dtrack: Record<string, any[]> = {};
    let hooked = false;
    for (let i = 0; i < 140 && sim.phase === 'live'; i++) {
      const b0: any = sim.qb.behavior;
      if (!hooked && b0?.kind === 'qb-pass') {
        hooked = true;
        const st = b0.startThrow.bind(b0); b0.startThrow = (a: any, s: any, ev: any) => { if (decision === null && ev.target === target) decision = +s.t.toFixed(2); return st(a, s, ev); };
        const tb = sim.throwBall.bind(sim);
        sim.throwBall = (p: any, t: any, v0: any, intended: any, ...rest: any[]) => { if (p === sim.qb && release === null) { release = +sim.t.toFixed(2) + (t === target ? 0 : 100); if (t === target && intended) catchPt = v2(intended); } return tb(p, t, v0, intended, ...rest); };
      }
      sim.tick();
      const b: any = sim.qb.behavior; if (b?.kind !== 'qb-pass' || !b.reads) continue;
      if (!target) target = b.reads.find((r: any) => STOP.has(r.behavior?.route?.id) || OUT.has(r.behavior?.route?.id)) ?? null;
      if (!target) break;
      track.push({ t: +sim.t.toFixed(2), p: v2(target.pos), v: v2(target.vel) });
      if (decision !== null && (release === null || sim.t <= (release % 100) + 1.0)) for (const d of sim.defense) (dtrack[d.slot] ??= []).push({ t: +sim.t.toFixed(2), p: v2(d.pos), v: v2(d.vel) });
      if (release !== null || sim.t < 0.6 || sim.ball.kind !== 'held' || i % 2) continue;
      b.marginProbe = true; let ev: any = null; try { ev = b.evaluate(sim.qb, sim, target, b.barNow?.u ?? 0); } catch { /* */ } b.marginProbe = false;
      if (!ev) continue;
      const defs = sim.defense.map((d: any) => { const e = b.mind.estimate(d); const db: any = d.behavior;
        return { slot: d.slot, p: v2(d.pos), v: v2(d.vel), seen: v2(e.pos), seenV: v2(e.vel), kind: db?.kind ?? null, man: db?.kind === 'man' ? db.target?.slot ?? null : null, zone: db?.zone ?? null }; });
      ticks.push({ t: +sim.t.toFixed(2), qb: v2(sim.qb.pos), P: +ev.P.toFixed(3), iR: +ev.intRisk.toFixed(4), need: b.barNow?.thr ?? null, risk: b.barNow?.maxInt ?? null,
        point: v2(ev.point), parts: Object.fromEntries(Object.entries(ev.parts ?? {}).map(([k, v]: any) => [k, +(+v).toFixed(3)])),
        rows: (b.marginLast ?? []).map((r: any) => ({ slot: r.slot, m: r.m, contest: r.contest, iPath: r.iPath, iJump: r.iJump, iContest: r.iContest, blind: r.blind, react: r.react, dTgt: r.dTgt, closeState: r.closeState ?? null, touch: r.touch })),
        recv: { p: v2(target.pos), v: v2(target.vel) }, defs });
    }
    if (!target) continue;
    console.log(JSON.stringify({ concept, coverage, roster, seed, flip, route: target.behavior?.route?.id, slot: target.slot, cls: STOP.has(target.behavior?.route?.id) ? 'stop' : 'out',
      dir: sim.attackDir(sim.offense[0].team), decision, release, catchPt, track, ticks, dtrack }));
  }
