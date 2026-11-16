// SET_SPOT=1 SET_SPOT_TACKLE=1 POCKET_LEVEL=1 [POCKET_DROP=1] node --import tsx scripts/diag/escape/long-hold-climb.ts
// Integration (2026-11-16), Flex's long-hold measurement: on plays he still holds at 3.0 s (Flex's long-hold-pocket.mts
// panel), what moves him forward after 2.0 s. Each tick his command is charged to the method of his that produced it
// (the last of pocketMove / setDecide / climb / evade / whileLooking / noThrow / extend ... entered this tick), and for
// pocketMove whether its edge test fired (his home moved up 1.8 + 1.2 pp yd) or its drift from felt bodies pushed him.
// His forward displacement 2.0-3.5 s is summed by source. Also the space in front when he steps (nearest body, either
// team, within 30 deg of straight ahead, in his pictures for defenders). Passive wrappers.
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const METHODS = ['pocketMove', 'setDecide', 'climb', 'evade', 'whileLooking', 'noThrow', 'extend', 'scramble', 'outTick', 'startIfFinish'];
const by: Record<string, number> = {}, ticks: Record<string, number> = {}; let plays = 0; const fronts: number[] = [];
for (const concept of ['four_verts', 'smash', 'dagger', 'curl_flat', 'flood']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4'])
  for (let roster = 1; roster <= 8; roster++) for (const seed of [1, 2]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team), rows: { t: number; dx: number; src: string; front: number }[] = [];
    let qb: any = null, src = '-';
    while (sim.phase === 'live' && sim.t < 3.6) {
      const b: any = sim.qb.behavior;
      if (b?.kind === 'qb-pass' && b !== qb) {
        qb = b;
        for (const m of METHODS) if (typeof b[m] === 'function') { const f = b[m].bind(b); b[m] = (...args: any[]) => { const prev = src; src = m; const r = f(...args); if (m === 'pocketMove') {
          const a = args[0], pp = a.r('pocketPresence'); let edge = false;
          for (const d of sim.defense) { if (d.isDown(sim.t)) continue; const s = b.felt(a, sim, d).pos, dx = a.pos.x - s.x, dy = a.pos.y - s.y, dd = Math.hypot(dx, dy); if (Math.abs(dy) > 1.6 && s.x <= a.pos.x + 1.5 && dd < 2.5 + 3 * pp) edge = true; }
          src = edge ? 'pocketMove:edge' : 'pocketMove:home'; } else if (r === null || r === undefined) src = prev; return r; }; }
      }
      src = '-'; const x0 = sim.qb.pos.x, t0 = sim.t; sim.tick();
      if (sim.throwAt >= 0 || sim.carrier !== sim.qb) break;
      // Space in front: the nearest body ahead within 30 deg of straight ahead.
      let front = 99; for (const o of [...sim.offense, ...sim.defense]) { if (o === sim.qb) continue; const dx = (o.pos.x - sim.qb.pos.x) * dir, dy = o.pos.y - sim.qb.pos.y; if (dx > 0 && Math.abs(Math.atan2(dy, dx)) < Math.PI / 6) front = Math.min(front, Math.hypot(dx, dy)); }
      rows.push({ t: t0, dx: (sim.qb.pos.x - x0) * dir, src, front });
    }
    if (!rows.some((r) => r.t >= 3.0)) continue;
    plays++;
    for (const r of rows) if (r.t >= 2.0 && r.t < 3.5) { by[r.src] = (by[r.src] ?? 0) + r.dx; ticks[r.src] = (ticks[r.src] ?? 0) + 1; if (r.dx > 0.02) fronts.push(r.front); }
  }
console.log(`long holds (ball held at 3.0 s): ${plays}`);
const tot = Object.values(by).reduce((s, v) => s + v, 0);
for (const [k, v] of Object.entries(by).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(18)} forward ${(v / plays).toFixed(2)} yd a play  (${ticks[k]} ticks)`);
console.log(`  total forward 2.0-3.5 s: ${(tot / plays).toFixed(2)} yd a play`);
fronts.sort((a, b) => a - b); const q = (p: number) => fronts[Math.floor(p * (fronts.length - 1))];
console.log(`  space in front on a forward tick (nearest body ahead, yd): p25 ${q(0.25)?.toFixed(1)} p50 ${q(0.5)?.toFixed(1)} p75 ${q(0.75)?.toFixed(1)}`);
