// Outcome by the target's route on staged dropback concepts (no play action): completion, yards, and separation at the
// throw (the nearest defender to the target). Pairs with route-export.mts for a route-change's before/after.
//   node --import tsx scripts/diag/routes/route-outcome.mts [seeds] [out.json]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const outPath = process.argv[3] ?? 'out/diag/routes/outcome.json';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && c.family !== 'playaction' && c.drop !== 'pa').map(([id]) => id);
const rows: any[] = [];
for (const concept of concepts) for (const coverage of ['cover3', 'cover4', 'cover2', 'cover1']) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    let sep: number | null = null, route: string | null = null, tThrow: number | null = null;
    const routeOf = new Map<any, string>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.throwAt < 0) { for (const r of sim.offense) { const id = r.behavior?.route?.id; if (id) routeOf.set(r, id); } return; }
      if (tThrow !== null) return;
      tThrow = sim.t;
      const T = sim.offense.find((r: any) => r.player.id === sim.stats.target);
      if (!T) return;
      route = routeOf.get(T) ?? null;
      sep = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y)));
    };
    const res = sim.run();
    const s = res.stats;
    if (!s.attempted || !route) continue;
    rows.push({ concept, coverage, route, comp: !!s.completed, int: !!s.interceptedBy, yards: res.yards, sep, tThrow });
  }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(rows));
const by: Record<string, any[]> = {};
for (const r of rows) (by[r.route] ??= []).push(r);
const med = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
for (const [k, v] of Object.entries(by).sort()) console.log(k.padEnd(12), `${v.filter(r => r.comp).length}/${v.length}`,
  (v.reduce((s, r) => s + r.yards, 0) / v.length).toFixed(2), 'sep', med(v.map(r => r.sep)).toFixed(2), 'tThrow', med(v.map(r => r.tThrow)).toFixed(2), 'int', v.filter(r => r.int).length);
