// Staged rally to a checkdown against Cover 2 (Coverage C14, 2026-11-24): for every catch by the back, each defender's
// distance to him at the catch, when his FLIGHT_BREAK began relative to the release and on what cue (his release
// belief's source), and when he first came within 1 yd of the catcher after the catch; the YAC.
//   [flags] node --import tsx scripts/diag/coverage/c2-rally-stage.mts [seeds] [concept] [coverage] [catcherSlot]
const W = process.cwd();
import { readFileSync } from 'node:fs';
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const N = Number(process.argv[2] ?? 30), concept = process.argv[3] ?? 'four_verts', coverage = process.argv[4] ?? 'cover2', who = process.argv[5] ?? 'RB';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { flightBreakOf } = await import(`${W}/src/sim/behaviors/defense.ts`);
const { lastReleaseBelief } = await import(`${W}/src/sim/release-belief.ts`);
const firsts: Record<string, number[]> = {}; const yac: number[] = []; const firstT: number[] = [];
for (let seed = 1; seed <= N; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ concept, coverage, seed, roster: 3, formation: 'gun_doubles_11', flip: false }));
  let rel: number | null = null, tc: number | null = null, catcher: any = null; const brk = new Map<any, any>(); const atCatch = new Map<any, number>() as Map<any, any>; const touch = new Map<any, number>() as Map<any, any>;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    if (rel === null && sim.ball?.kind === 'air') rel = sim.t;
    if (rel !== null) for (const d of sim.defense) { const fb = flightBreakOf(d); if (fb && !brk.has(d)) brk.set(d, { since: fb.since, src: lastReleaseBelief(sim, d)?.source ?? null }); }
    if (tc === null && sim.ball?.kind === 'held' && sim.ball.carrier !== sim.qb && sim.ball.carrier.team === 'O' && rel !== null) {
      tc = sim.t; catcher = sim.ball.carrier; for (const d of sim.defense) atCatch.set(d, Math.hypot(d.pos.x - catcher.pos.x, d.pos.y - catcher.pos.y)); }
    if (tc !== null && catcher) for (const d of sim.defense) if (!touch.has(d) && Math.hypot(d.pos.x - catcher.pos.x, d.pos.y - catcher.pos.y) < 1.0) touch.set(d, sim.t - tc);
  };
  const r = sim.run();
  if (!catcher || catcher.slot !== who) continue;
  const order = [...sim.defense].filter((d: any) => touch.has(d)).sort((p: any, q: any) => touch.get(p) - touch.get(q));
  const f = order[0];
  yac.push(r.stats?.yac ?? NaN); firstT.push(f ? touch.get(f) : Infinity);
  const lab = (d: any) => `${d.slot}:${(d.behavior as any)?.zone ?? (d.behavior as any)?.kind ?? '?'}`;
  const near = [...sim.defense].sort((p: any, q: any) => atCatch.get(p) - atCatch.get(q)).slice(0, 3)
    .map((d: any) => `${lab(d)} ${atCatch.get(d)!.toFixed(1)}yd brk ${brk.has(d) ? (brk.get(d).since - rel!).toFixed(2) + 's/' + brk.get(d).src : '-'} touch ${touch.has(d) ? touch.get(d)!.toFixed(2) : '-'}`);
  console.log(`seed ${seed}: catch ${(tc! - rel!).toFixed(2)}s after release, YAC ${(r.stats?.yac ?? NaN).toFixed(1)}, first ${f ? lab(f) + ' ' + touch.get(f).toFixed(2) + 's' : 'none'} | nearest at catch: ${near.join('; ')}`);
  if (f) (firsts[lab(f)] ??= []).push(touch.get(f));
}
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
console.log(JSON.stringify({ catches: yac.length, yacMean: +(yac.reduce((a, b) => a + b, 0) / Math.max(1, yac.length)).toFixed(1), firstTouchP50: med(firstT),
  firstBy: Object.fromEntries(Object.entries(firsts).map(([k, v]) => [k, v.length])) }));
