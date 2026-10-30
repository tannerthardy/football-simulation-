/** Carrier crease-read trace: every 'aim' observation (selected entry, best 5 candidates by score with risk), and the
 * nearby defenders as the sim has them. args: seed playIndex t0 t1 */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { runReadObservers } = await import(root + '/src/sim/run-read-observer.ts');
const [seed, pi, t0 = '2.4', t1 = '3.4'] = process.argv.slice(2);
const p = (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])[+pi];
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
const dir = sim.attackDir('O'), by = sim.ballY;
const f = (v: any) => `(${((v.x - sim.los) * dir).toFixed(2)},${(v.y - by).toFixed(2)})`;
runReadObservers.set(sim, (e: any) => {
  if (e.t < +t0 || e.t > +t1) return;
  if (e.phase === 'aim') {
    const c = [...e.candidates].sort((a: any, b: any) => a.score - b.score).slice(0, 5);
    console.log(`${e.t.toFixed(2)} aim preferred y ${(e.preferred - by).toFixed(2)} selected ${e.selected ? f(e.selected) : '-'} | ` + c.map((q: any) => `${f(q.entry)} r${q.risk.toFixed(2)} s${q.score.toFixed(2)}`).join('  '));
  } else if (e.phase === 'command' && Math.round(e.t * 100) % 10 === 0) {
    const a = sim.carrier; console.log(`${e.t.toFixed(2)} cmd ${a.slot}${f(a.pos)} v${a.speed.toFixed(1)} heading ${(e.heading * 180 / Math.PI).toFixed(0)} speed ${e.speed.toFixed(1)}`);
  }
});
while (sim.phase === 'live' && sim.t < +t1) {
  sim.tick();
  if (sim.t >= +t0 && Math.round(sim.t * 100) % 20 === 0) console.log('   D: ' + sim.defense.filter((d: any) => sim.carrier && Math.hypot(d.pos.x - sim.carrier.pos.x, d.pos.y - sim.carrier.pos.y) < 4).map((d: any) => `${d.slot}${f(d.pos)} v(${(d.vel.x * dir).toFixed(1)},${d.vel.y.toFixed(1)})${d.engagement ? '~' + d.engagement.blocker.slot : ''}`).join(' '));
}
