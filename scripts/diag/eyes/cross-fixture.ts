// node --import tsx scripts/diag/eyes/cross-fixture.ts [seeds] [FLAG=value ...]
// SIGHT_COVER's passing gain, localised (Coverage, 2026-11-14): a paired fixture, so the arms differ only by the flag.
// Concepts mesh / drive / y_cross / hitch_cross against cover3_match / cover2 / cover4, seeds 1..N, both flips,
// gun_doubles_11. Per play: was it thrown, the target's route family, caught, yards, YAC (play end minus the catch
// point), and the nearest defender's distance to the catcher at the catch. Grouped by route family.
// Run once with SIGHT_COVER=0 and once with =1; same setups both times.
import { readFileSync } from 'node:fs';
const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../../../config/reference-stack.json', import.meta.url), 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on') process.env[k] = '1';
const [nArg, ...rest] = process.argv.slice(2);
for (const kv of rest) { const [k, v] = kv.split('='); process.env[k] = v; }
const N = Number(nArg ?? 32);
const { PlaySim } = await import('../../../src/sim/playsim.js');
const { nativeTraceSetup } = await import('../command-trace.js');
const { routeOfAgent } = await import('../../../src/sim/behaviors/receiver.js');
type Row = { fam: string; thrown: boolean; caught: boolean; yards: number; yac: number | null; sep: number | null };
const rows: Row[] = [];
for (const concept of ['mesh', 'drive', 'y_cross', 'hitch_cross']) for (const coverage of ['cover3_match', 'cover2', 'cover4'])
  for (let seed = 1; seed <= N; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip })); } catch { continue; }
    let target: any = null, catchX: number | null = null, sep: number | null = null, wasAir = false;
    while (sim.phase !== 'dead' && sim.t < 12) {
      wasAir = sim.ball.kind === 'air';
      if (wasAir && !target) target = sim.ball.target ?? null;
      sim.tick();
      const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
      if (wasAir && catchX === null && c && c.team === 'O' && c !== sim.qb) {
        catchX = c.pos.x;
        sep = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y)));
      }
    }
    const res = sim.result ?? sim.buildResult?.() ?? {};
    const endX = sim.endSpot?.x ?? (sim.ball.kind === 'held' ? sim.ball.carrier.pos.x : sim.los);
    const fam = target ? (routeOfAgent.get(target) ?? 'none:').split(':')[0] : 'not thrown';
    rows.push({ fam, thrown: !!target, caught: catchX !== null, yards: endX - sim.los, yac: catchX !== null ? endX - catchX : null, sep });
  }
const q = (v: number[], p: number) => { const w = [...v].sort((a, b) => a - b); return w.length ? w[Math.floor(p * (w.length - 1))] : NaN; };
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
console.log(`SIGHT_COVER=${process.env.SIGHT_COVER ?? '0'}: plays ${rows.length}, thrown ${rows.filter((r) => r.thrown).length}`);
const fams = [...new Set(rows.map((r) => r.fam))].sort();
for (const f of fams) {
  const R = rows.filter((r) => r.fam === f), C = R.filter((r) => r.caught);
  console.log(`${f.padEnd(12)} n ${String(R.length).padStart(4)} caught ${(100 * C.length / R.length).toFixed(0).padStart(3)}% | yards mean ${mean(R.map((r) => r.yards)).toFixed(2).padStart(6)} | YAC mean ${mean(C.map((r) => r.yac!)).toFixed(2).padStart(5)} p50 ${q(C.map((r) => r.yac!), .5).toFixed(2)} | sep at catch p50 ${q(C.map((r) => r.sep!), .5).toFixed(2)}`);
}
