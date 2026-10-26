/**
 * Fatigue probe: pass-rush reps by DT/EDGE against consecutive snaps on the
 * field, measured with the operator of the NFL comparison (BDB 2025 weeks
 * 1–2): peak speed and peak acceleration in the first 1.5 s after the snap,
 * mean speed 2.5–4.0 s, each centred on the player's own mean. Also snap
 * shares by position rank. Writes JSON to out/fatigue/.
 *   node --import tsx scripts/diag/fatigue-probe.ts [seeds=7,8,9,10] [label]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import { fatigueFactor } from '../../src/physics/kinematics.js';

const seeds = (process.argv[2] ?? '7,8,9,10').split(',').map(Number);
const label = process.argv[3] ?? 'probe';
interface Rep { seed: number; id: string; pos: string; streak: number; gameSnap: number; e0: number; ff0: number; v15: number; a15: number; v34: number | null }
const reps: Rep[] = [];
const shares: Record<string, number[]> = {};
const t0 = performance.now();
for (const seed of seeds) {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const team = new Map<string, string>();
  for (const t of [home, away]) for (const p of t.roster) team.set(p.id, t.abbr);
  let drive = '';
  let quarterHalf = 0;
  const last = new Map<string, { drive: string; index: number; streak: number }>();
  const onField = new Map<string, number>();
  const teamSnaps = new Map<string, number>();
  const gameSnap = new Map<string, number>();
  let index = 0;
  const g = simulateGame(home, away, { seed, hooks: {
    playSetup: (setup, ctx) => {
      // Observational: frames only; no physical input changes.
      (setup as { record?: boolean }).record = true;
      const half = ctx.state.quarter <= 2 ? 1 : 2;
      if (ctx.offense !== drive.split(':')[0] || half !== quarterHalf) drive = `${ctx.offense}:${ctx.index}`;
      quarterHalf = half;
      index = ctx.index;
    },
    playResult: (sim) => {
      const start = sim.agents.map((a) => a.body.energy);
      const r = sim.run();
      const def = sim.agents[0] ? team.get(sim.agents.find((a) => a.team === 'D')!.player.id)! : '';
      const off = team.get(sim.agents.find((a) => a.team === 'O')!.player.id)!;
      teamSnaps.set(`${off}:O`, (teamSnaps.get(`${off}:O`) ?? 0) + 1);
      teamSnaps.set(`${def}:D`, (teamSnaps.get(`${def}:D`) ?? 0) + 1);
      const frames = r.frames ?? [];
      sim.agents.forEach((a, k) => {
        const id = a.player.id;
        onField.set(`${team.get(id)}:${a.team}:${a.player.position}:${id}`, (onField.get(`${team.get(id)}:${a.team}:${a.player.position}:${id}`) ?? 0) + 1);
        const prev = last.get(id);
        const streak = prev && prev.drive === drive && prev.index === index - 1 ? prev.streak + 1 : 1;
        last.set(id, { drive, index, streak });
        const n = (gameSnap.get(id) ?? 0) + 1;
        gameSnap.set(id, n);
        if (a.team !== 'D' || sim.offCall.kind !== 'pass' || !['DT', 'EDGE'].includes(a.player.position)) return;
        // 10 Hz speeds and accelerations from recorded positions.
        const pts = frames.filter((f) => f.t >= -1e-9).map((f) => ({ t: f.t, x: f.agents[3 * k], y: f.agents[3 * k + 1] }));
        const sp: { t: number; s: number }[] = [];
        for (let j = 2; j < pts.length; j += 2) sp.push({ t: pts[j].t, s: Math.hypot(pts[j].x - pts[j - 2].x, pts[j].y - pts[j - 2].y) / (pts[j].t - pts[j - 2].t) });
        const ac: { t: number; a: number }[] = [];
        for (let j = 1; j < sp.length; j++) ac.push({ t: sp[j].t, a: Math.abs(sp[j].s - sp[j - 1].s) / (sp[j].t - sp[j - 1].t) });
        const early = sp.filter((s) => s.t <= 1.5), mid = sp.filter((s) => s.t >= 2.5 && s.t <= 4.0);
        if (!early.length) return;
        reps.push({ seed, id, pos: a.player.position, streak, gameSnap: n, e0: start[k], ff0: fatigueFactor(start[k]),
          v15: Math.max(...early.map((s) => s.s)), a15: Math.max(0, ...ac.filter((s) => s.t <= 1.5).map((s) => s.a)),
          v34: mid.length ? mid.reduce((s, m) => s + m.s, 0) / mid.length : null });
      });
      return r;
    },
  } });
  console.error(`seed ${seed}: ${g.score.home}-${g.score.away}`);
  // Snap share by position rank within each team-side.
  const groups = new Map<string, number[]>();
  for (const [key, n] of onField) {
    const [abbr, side, pos] = key.split(':');
    const g = `${abbr}:${side}:${pos}`;
    (groups.get(g) ?? groups.set(g, []).get(g)!).push(n / teamSnaps.get(`${abbr}:${side}`)!);
  }
  for (const [g, v] of groups) {
    const pos = g.split(':')[2];
    v.sort((x, y) => y - x).forEach((s, rank) => (shares[`${pos}#${rank + 1}`] ??= []).push(s));
  }
}
const seconds = (performance.now() - t0) / 1000;

function centred(field: 'v15' | 'a15' | 'v34' | 'ff0') {
  const by = new Map<string, number[]>();
  for (const r of reps) if (r[field] != null) (by.get(r.id) ?? by.set(r.id, []).get(r.id)!).push(r[field] as number);
  const mean = new Map([...by].map(([id, v]) => [id, v.reduce((s, x) => s + x, 0) / v.length]));
  return (r: Rep) => (r[field] == null ? null : (r[field] as number) - mean.get(r.id)!);
}
const bins: [string, (n: number) => boolean][] = [['1-2', (n) => n <= 2], ['3-4', (n) => n >= 3 && n <= 4], ['5-6', (n) => n >= 5 && n <= 6], ['7+', (n) => n >= 7]];
const table = bins.map(([name, inBin]) => {
  const rs = reps.filter((r) => inBin(r.streak));
  const avg = (f: 'v15' | 'a15' | 'v34' | 'ff0') => { const c = centred(f); const v = rs.map(c).filter((x): x is number => x != null); return v.length ? +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(3) : null; };
  return { streak: name, n: rs.length, v15: avg('v15'), a15: avg('a15'), v34: avg('v34'), ff0: avg('ff0') };
});
// Within-player slope per consecutive snap (centred least squares, one regressor).
function slope(field: 'v15' | 'a15' | 'v34' | 'ff0') {
  const cy = centred(field);
  const by = new Map<string, number[]>();
  for (const r of reps) (by.get(r.id) ?? by.set(r.id, []).get(r.id)!).push(r.streak);
  const mx = new Map([...by].map(([id, v]) => [id, v.reduce((s, x) => s + x, 0) / v.length]));
  let sxy = 0, sxx = 0;
  for (const r of reps) { const y = cy(r); if (y == null) continue; const x = r.streak - mx.get(r.id)!; sxy += x * y; sxx += x * x; }
  return +(sxy / sxx).toFixed(4);
}
const mean = (f: 'v15' | 'a15' | 'v34') => { const v = reps.map((r) => r[f]).filter((x): x is number => x != null); return +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(2); };
const shareTable = Object.fromEntries(Object.entries(shares).filter(([k]) => +k.split('#')[1] <= 3)
  .map(([k, v]) => [k, +[...v].sort((x, y) => x - y)[Math.floor(v.length / 2)].toFixed(2)]).sort());
const out = { label, seeds, seconds: +seconds.toFixed(1), reps: reps.length, means: { v15: mean('v15'), a15: mean('a15'), v34: mean('v34') },
  slopePerConsecutiveSnap: { v15: slope('v15'), a15: slope('a15'), v34: slope('v34'), ff0: slope('ff0') }, byStreak: table,
  minEnergyAtSnap: +Math.min(...reps.map((r) => r.e0)).toFixed(3), shareMedianByRank: shareTable };
mkdirSync('out/fatigue', { recursive: true });
writeFileSync(`out/fatigue/probe-${label}.json`, JSON.stringify({ ...out, repsRaw: reps }));
console.log(JSON.stringify(out, null, 1));
