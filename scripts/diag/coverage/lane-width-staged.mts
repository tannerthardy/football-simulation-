// LANE_LEVERAGE staged check: every non-screen concept x zone calls x seeds x flip (match style), one arm per process
// (flags read at import). Per arm: curl-flat and hook seats' width from the ball and the share of those seat-moments in
// zonePlay's lane, at 2.5 / 3.0 / 3.5 s before the throw; incompletions and yards a play; per play to
// out/lane-width-<ARM>.txt. Read-only.   ARM=x [LANE_LEVERAGE=1] node --import tsx scripts/diag/coverage/lane-width-staged.mts [seeds]
const W = process.cwd();
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
for (const [k, v] of Object.entries(JSON.parse(readFileSync(`${W}/config/reference-stack.json`, 'utf8')).flags as Record<string, string>))
  if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const seeds = Number(process.argv[2] ?? 3);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { ZoneCoverage } = await import(`${W}/src/sim/behaviors/defense.ts`);
const up0 = ZoneCoverage.prototype.update;
ZoneCoverage.prototype.update = function (a: any, sim: any) { const c = up0.call(this, a, sim); a.__lab = facingTechnique(c)?.label ?? ''; return c; };
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && !c.screen).map(([id]) => id);
const COVS = ['cover3', 'cover3_buzz', 'cover4', 'cover6', 'cover2'];
const cells: Record<string, { w: number[]; lane: number }> = {};
let n = 0, inc = 0, yds = 0; const per: string[] = [];
for (const concept of concepts) for (const coverage of COVS) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
  let setup: any; try { setup = nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }); } catch { continue; }
  const sim: any = new PlaySim(setup); const tick = sim.tick.bind(sim); const marks = [2.5, 3.0, 3.5]; let mi = 0;
  sim.tick = () => { tick();
    while (mi < marks.length && sim.t >= marks[mi] - 1e-6) {
      if (sim.ball?.kind === 'held' && sim.ball.carrier === sim.qb) for (const d of sim.defense) {
        const z = (d.behavior as any)?.zone as string | undefined; if (!z || !/^(curl_flat|hook)/.test(z)) continue;
        const k = `${z.startsWith('hook') ? 'hook' : 'curl_flat'} ${marks[mi]}`; const c = cells[k] ??= { w: [], lane: 0 };
        c.w.push(Math.abs(d.pos.y - sim.ballY)); if (/^lane/.test(d.__lab ?? '')) c.lane++;
      }
      mi++;
    } };
  let r: any; try { r = sim.run(); } catch { continue; }
  n++; if (r.outcome === 'incomplete') inc++; yds += r.yards;
  per.push(`${concept}|${coverage}|${seed}|${flip}|${r.outcome}|${r.yards}|${r.stats?.receiver ?? ""}|${(r.stats?.completedAirYards ?? NaN).toFixed?.(1) ?? ""}`);
}
const med = (v: number[]) => { const s = [...v].sort((p, q) => p - q); return +(s[Math.floor(s.length / 2)] ?? NaN).toFixed(2); };
console.log(JSON.stringify({ arm: process.env.ARM, plays: n, incomplete: inc, ydsPerPlay: +(yds / n).toFixed(2),
  width: Object.fromEntries(Object.entries(cells).sort().map(([k, c]) => [k, { n: c.w.length, p50: med(c.w), laneShare: +(c.lane / c.w.length).toFixed(2) }])) }));
mkdirSync('out', { recursive: true }); writeFileSync(`out/lane-width-${process.env.ARM}.txt`, per.join('\n'));
