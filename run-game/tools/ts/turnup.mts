/** Pullers that turn up: when, the man they left, the work they find, and the defenders near the runner later. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
for (const f of process.argv.slice(2)) {
  const seed = f.match(/seed(\d+)/)![1];
  (JSON.parse(readFileSync(f, 'utf8')) as any[]).forEach((p, i) => {
    if (p.pass) return;
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    if (sim.snapAssessment && !sim.snapAssessment.snapPermitted || !sim.offCall.run) return;
    let ev: any = null, puller: any = null, lines: string[] = [];
    while (sim.phase === 'live' && sim.t < 8) {
      sim.tick();
      if (!ev) { ev = sim.events.find((e: any) => e.type === 'pull_turn_up'); if (ev) { puller = sim.agents[ev.a];
        const c = sim.carrier; lines.push(`turn-up ${ev.t}s ${puller.slot} left ${sim.agents[ev.b].slot}; new target ${puller.behavior.plan.target?.slot ?? 'none'}; runner ${c?.slot} at x-los ${(c.pos.x - sim.los).toFixed(1)}`);
        const free = sim.defense.filter((d: any) => !d.engagement && !d.isDown(sim.t)).map((d: any) => `${d.slot}(${(d.pos.x - puller.pos.x).toFixed(1)},${(d.pos.y - puller.pos.y).toFixed(1)})`); lines.push('   free defenders rel. puller: ' + free.join(' ')); } }
      else if (puller && Math.abs(sim.t - ev.t - 0.5) < 0.026) lines.push(`   +0.5s puller target ${puller.behavior.plan.target?.slot ?? 'none'} engaged ${puller.engagement?.defender.slot ?? '-'} vel (${puller.vel.x.toFixed(1)},${puller.vel.y.toFixed(1)})`);
    }
    if (ev) { const r = sim.result ?? sim; console.log(`S${seed}-#${i} ${p.call}`); console.log(lines.join('\n')); console.log(`   first contact ${sim.events.find((e: any) => e.type === 'carrier_contact') ? sim.agents[sim.events.find((e: any) => e.type === 'carrier_contact').b].slot : '-'}`); }
  });
}
