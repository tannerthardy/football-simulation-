// From a worktree root with the __CA probe: classify departure climb-access results on zone runs (shift 0).
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const kinds: Record<string, number> = {}, obstacle: Record<string, number> = {}, rejected: Record<string, number> = {}, failedBy: Record<string, number> = {};
let sim: any = null; const bump = (m: Record<string, number>, k: string) => { m[k] = (m[k] ?? 0) + 1; };
const who = (a: any, key: number | null) => {
  if (key == null) return 'none';
  const b = sim.agents[key], dep = (a.behavior as any).plan?.departure;
  if (dep?.defender === b) return 'his own down man';
  if (dep?.keeper === b) return 'his keeper';
  return b.team === 'O' ? 'another OL/TE' : 'another DL';
};
(globalThis as any).__CA = (a: any, r: any) => {
  bump(kinds, r.result);
  bump(obstacle, `${r.result}: obstacle ${who(a, r.obstacle)}`);
  if (r.result !== 'direct') for (const c of r.candidates) {
    bump(rejected, `${r.result}: ${c.rejected ?? 'ok'}`);
    for (const k of c.failed ?? []) bump(failedBy, who(a, k));
  }
};
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(root + `/../fs-bk/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (p.pass) continue;
  sim = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!/insideZone|outsideZone|wideZone|splitZone/.test(sim.offCall.run?.scheme ?? '')) continue;
  while (sim.phase === 'live' && sim.t < 3.5) sim.tick();
}
const tot = Object.values(kinds).reduce((s, v) => s + v, 0);
console.log('departure access reads', tot, kinds);
for (const m of [obstacle, rejected, failedBy]) console.log(Object.entries(m).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k}: ${v}`).join(' | '));
