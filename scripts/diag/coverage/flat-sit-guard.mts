// FLAT_SINK_ONE guard stage: one concept vs one coverage, seeds 1..N, both flat corners. Per side: did he sit on #1 (the
// flat-sit-drive technique, the out-break read) and when; #1's depth at 2.6 s (a go is past 10); the corner's depth and
// distance to #1 at 2.6 s; the throw's target and outcome. Read-only.   [flags] node --import tsx ... [seeds] [concept] [coverage]
const W = process.cwd();
import { readFileSync } from 'node:fs';
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const N = Number(process.argv[2] ?? 12), concept = process.argv[3] ?? 'four_verts', coverage = process.argv[4] ?? 'cover2';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { ZoneCoverage } = await import(`${W}/src/sim/behaviors/defense.ts`);
const up0 = ZoneCoverage.prototype.update;
ZoneCoverage.prototype.update = function (a: any, sim: any) { const c = up0.call(this, a, sim); a.__lab = facingTechnique(c)?.label ?? ''; return c; };
let sits = 0, sides = 0; const dist: number[] = [], caught: Record<string, number> = {};
for (let seed = 1; seed <= N; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ concept, coverage, seed, roster: 3, formation: 'gun_doubles_11', flip: false }));
  const pairs = ['S', 'W'].map((S) => ({ one: sim.offense.find((r: any) => r.slot === sim.offAlign.numbering[S + '1']), two: sim.offense.find((r: any) => r.slot === sim.offAlign.numbering[S + '2']),
    cb: sim.defense.find((d: any) => (d.behavior as any)?.zone === (S === 'W' ? 'flat_w' : 'flat_s')), sat: null as number | null, at: null as any })).filter((p) => p.one && p.cb);
  let rel: any = null; const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (!rel && sim.ball?.kind === 'air') rel = sim.ball.target?.slot;
    for (const p of pairs) { if (p.sat === null && p.cb.__lab === 'flat-sit-drive') p.sat = +sim.t.toFixed(2);
      if (!p.at && sim.t >= 2.6) p.at = { d1: p.one.pos.x - sim.los, dc: p.cb.pos.x - sim.los, dist: Math.hypot(p.cb.pos.x - p.one.pos.x, p.cb.pos.y - p.one.pos.y), d2: p.two ? p.two.pos.x - sim.los : null, dist2: p.two ? Math.hypot(p.cb.pos.x - p.two.pos.x, p.cb.pos.y - p.two.pos.y) : null }; } };
  const r = sim.run();
  for (const p of pairs) { sides++; if (p.sat !== null) sits++; if (p.at) dist.push(p.at.dist);
    console.log(`s${seed} ${p.one.slot}: sat ${p.sat ?? '-'} | at 2.6 s #1 d ${p.at?.d1?.toFixed(1)} CB d ${p.at?.dc?.toFixed(1)} dist ${p.at?.dist?.toFixed(1)} | #2 d ${p.at?.d2?.toFixed(1)} dist ${p.at?.dist2?.toFixed(1)}`); if (p.at?.dist2 != null) (globalThis as any).__d2 = [...((globalThis as any).__d2 ?? []), p.at.dist2]; }
  const k = `${rel ?? 'no throw'} ${r.outcome === 'incomplete' ? 'inc' : 'caught'}`; caught[k] = (caught[k] ?? 0) + 1;
}
const s = [...dist].sort((a, b) => a - b);
console.log(JSON.stringify({ concept, coverage, sides, satOnOne: sits, distTo1At26p50: +(s[Math.floor(s.length / 2)] ?? NaN).toFixed(2), distTo2At26p50: (() => { const v = [...((globalThis as any).__d2 ?? [])].sort((a: number, b: number) => a - b); return +(v[Math.floor(v.length / 2)] ?? NaN).toFixed(2); })(), throws: caught }));
