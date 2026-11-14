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
const BREAKS = process.env.BREAKS === '1'; // also dump 10 Hz paths for route_break.py (same operator as the NFL), to BREAKS_OUT
const WANT = new Set(process.env.WANT ? process.env.WANT.split(',') : ['go', 'cross', 'dig', 'short_in']);
const CONCEPTS = process.env.CONCEPTS ? process.env.CONCEPTS.split(',') : ['y_cross', 'levels'];
const med = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : NaN; };
const paths: any[] = []; const corners: any[] = []; // per declared waypoint: closest approach, side, speed (BREAKS=1)
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
  const rec = new Map<any, { mind: number; x0: number; id: string; sp: Record<string, number>; y0: number; path: number; last: any; hips: number[]; slotName: string; depth3?: number; lat3?: number }>();
  for (const { a, id } of targets) rec.set(a, { mind: 99, x0: a.pos.x, id: id!, sp: {}, y0: a.pos.y, path: 0, last: { ...a.pos }, hips: [], slotName: a.slot });
  const tracks = new Map<any, number[][]>(); const T_END = BREAKS ? 4.6 : 3.6;
  const wps = new Map<any, { p: { x: number; y: number }; s: number; best: number; side: number; v: number; vIn: number; t: number }[]>();
  while (sim.phase !== 'dead' && sim.t < T_END) {
    sim.tick();
    if (BREAKS && Math.abs(sim.t - Math.round(sim.t * 10) / 10) < sim.dt / 2 + 1e-9) for (const [a] of rec) { const L = tracks.get(a) ?? []; tracks.set(a, L); const k = Math.round(sim.t * 10); if (!L.length || L[L.length - 1][0] < k) L.push([k, a.pos.x - 40, a.pos.y]); }
    if (BREAKS) for (const [a] of rec) {
      const rr = a.behavior?.fallback ?? a.behavior, path = rr?.path as { p: { x: number; y: number }; s: number; ext?: boolean }[] | undefined;
      if (!path) continue;
      if (!wps.has(a)) wps.set(a, path.filter((q) => !q.ext).map((q) => ({ p: { ...q.p }, s: q.s, best: 1e9, side: 0, v: 0, vIn: 0, t: 0 })));
      const L = wps.get(a)!, sp = Math.hypot(a.vel.x, a.vel.y);
      L.forEach((w, i) => { const d = Math.hypot(a.pos.x - w.p.x, a.pos.y - w.p.y); if (d < w.best && i < L.length - 1) { const prev = i ? L[i - 1].p : { x: rec.get(a)!.x0, y: rec.get(a)!.y0 }, nx = L[i + 1].p; const ux = w.p.x - prev.x, uy = w.p.y - prev.y, vx = nx.x - w.p.x, vy = nx.y - w.p.y; const turn = Math.sign(ux * vy - uy * vx) || 1; const off = (a.pos.x - w.p.x) * -uy + (a.pos.y - w.p.y) * ux; w.best = d; w.side = Math.sign(off * turn) * 1; w.v = sp; w.t = sim.t; } });
    }
    if (sim.t <= 1.0) for (const [a, r] of rec) for (const d of sim.defense) r.mind = Math.min(r.mind, Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y));
    for (const [a, r] of rec) {
      const sp = Math.hypot(a.vel.x, a.vel.y);
      r.path += Math.hypot(a.pos.x - r.last.x, a.pos.y - r.last.y); r.last = { ...a.pos };
      if (sp > 2 && sim.t > 0.5 && sim.t < 3) { let d = a.body.facing - Math.atan2(a.vel.y, a.vel.x); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; r.hips.push(Math.abs(d) * 180 / Math.PI); }
      for (const t of TS) if (Math.abs(sim.t - t) < sim.dt / 2 + 1e-9 && r.sp[String(t)] === undefined) r.sp[String(t)] = sp;
      if (Math.abs(sim.t - 3) < sim.dt / 2 + 1e-9) { r.depth3 = a.pos.x - 40; r.lat3 = Math.abs(a.pos.y - r.y0); }
    }
  }
  if (BREAKS) for (const [a, r] of rec) { const L = wps.get(a) ?? []; L.forEach((w, i) => { if (i < L.length - 1 && w.best < 1e8) corners.push({ route: r.id, i, of: L.length, miss: w.best, side: w.side, v: w.v, s: w.s, t: w.t }); }); }
  if (BREAKS) for (const [a, r] of rec) paths.push({ route: r.id, x0: r.x0, y0: r.y0, wp: (wps.get(a) ?? []).map((w) => [w.p.x - 40, w.p.y, w.s]), tr: (tracks.get(a) ?? []).map(([k, x, y]) => [k / 10, x, y]) });
  for (const [a, r] of rec) rows.push({ concept, seed, id: r.id, pos: a.player.position, mind1: r.mind, slot: r.slotName, sp: r.sp, depth3: r.depth3, lat3: r.lat3, path3: r.path, hips: r.hips.length ? r.hips.sort((x, y) => x - y)[r.hips.length >> 1] : null, vmax: a.body.profile.vmax, tau: a.body.profile.tau });
}
if (process.env.BYPOS === '1') for (const id of [...WANT]) for (const pos of ['WR', 'TE', 'RB']) for (const free of [true, false]) {
  const V = rows.filter((r) => r.id === id && r.pos === pos && (r.mind1 >= 1.5) === free); if (V.length < 5) continue;
  console.log(`  ${id.padEnd(8)} ${pos} ${free ? 'free     ' : 'contested'} n ${String(V.length).padStart(3)} | ${TS.map((t) => med(V.map((r) => r.sp[String(t)])).toFixed(2)).join(' / ')} | depth ${med(V.map((r) => r.depth3)).toFixed(1)} | vmax ${med(V.map((r) => r.vmax)).toFixed(2)}`);
}
if (process.argv[4]) writeFileSync(process.argv[4], JSON.stringify(rows));
if (BREAKS && process.env.BREAKS_OUT) { writeFileSync(process.env.BREAKS_OUT, JSON.stringify(paths)); writeFileSync(process.env.BREAKS_OUT.replace('.json', '.corners.json'), JSON.stringify(corners)); }
console.log(`defense ${defName}; env LINE_START=${process.env.LINE_START ?? 'on'} ROUTE_CRAFT=${process.env.ROUTE_CRAFT ?? 'on'} SAMEBODY=${process.env.SAMEBODY ?? 0} DIAG=${['DIAG_EFFORT', 'DIAG_THROUGH', 'DIAG_SEEK', 'DIAG_NOGETOFF'].map((k) => `${k}=${process.env[k] ?? 0}`).join(' ')}`);
console.log('speed (yd/s, median) at ' + TS.join(' / ') + ' s | depth at 3 s | lateral at 3 s | path in 3.5 s | hips off the path (deg)');
for (const id of [...WANT]) {
  const V = rows.filter((r) => r.id === id); if (!V.length) continue;
  console.log(`  ${id.padEnd(9)} n ${String(V.length).padStart(3)} | ${TS.map((t) => med(V.map((r) => r.sp[String(t)])).toFixed(2)).join(' / ')} | depth ${med(V.map((r) => r.depth3)).toFixed(1)} | lateral ${med(V.map((r) => r.lat3)).toFixed(1)} | path ${med(V.map((r) => r.path3)).toFixed(1)} | hips ${med(V.map((r) => r.hips)).toFixed(0)} | vmax ${med(V.map((r) => r.vmax)).toFixed(2)} tau ${med(V.map((r) => r.tau)).toFixed(2)}`);
}
