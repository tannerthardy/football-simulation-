// Staged slant-flat vs Cover 3 (QB lane's cell, 2026-11-24): every 0.1 s from 0.8 to 1.8 s, on the strong side, the
// slant (S1) and the flat (S2) and the two underneath defenders whose zones are curl_flat and hook on that side: their
// depth, width from the ball, velocity and technique label. Read-only.
//   node --import tsx scripts/diag/coverage/slant-flat-stage.mts [seeds] [coverage] [concept]
const W = process.cwd();
import { readFileSync } from 'node:fs';
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const N = Number(process.argv[2] ?? 3), coverage = process.argv[3] ?? 'cover3', concept = process.argv[4] ?? 'slant_flat';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { ZoneCoverage } = await import(`${W}/src/sim/behaviors/defense.ts`);
const up0 = ZoneCoverage.prototype.update;
ZoneCoverage.prototype.update = function (a: any, sim: any) { const c = up0.call(this, a, sim); a.__lab = facingTechnique(c)?.label ?? ''; return c; };
for (let seed = 1; seed <= N; seed++) {
  const sim: any = new PlaySim(nativeTraceSetup({ concept, coverage, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
  const S1 = sim.offense.find((r: any) => r.slot === sim.offAlign.numbering.S1), S2 = sim.offense.find((r: any) => r.slot === sim.offAlign.numbering.S2);
  const side = Math.sign(S1.pos.y - sim.ballY) || 1;
  const pick = (re: RegExp) => sim.defense.find((d: any) => re.test((d.behavior as any)?.zone ?? '') && Math.sign(d.pos.y - sim.ballY) === side)
    ?? sim.defense.find((d: any) => re.test((d.behavior as any)?.zone ?? ''));
  const cf = pick(/^curl_flat/), hk = pick(/^hook_(s|w)$/) ?? pick(/^hook/);
  const f = (a: any) => a ? `${a.slot} d ${(a.pos.x - sim.los).toFixed(1)} w ${((a.pos.y - sim.ballY) * side).toFixed(1)} v(${a.vel.x.toFixed(1)},${(a.vel.y * side).toFixed(1)})${a.__lab ? ' ' + a.__lab : ''}` : '-';
  const lines: string[] = []; let rel: any = null; const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (!rel && sim.ball?.kind === 'air') rel = { t: sim.t, to: sim.ball.target?.slot };
    if (sim.t > 0.75 && sim.t < 1.85 && Math.abs(sim.t * 10 - Math.round(sim.t * 10)) < 1e-6) lines.push(`  ${sim.t.toFixed(1)} slant ${f(S1)} | flat ${f(S2)} | CF ${f(cf)} | HK ${f(hk)}`); };
  const r = sim.run();
  console.log(`seed ${seed}: CF ${cf?.slot}:${(cf?.behavior as any)?.zone} HK ${hk?.slot}:${(hk?.behavior as any)?.zone}; release ${rel?.t?.toFixed(2)} to ${rel?.to} -> ${r.outcome} ${r.yards.toFixed(1)}`);
  console.log(lines.join('\n'));
}
