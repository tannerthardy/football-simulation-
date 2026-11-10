// The adverse row of HANDS_CHEST (Integration, 2026-11-10): "blocker on a man out of the play" rose 108 -> 123 per
// 100 runs. Is a hands row that no longer spins the pair harder to come off, or is it the release decision? For run
// engagements on the fixed run set: how each ends (reason, from the engine's own run-contact observer: body down,
// runner passed defender, separation, shed reasons; or still on at the whistle) and how long it lasted; plus, per run,
// the time a blocker stays on a man who is > 5 yd from the runner and moving away from him (the scorecard's "stuck"
// rule without its free-defender condition), and with it.
// Settings at load: run per arm. usage: node --import tsx scripts/diag/effective-mass/run-block-ends.mts [dir]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { runContactObservers } = await import(`${W}/src/sim/run-contact-observer.ts`);
const DIR = process.argv[2] ?? 'out/matched-restage';
const ends = new Map<string, number>(); const durs: Record<string, number[]> = {}; let runs = 0, stuck = 0, stuckFree = 0;
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (p.pass) continue;
  const sim: any = new PlaySim(st); runs++;
  const ended = new Set<any>();
  runContactObservers.set(sim, (e: any, ph: string, data: any) => { if (ph !== 'end' || ended.has(e)) return; ended.add(e);
    const r = String(data?.reason ?? 'other'); ends.set(r, (ends.get(r) ?? 0) + 1); (durs[r] ??= []).push(sim.t - e.start); });
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const c = sim.carrier; if (!c || sim.phase !== 'live' || sim.handoffAt < 0) return;
    for (const e of sim.engagements) { if (e.type !== 'run') continue; const d = e.defender;
      const dx = d.pos.x - c.pos.x, dy = d.pos.y - c.pos.y, dist = Math.hypot(dx, dy); if (dist <= 5) continue;
      if ((d.vel.x * dx + d.vel.y * dy) / dist <= 0.5) continue;
      stuck += sim.dt;
      const free = sim.defense.some((x: any) => !x.engagement && !x.isDown(sim.t) && Math.hypot(x.pos.x - c.pos.x, x.pos.y - c.pos.y) < 3);
      if (free) stuckFree += sim.dt; } };
  const live = () => sim.engagements.filter((e: any) => e.type === 'run' && !ended.has(e));
  sim.run();
  for (const e of live()) { ends.set('on at the whistle', (ends.get('on at the whistle') ?? 0) + 1); }
}
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const tot = [...ends.values()].reduce((a, b) => a + b, 0);
console.log(`runs ${runs}; run engagements ending (per 100 runs; median duration s):`);
for (const [r, n] of [...ends.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${r.padEnd(34)} ${(100 * n / runs).toFixed(1).padStart(6)}  (${(100 * n / tot).toFixed(0)}%)  ${durs[r] ? med(durs[r]).toFixed(2) : '-'}`);
console.log(`blocker on a man > 5 yd from the runner moving away: ${(stuck / runs).toFixed(3)} s a run; with a defender free within 3 yd of the runner: ${(stuckFree / runs).toFixed(3)} s a run`);
