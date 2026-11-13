// Run blocks that end 'body down' on the fixed run set (Integration, 2026-11-10): who left 'up' (blocker, defender, both),
// and the direction of the faller's capture-point deviation against the load he felt the tick before (the pass-fall.mts
// classes: 'into' = toward the man, against the load: a lean the load stopped balancing; 'with' = along the load: pushed
// over; else 'across'), with his lean over his felt load then.
// usage: node --import tsx scripts/diag/effective-mass/run-fall.mts [dir]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { runContactObservers } = await import(`${W}/src/sim/run-contact-observer.ts`);
const DIR = process.argv[2] ?? 'out/matched-restage';
let runs = 0, ends = 0; const C = new Map<string, number>(); const add = (k: string) => C.set(k, (C.get(k) ?? 0) + 1);
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (p.pass) continue;
  const sim: any = new PlaySim(st); runs++;
  const prev = new Map<any, any>(); const ended = new Set<any>();
  const snap = (a: any) => { const s = a.body.support; return { xi: { ...s.xi }, felt: { ...s.felt }, lean: Math.hypot(s.lean.x, s.lean.y), fl: Math.hypot(s.felt.x, s.felt.y) }; };
  const cls = (a: any) => { const s = a.body.support, q = prev.get(a); if (!q) return 'n/a';
    const e = Math.hypot(s.xi.x, s.xi.y); if (q.fl < 1e-6 || e < 1e-9) return 'noload';
    const c = (s.xi.x * q.felt.x + s.xi.y * q.felt.y) / (e * q.fl); return c < -0.5 ? 'into' : c > 0.5 ? 'with' : 'across'; };
  runContactObservers.set(sim, (e: any, ph: string, data: any) => { if (ph !== 'end' || ended.has(e)) return; ended.add(e); ends++;
    if (data?.reason !== 'body down') return;
    const bd = e.blocker.isDown(sim.t), dd = e.defender.isDown(sim.t);
    if (bd) { const q = prev.get(e.blocker); add(`blocker ${cls(e.blocker)}${q && q.fl > 1e-6 && q.lean > 1.0 * q.fl ? ' (lean>load)' : ''}`); }
    if (dd) { const q = prev.get(e.defender); add(`defender ${cls(e.defender)}${q && q.fl > 1e-6 && q.lean > 1.0 * q.fl ? ' (lean>load)' : ''}`); }
    add(bd && dd ? 'both down' : bd ? 'blocker only' : dd ? 'defender only' : 'neither?'); });
  const tick = sim.tick.bind(sim);
  sim.tick = () => { for (const e of sim.engagements ?? []) { prev.set(e.blocker, snap(e.blocker)); prev.set(e.defender, snap(e.defender)); } tick(); };
  sim.run();
}
console.log(JSON.stringify({ runs, ends, bodyDown: Object.fromEntries([...C].sort((a, b) => b[1] - a[1])) }, null, 1));
