import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
for (const f of process.argv.slice(2)) {
  const set = deserialize(readFileSync(f)) as any[]; let rel = 0, far = 0, dead = 0; const ds: number[] = [];
  for (const p of set) {
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
    if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) { dead++; continue; }
    const ledger = sim.recordResponsibility();
    // position at each tick start, recorded only for the release instant
    const pos = new Map<string, any>();
    const orig = sim.tick.bind(sim); sim.tick = () => { pos.set(sim.t.toFixed(2), sim.agents.map((a: any) => ({ x: a.pos.x, y: a.pos.y }))); return orig(); };
    sim.run();
    for (const c of ledger.data.changes) if (c.reason === 'combination-release' && c.after.kind === 'climb' && c.after.target !== null) {
      rel++; const at = pos.get(c.t.toFixed(2)); if (!at) continue;
      const a = at[c.actor], b = at[c.after.target]; const d = Math.hypot(a.x - b.x, a.y - b.y); ds.push(d); if (d >= 4) far++;
    }
  }
  ds.sort((a, b) => a - b);
  console.log(f, 'dead', dead, 'climber releases', rel, 'backer >=4 yd', far, 'p50', ds[Math.floor(ds.length / 2)]?.toFixed(2));
}
