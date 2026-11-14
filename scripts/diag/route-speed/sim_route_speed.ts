/** Route-runner speed by time since the snap in the sim, ball held: GO, CROSS, DIG (and any route named in WANT), with defenders
 * (cover 3 zone, cover 1 man) or with none (defenders parked far away and inert). Read-only tap on PlaySim.tick.
 *   [LINE_START=0] [ROUTE_CRAFT=0] [DIAG_...] node --import tsx scripts/diag/route-speed/sim_route_speed.ts [N=24] [defense=cover3|cover1|none] [out.json] */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 24), defName = process.argv[3] ?? 'cover3';
const TS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
const WANT = new Set(['go', 'cross', 'dig', 'short_in']);
const CONCEPTS = ['y_cross', 'levels'];
const rows: any[] = [];
for (const concept of CONCEPTS) for (let seed = 1; seed <= N; seed++) {
  const offense = generateTeam(new Rng(51), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(52), 'D', 'DEF', { strength: .55 });
  const cov = COVERAGE_BY_ID[defName === 'none' ? 'cover3' : defName];
  const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID[concept], label: concept },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: cov, pressure: null, zoneStyle: 'spot', label: defName },
    los: 40, ballY: 26, firstDownX: 50, seed, stagedThrow: { at: 6, slot: 'X' } } as never);
  if (defName === 'none') for (const d of sim.defense) { d.body.pos = { x: 8, y: 4 }; d.body.vel = { x: 0, y: 0 }; d.snapReadyAt = 1e9; }
  if (process.env.SAMEBODY === '1') { const g = sim.offense.find((a: any) => (a.behavior?.fallback?.route ?? a.behavior?.route)?.id === 'go'); if (g) for (const a of sim.offense) { const id = (a.behavior?.fallback?.route ?? a.behavior?.route)?.id; if (id && id !== 'go' && WANT.has(id)) { a.body.profile = g.body.profile; } } }
  const targets = sim.offense.map((a: any) => ({ a, id: (a.behavior?.fallback?.route ?? a.behavior?.route)?.id as string | undefined })).filter((o: any) => o.id && WANT.has(o.id));
  const rec = new Map<any, { id: string; sp: Record<string, number>; y0: number; path: number; last: any; hips: number[]; slotName: string; depth3?: number; lat3?: number }>();
  for (const { a, id } of targets) rec.set(a, { id: id!, sp: {}, y0: a.pos.y, path: 0, last: { ...a.pos }, hips: [], slotName: a.slot });
  while (sim.phase !== 'dead' && sim.t < 3.6) {
    sim.tick();
    for (const [a, r] of rec) {
      const sp = Math.hypot(a.vel.x, a.vel.y);
      r.path += Math.hypot(a.pos.x - r.last.x, a.pos.y - r.last.y); r.last = { ...a.pos };
      if (sp > 2 && sim.t > 0.5 && sim.t < 3) { let d = a.body.facing - Math.atan2(a.vel.y, a.vel.x); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; r.hips.push(Math.abs(d) * 180 / Math.PI); }
      for (const t of TS) if (Math.abs(sim.t - t) < sim.dt / 2 + 1e-9 && r.sp[String(t)] === undefined) r.sp[String(t)] = sp;
      if (Math.abs(sim.t - 3) < sim.dt / 2 + 1e-9) { r.depth3 = a.pos.x - 40; r.lat3 = Math.abs(a.pos.y - r.y0); }
    }
  }
  for (const [a, r] of rec) rows.push({ concept, seed, id: r.id, slot: r.slotName, sp: r.sp, depth3: r.depth3, lat3: r.lat3, path3: r.path, hips: r.hips.length ? r.hips.sort((x, y) => x - y)[r.hips.length >> 1] : null, vmax: a.profile.vmax, tau: a.profile.tau });
}
if (process.argv[4]) writeFileSync(process.argv[4], JSON.stringify(rows));
const med = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : NaN; };
console.log(`defense ${defName}; env LINE_START=${process.env.LINE_START ?? 'on'} ROUTE_CRAFT=${process.env.ROUTE_CRAFT ?? 'on'} SAMEBODY=${process.env.SAMEBODY ?? 0} DIAG=${['DIAG_EFFORT', 'DIAG_THROUGH', 'DIAG_SEEK', 'DIAG_NOGETOFF'].map((k) => `${k}=${process.env[k] ?? 0}`).join(' ')}`);
console.log('speed (yd/s, median) at ' + TS.join(' / ') + ' s | depth at 3 s | lateral at 3 s | path in 3.5 s | hips off the path (deg)');
for (const id of ['go', 'cross', 'dig', 'short_in']) {
  const V = rows.filter((r) => r.id === id); if (!V.length) continue;
  console.log(`  ${id.padEnd(9)} n ${String(V.length).padStart(3)} | ${TS.map((t) => med(V.map((r) => r.sp[String(t)])).toFixed(2)).join(' / ')} | depth ${med(V.map((r) => r.depth3)).toFixed(1)} | lateral ${med(V.map((r) => r.lat3)).toFixed(1)} | path ${med(V.map((r) => r.path3)).toFixed(1)} | hips ${med(V.map((r) => r.hips)).toFixed(0)} | vmax ${med(V.map((r) => r.vmax)).toFixed(2)} tau ${med(V.map((r) => r.tau)).toFixed(2)}`);
}
