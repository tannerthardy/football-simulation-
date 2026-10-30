import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const fate = JSON.parse(readFileSync(process.argv[2], 'utf8')) as any[];
const sets = process.argv.slice(3).map(f => deserialize(readFileSync(f)) as any[]);
const find = (id: string) => sets.flat().find(p => p.id === id);
const agg: Record<string, any> = {};
for (const grp of ['stuck', 'climbed']) {
  const rows = fate.filter(r => r.leaver && r.rel >= 0 && (grp === 'stuck' ? r.reach2 < 0 : r.reach2 >= 0));
  const kinds: Record<string, number> = {}; let req = 0, ach = 0, up = 0, n = 0, upReq = 0, stages: Record<string, number> = {};
  for (const r of rows) {
    const p = find(r.id); const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup))); const dir = sim.attackDir('O');
    const end = r.reach2 >= 0 ? r.reach2 : (r.carrier2 >= 0 ? r.carrier2 : r.rel + 1.5);
    const to = Math.min(end, r.rel + 1.5); if (!(to > r.rel)) continue; const tr = sim.recordCommands({ actor: { team: "O", slot: r.leaver }, from: r.rel, to }); sim.run();
    let last = 'none';
    for (const s of tr.steps) {
      for (const c of s.climbAccess ?? []) last = c.data.result;
      const plan = s.start.behavior.job;
      const k = plan !== 'climb' ? `job:${plan}` : `access:${last}`; kinds[k] = (kinds[k] ?? 0) + 1;
      const f = s.final?.vel, v = s.start.body.velocity; if (!f) continue;
      req += Math.hypot(f.x, f.y); ach += Math.hypot(v.x, v.y); up += v.x * dir; upReq += f.x * dir; n++;
      for (const w of s.rewrites) stages[w.stage] = (stages[w.stage] ?? 0) + 1;
    }
  }
  agg[grp] = { climbers: rows.length, ticks: n, kinds, meanRequested: +(req / n).toFixed(2), meanAchieved: +(ach / n).toFixed(2), meanUpfieldRequested: +(upReq / n).toFixed(2), meanUpfieldAchieved: +(up / n).toFixed(2), rewrites: stages };
}
console.log(JSON.stringify(agg, null, 1));
