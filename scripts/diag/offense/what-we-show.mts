// What our offense presents in whole games: share of called snaps by formation (with its receiver distribution and
// structure tags as the defense reads them at alignment), by personnel, and by concept. From the game log's call label
// ("Formation — Concept[tag]"), so it is the playcaller's call before motion.
//   node --import tsx scripts/diag/offense/what-we-show.mts [games] [out.json]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const games = Number(process.argv[2] ?? 6);
const outPath = process.argv[3] ?? 'out/diag/offense/what-we-show.json';
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { FORMATIONS } = await import(`${W}/src/playbook/formations.ts`);
const { PASS_CONCEPTS, RUN_CONCEPTS } = await import(`${W}/src/playbook/concepts.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { formationStructure } = await import(`${W}/src/playbook/structure.ts`);
const byName = new Map(FORMATIONS.map((f: any) => [f.name, f]));
const conceptByName = new Map([...PASS_CONCEPTS, ...RUN_CONCEPTS].map((c: any) => [c.name, c]));
const structure = new Map<string, any>();
for (const f of FORMATIONS) {
  try { const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover4', concept: 'curl_flat', seed: 1, roster: 1, formation: f.id, flip: false }));
    const st = formationStructure(sim.offAlign); structure.set(f.id, { key: st.key, tags: st.tags }); } catch { /* skip */ }
}
const rows: any[] = [];
for (let seed = 1; seed <= games; seed++) {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: 0.55 });
  const away = generateTeam(rng, 'Away', 'AWY', { strength: 0.55 });
  const g = simulateGame(home, away, { seed });
  for (const p of g.log) {
    if ((p.kind !== 'run' && p.kind !== 'pass') || !p.call) continue;
    const [fname, rest] = p.call.split(' — ');
    const f: any = byName.get(fname);
    const cname = [...conceptByName.keys()].filter(n => rest?.startsWith(n)).sort((a, b) => b.length - a.length)[0];
    const c: any = cname ? conceptByName.get(cname) : null;
    rows.push({ seed, formation: f?.id ?? fname, personnel: f?.personnel ?? '?', kind: c?.scheme ? 'run' : 'pass', concept: c?.id ?? rest,
      key: structure.get(f?.id)?.key ?? '?', tags: structure.get(f?.id)?.tags ?? [] });
  }
}
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(rows));
const share = (k: (r: any) => string, set = rows) => {
  const c = new Map<string, number>(); for (const r of set) c.set(k(r), (c.get(k(r)) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([n, v]) => `${n} ${(100 * v / set.length).toFixed(1)}%`).join(', ');
};
console.log('snaps', rows.length);
console.log('distribution:', share(r => r.key));
console.log('personnel:', share(r => r.personnel));
console.log('formation:', share(r => r.formation));
for (const t of ['bunch_strong', 'stack_strong', 'stack_weak', 'reduced_strong', 'quads', 'empty', 'empty_3x2', 'trips', 'close_23'])
  console.log(`tag ${t}: ${(100 * rows.filter(r => r.tags.includes(t)).length / rows.length).toFixed(1)}%`);
console.log('pass concepts:', share(r => r.concept, rows.filter(r => r.kind === 'pass')));
