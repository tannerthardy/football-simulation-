/** Down man of each declared double, while doubled before release: play-side lateral request (raw/final), achieved; his posture. */
import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { playSideSign } = await import(root + '/src/sim/behaviors/blocking.ts');
const traces = process.argv.slice(2).filter(f => f.endsWith('.json')).flatMap(f => JSON.parse(readFileSync(f, 'utf8')));
const sets = process.argv.slice(2).filter(f => f.endsWith('.bin')).flatMap(f => deserialize(readFileSync(f)) as any[]);
const acc: Record<string, any> = {};
for (const r of traces) {
  const p = sets.find(q => q.id === r.id); if (!p) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const to = r.released > 0.4 ? r.released : 2.5;
  const tr = sim.recordCommands({ actor: { team: 'D', slot: r.down }, from: 0.3, to }); sim.run();
  const ps = playSideSign(sim, sim.offCall.run), dir = sim.attackDir('O');
  const a = (acc[sim.offCall.run.scheme] ??= { n: 0, raw: 0, fin: 0, ach: 0, back: 0, owner: {} as Record<string, number> });
  for (const s of tr.steps) {
    const e = s.start.engagement; if (!e || !e.helpers?.length) continue;
    const raw = s.decision?.raw.vel, fin = s.final?.vel; if (!raw || !fin) continue;
    a.n++; a.raw += raw.y * ps; a.fin += fin.y * ps; a.ach += s.start.body.velocity.y * ps; a.back += s.start.body.velocity.x * dir;
    const st = s.rewrites.at(-1)?.stage ?? 'decision'; a.owner[st] = (a.owner[st] ?? 0) + 1;
  }
}
for (const [k, a] of Object.entries(acc)) console.log(k, `doubled DL ticks ${a.n}: play-side lateral request raw ${(a.raw / a.n).toFixed(2)} final ${(a.fin / a.n).toFixed(2)} achieved ${(a.ach / a.n).toFixed(2)}; driven back ${(a.back / a.n).toFixed(2)} yd/s; last stage`, JSON.stringify(a.owner));
