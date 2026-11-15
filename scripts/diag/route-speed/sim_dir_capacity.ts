/** Speed capacity by the angle between the torso and the direction of travel for zone defenders (DB) with the ball held, in the sim: the same operator as
 * nfl_dir_capacity.py (angle folded to 0..180 in 15-degree bins, speed over his own p98, top decile per bin). Both the hips (`facing`) and the shoulders
 * (`facing + trunk`) are binned: BDB's `o` is the shoulders. Samples at 10 Hz from 0.5 s after the snap to the release, speed >= 1 yd/s.
 *   [FLAGS=...] node --import tsx scripts/diag/route-speed/sim_dir_capacity.ts [seeds=6] [out.json] */
import { writeFileSync } from 'node:fs';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const N = Number(process.argv[2] ?? 6);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const frames = new Map<string, { s: number; hip: number; sh: number }[]>(), all = new Map<string, number[]>();
let plays = 0;
for (const concept of ['curl_flat', 'four_verts', 'y_cross', 'smash', 'flood', 'mesh', 'stick', 'comebacks'])
  for (const cov of ['cover3', 'cover2', 'cover4', 'cover6']) for (let seed = 1; seed <= N; seed++) {
    if (!COVERAGE_BY_ID[cov] || !PASS_BY_ID[concept]) continue;
    const offense = generateTeam(new Rng(61), 'O', 'OFF', { strength: .55 }), defense = generateTeam(new Rng(62), 'D', 'DEF', { strength: .55 });
    const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: seed % 2 === 0, kind: 'pass', pass: PASS_BY_ID[concept], label: concept },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, zoneStyle: 'spot', label: cov }, los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
    plays++; const tick = sim.tick.bind(sim); let last = -1;
    sim.tick = () => { tick();
      if (sim.phase !== 'live' || sim.ball?.kind === 'air' || sim.t < 0.5) return;
      if (Math.floor(sim.t * 10 + 1e-6) === last) return; last = Math.floor(sim.t * 10 + 1e-6);
      for (const a of sim.defense) { if (!['CB', 'FS', 'SS', 'S', 'DB'].includes(a.profile?.position ?? a.player?.position ?? '')) continue;
        const s = Math.hypot(a.vel.x, a.vel.y); const key = `${plays}:${a.idx}`;
        (all.get(key) ?? all.set(key, []).get(key)!).push(s);
        if (s < 1) continue;
        const h = Math.atan2(a.vel.y, a.vel.x), hip = a.body.facing, sh = a.body.trunk ? a.body.facing + a.body.trunk : a.body.facing;
        (frames.get(key) ?? frames.set(key, []).get(key)!).push({ s, hip: Math.abs(wrap(hip - h)) * 180 / Math.PI, sh: Math.abs(wrap(sh - h)) * 180 / Math.PI }); } };
    sim.run();
  }
// per player p98: pooled over the same body across plays is not possible (new teams per call share rosters): key by roster slot instead
const bySlot = new Map<string, number[]>(), fr = new Map<string, { s: number; hip: number; sh: number }[]>();
for (const [k, v] of all) { const slot = k.split(':')[1]; (bySlot.get(slot) ?? bySlot.set(slot, []).get(slot)!).push(...v); }
for (const [k, v] of frames) { const slot = k.split(':')[1]; (fr.get(slot) ?? fr.set(slot, []).get(slot)!).push(...v); }
const bins = { hip: new Map<number, number[]>(), sh: new Map<number, number[]>() };
for (const [slot, F] of fr) { const v = (bySlot.get(slot) ?? []).sort((a, b) => a - b); if (v.length < 200) continue; const p98 = v[Math.floor(0.98 * (v.length - 1))];
  for (const f of F) for (const k of ['hip', 'sh'] as const) { const b = Math.min(11, Math.floor(f[k] / 15)); (bins[k].get(b) ?? bins[k].set(b, []).get(b)!).push(f.s / p98); } }
const res: any = {};
for (const k of ['hip', 'sh'] as const) { res[k] = {}; console.log(`-- sim, angle of the ${k === 'hip' ? 'hips (facing)' : 'shoulders (facing + trunk)'} off travel; ${plays} plays`);
  for (let b = 0; b < 12; b++) { const v = (bins[k].get(b) ?? []).sort((x, y) => x - y); if (v.length < 50) continue;
    const r = { lo: b * 15, n: v.length, p50: v[v.length >> 1], p90: v[Math.floor(0.9 * (v.length - 1))] }; res[k][b] = r;
    console.log(`  ${String(r.lo).padStart(3)}-${String(r.lo + 15).padStart(3)} deg  n ${String(r.n).padStart(6)}  median ${r.p50.toFixed(2)}  top-decile ${r.p90.toFixed(2)}`); } }
if (process.argv[3]) writeFileSync(process.argv[3], JSON.stringify(res));
