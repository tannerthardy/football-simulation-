// Staged Cover 2 underneath at the throw (Integration, 2026-11-24, the flat cost): for every throw, each hook dropper
// (hook_s, hook_w, hook_mid): his depth, width from the ball, technique label and the receiver he is nearest; the #2
// on his side (depth, width); and the flat corner's depth at the catch. Against the taught wall-and-carry of #2 to
// 10-12 yd between the numbers and the hash, then off on the throw. Read-only.
//   [flags] node --import tsx scripts/diag/coverage/c2-hook-stage.mts [seeds] [concept] [coverage]
const W = process.cwd();
import { readFileSync } from 'node:fs';
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const N = Number(process.argv[2] ?? 30), concept = process.argv[3] ?? 'four_verts', coverage = process.argv[4] ?? 'cover2';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { ZoneCoverage } = await import(`${W}/src/sim/behaviors/defense.ts`);
const up0 = ZoneCoverage.prototype.update;
ZoneCoverage.prototype.update = function (a: any, sim: any) { const c = up0.call(this, a, sim); a.__lab = facingTechnique(c)?.label ?? ''; return c; };
const agg: Record<string, { d: number[]; w: number[]; two: number[]; labs: Record<string, number> }> = {}; const cbAtCatch: number[] = [];
for (let seed = 1; seed <= N; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ concept, coverage, seed, roster: 3, formation: 'gun_doubles_11', flip: false }));
  let snap: any = null, caught = false; const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    if (!snap && sim.ball?.kind === 'air') {
      snap = true;
      for (const d of sim.defense) { const z = (d.behavior as any)?.zone as string | undefined; if (!z || !/^hook/.test(z)) continue;
        const sideSign = Math.sign(d.pos.y - sim.ballY) || 1, side = sideSign === sim.offAlign.strongSign ? 'S' : 'W';
        const two = sim.offense.find((r: any) => r.slot === sim.offAlign.numbering[`${side}2`]);
        const g = agg[z] ??= { d: [], w: [], two: [], labs: {} };
        g.d.push(d.pos.x - sim.los); (g as any).lm ??= []; (g as any).lm.push((d.behavior as any).landmark.x - sim.los); g.w.push(Math.abs(d.pos.y - sim.ballY)); if (two) g.two.push(two.pos.x - sim.los);
        g.labs[d.__lab || '?'] = (g.labs[d.__lab || '?'] ?? 0) + 1; } }
    if (snap && !caught && sim.ball?.kind === 'held' && sim.ball.carrier?.team === 'O' && sim.ball.carrier !== sim.qb) { caught = true;
      const cbs = sim.defense.filter((d: any) => /^flat_/.test((d.behavior as any)?.zone ?? ''));
      for (const cb of cbs) cbAtCatch.push(cb.pos.x - sim.los); } };
  sim.run();
}
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? +s[Math.floor(p * (s.length - 1))].toFixed(1) : null; };
for (const [z, g] of Object.entries(agg)) console.log(`${z}: n ${g.d.length}, depth at the throw p25/50/75 ${q(g.d, .25)}/${q(g.d, .5)}/${q(g.d, .75)}, width ${q(g.w, .5)}, his side's #2 depth p50 ${q(g.two, .5)}, landmark depth p50 ${q((g as any).lm, .5)}; labels ${JSON.stringify(Object.entries(g.labs).sort((a, b) => b[1] - a[1]).slice(0, 4))}`);
console.log(`flat corners' depth at the catch p25/50/75: ${q(cbAtCatch, .25)}/${q(cbAtCatch, .5)}/${q(cbAtCatch, .75)} (n ${cbAtCatch.length})`);
