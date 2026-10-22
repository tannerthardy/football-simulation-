/** Head-on first contacts that turn into long runs: rerun lab cases and, at
 * the carrier's first contact, record who touched him, whether that man was
 * engaged with a blocker, his speed and the carrier's, and what followed
 * (wraps, missed tackles, who finally tackled). Cases are ids from a lab
 * common file filtered to head-on first contacts (carrier and nearest
 * defender moving against each other, as scripts/mechanics/metrics.py).
 * Observation only.
 * node --import tsx scripts/diag/gap/headon.ts out/headon.json */
import { readFileSync } from 'node:fs';
import { makeSim, rosters } from '../zone-lab/lab.js';

const sets = JSON.parse(readFileSync(process.argv[2], 'utf8')) as Record<string, string[]>;
const R = rosters();
for (const [name, ids] of Object.entries(sets)) {
  const tally = new Map<string, number>();
  const bump = (k: string) => tally.set(k, (tally.get(k) ?? 0) + 1);
  for (const id of ids) {
    const [concept, dir, formation, look, roster, seed] = id.split('/');
    const sim = makeSim({ concept, dir: dir as 'strong', formation, look, roster, seed: Number(seed) }, R);
    let first: { slot: string; engaged: string; dSpeed: number; cSpeed: number; depth: number; t: number } | null = null;
    while (sim.phase === 'live' && sim.t < 15) {
      const n = sim.events.length;
      sim.tick();
      for (const e of sim.events.slice(n)) {
        if (e.type === 'carrier_contact' && !first && e.a !== undefined && e.b !== undefined) {
          const x = sim.agents[e.a], y = sim.agents[e.b], c = sim.carrier ?? x;
          const d = x.team === 'D' ? x : y;
          first = { slot: d.slot, engaged: d.engagement ? `by ${d.engagement.blocker.slot}` : 'free',
            dSpeed: Math.hypot(d.vel.x, d.vel.y), cSpeed: Math.hypot(c.vel.x, c.vel.y),
            depth: (c.pos.x - sim.los) * sim.attackDir('O'), t: sim.t };
        }
        if (first && (e.type === 'missed_tackle' || e.type === 'tackle_wrap') && e.a !== undefined)
          bump(`${e.type} by ${sim.agents[e.a].slot === first.slot ? 'first man' : 'another'}`);
      }
    }
    if (!first) { bump('no contact'); continue; }
    const role = first.slot.replace(/_[SW]$/, '');
    bump(`first man ${role} ${first.engaged.startsWith('by') ? 'engaged' : 'free'}`);
    const res = sim.buildResult() as { yards?: number };
    console.log(`${id.padEnd(46)} first ${first.slot.padEnd(5)} ${first.engaged.padEnd(9)} t ${first.t.toFixed(2)} depth ${first.depth.toFixed(1).padStart(5)} | D ${first.dSpeed.toFixed(1)} C ${first.cSpeed.toFixed(1)} yd/s | gain ${(res.yards ?? NaN).toFixed(1)}`);
  }
  console.log(`== ${name}`);
  for (const [k, v] of [...tally].sort()) console.log(`  ${k.padEnd(36)} ${v}`);
}
