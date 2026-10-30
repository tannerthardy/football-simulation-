/** R7-P083 (ledger fixture, single-stream): the back's crease reads between 0.8 and 1.4 s: chosen entry and the
 * five lowest-risk candidates, plus result. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { runReadObservers } = await import(root + '/src/sim/run-read-observer.ts');
PlaySim.recordedSingleStream = true;
const cases = JSON.parse(readFileSync('test/fixtures/responsibility-ledger-cases.json', 'utf8'));
const c = cases.plays.find((p: any) => p.id === 'R7-P083');
const sim: any = new PlaySim(restoreSetup(Buffer.from(c.setup, 'base64')));
const cy = (y: number) => (y - 26.65).toFixed(1);
runReadObservers.set(sim, (e: any) => {
  if (e.phase !== 'aim' || e.t < 0.8 || e.t > 1.4) return;
  const a = sim.agents[e.actor];
  const cand = [...(e.candidates ?? [])].sort((p: any, q: any) => p.risk - q.risk).slice(0, 5)
    .map((k: any) => `(${(k.entry.x - sim.los).toFixed(1)},${cy(k.entry.y)}) ${k.risk.toFixed(2)}`).join(' | ');
  console.log(`t ${e.t.toFixed(2)} ${a.slot} at (${(a.pos.x - sim.los).toFixed(1)},${cy(a.pos.y)}) v(${a.vel.x.toFixed(1)},${a.vel.y.toFixed(1)}) -> ${cand}`);
});
const r = sim.run();
console.log('result', r.yards ?? r.gain ?? JSON.stringify(r).slice(0, 200), 'scheme', sim.offCall.run?.scheme, sim.offCall.run?.direction);
