// usage: npm run -s ref -- node --import tsx scripts/diag/tackle-finish/one-arm-grabs.mts <out.json> [restage dir]
// Every one-armed grab from inside a block: what it achieves. Outcome (upgraded to a wrap, broken, held to the end),
// carrier speed at the grab and 0.3 s later, whether the play ended while it was held, and the joint's peak load
// fraction of capacity.
import { readFileSync, writeFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const grabs: any[] = [];
const DIR = process.argv[3] ?? "out/matched-restage";
for (let seed = 7; seed <= 29; seed += 2) { let i = 0; for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const id = `s${seed}-${i++}`; const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const live = new Map<any, any>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const b = sim.bond, c = sim.carrier;
    if (b?.holds) for (const [d, j] of b.holds) {
      let g = live.get(j);
      if (!g && b.oneArm?.has(d)) { g = { id, slot: d.slot, start: sim.t, v0: c ? Math.hypot(c.vel.x, c.vel.y) : null, upgraded: null, peak: 0, outcome: 'open' }; live.set(j, g); grabs.push(g); }
      if (!g) continue;
      if (g.v03 === undefined && sim.t - g.start >= 0.3 && c) g.v03 = Math.hypot(c.vel.x, c.vel.y);
      if (g.upgraded === null && !b.oneArm?.has(d)) g.upgraded = +(sim.t - g.start).toFixed(2);
      const load = Math.abs(j.normalForce ?? 0); if (j.capacity > 0) g.peak = Math.max(g.peak, load / j.capacity);
      if (j.broken && g.outcome === 'open') g.outcome = 'broken';
    } };
  const r = sim.run();
  for (const g of grabs) if (g.id === id && g.outcome === 'open') g.outcome = `held to end (${r.outcome})`;
  for (const g of grabs) if (g.id === id) g.yards = r.yards;
} }
writeFileSync(process.argv[2], JSON.stringify(grabs));
console.log('one-arm grabs', grabs.length);
