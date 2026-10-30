/** For named stuck climbers: controller's raw request vs each rewrite vs final, upfield and speed, over a window. */
import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const [setFile, ...cases] = process.argv.slice(2); // id:slot:from:to
const set = deserialize(readFileSync(setFile)) as any[];
for (const c of cases) {
  const [id, slot, from, to] = c.split(':');
  const p = set.find(q => q.id === id);
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  const tr = sim.recordCommands({ actor: { team: 'O', slot }, from: +from, to: +to }); sim.run();
  const dir = sim.attackDir('O');
  const acc: Record<string, { n: number; up: number; sp: number }> = {};
  const put = (k: string, v: any) => { const a = (acc[k] ??= { n: 0, up: 0, sp: 0 }); a.n++; a.up += v.x * dir; a.sp += Math.hypot(v.x, v.y); };
  for (const s of tr.steps) {
    if (s.decision) put('0 raw', s.decision.raw.vel);
    for (const w of s.rewrites) put(`1 after ${w.stage}`, w.command.vel);
    if (s.final) put('9 final', s.final.vel);
    put('9 achieved', s.start.body.velocity);
  }
  console.log(id, slot, Object.entries(acc).sort().map(([k, a]) => `${k} n${a.n} up ${(a.up / a.n).toFixed(2)} sp ${(a.sp / a.n).toFixed(2)}`).join(' | '));
}
