/** Engaged double members before release: play-side lateral request (raw decision, final after rewrites), achieved, and the down man's. */
import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker, playSideSign } = await import(root + '/src/sim/behaviors/blocking.ts');
const fate = JSON.parse(readFileSync(process.argv[2], 'utf8')) as any[];
const sets = process.argv.slice(3).map(f => deserialize(readFileSync(f)) as any[]).flat();
const acc: Record<string, { n: number; raw: number; fin: number; ach: number; dl: number; up: number; stage: Record<string, number> }> = {};
for (const r of fate) {
  const p = sets.find(q => q.id === r.id); if (!p) continue;
  for (const slot of r.members.split('+')) {
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
    if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
    const to = r.rel > 0.4 ? r.rel : 2.5;
    const tr = sim.recordCommands({ actor: { team: 'O', slot }, from: 0.3, to }); sim.run();
    const ps = playSideSign(sim, sim.offCall.run), dir = sim.attackDir('O');
    const scheme = sim.offCall.run.scheme;
    const key = `${scheme}`; const a = (acc[key] ??= { n: 0, raw: 0, fin: 0, ach: 0, dl: 0, up: 0, stage: {} });
    for (const s of tr.steps) {
      const e = s.start.engagement; if (!e) continue;
      const raw = s.decision?.raw.vel, fin = s.final?.vel; if (!raw || !fin) continue;
      a.n++; a.raw += raw.y * ps; a.fin += fin.y * ps; a.ach += s.start.body.velocity.y * ps; a.up += s.start.body.velocity.x * dir;
      for (const w of s.rewrites) a.stage[w.stage] = (a.stage[w.stage] ?? 0) + 1;
      const dl = sim.agents.find((q: any) => q.slot === e.defender.slot && q.team === 'D'); if (dl) {} // positions at end; use endpoint diff below
    }
  }
}
for (const [k, a] of Object.entries(acc)) console.log(k, `engaged member-ticks ${a.n}: play-side lateral requested raw ${(a.raw / a.n).toFixed(2)}, final ${(a.fin / a.n).toFixed(2)}, achieved ${(a.ach / a.n).toFixed(2)} yd/s; upfield achieved ${(a.up / a.n).toFixed(2)}; rewrites`, JSON.stringify(a.stage));
