import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const traces = process.argv.slice(2).filter(f => f.endsWith('.json')).flatMap(f => JSON.parse(readFileSync(f, 'utf8')));
const sets = process.argv.slice(2).filter(f => f.endsWith('.bin')).flatMap(f => deserialize(readFileSync(f)) as any[]);
const acc: Record<string, { n: number; up: number; lat: number }> = {}; let helperTicks = 0;
for (const r of traces) {
  const p = sets.find(q => q.id === r.id); if (!p || r.released < 0.4) continue;
  for (const slot of r.members.split('+')) {
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
    if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
    if (!['insideZone','outsideZone','wideZone'].includes(sim.offCall.run?.scheme)) continue;
    const tr = sim.recordCommands({ actor: { team: 'O', slot }, from: 0.3, to: r.released }); sim.run();
    const dir = sim.attackDir('O');
    for (const s of tr.steps) {
      const e = s.start.engagement; if (!e || !e.helpers.some((h: any) => h.slot === slot)) continue; // ticks where this member is the helper
      helperTicks++;
      const put = (k: string, v: any) => { const a = (acc[k] ??= { n: 0, up: 0, lat: 0 }); a.n++; a.up += v.x * dir; a.lat += Math.abs(v.y); };
      if (s.decision) put('0 decision', s.decision.raw.vel);
      for (const w of s.rewrites) put(`1 after ${w.stage}`, w.command.vel);
      if (s.final) put('9 final', s.final.vel);
    }
  }
}
console.log('helper ticks', helperTicks);
for (const [k, a] of Object.entries(acc).sort()) console.log(k, a.n, `upfield ${(a.up / a.n).toFixed(2)} |lat| ${(a.lat / a.n).toFixed(2)}`);
