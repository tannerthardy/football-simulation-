/** Shed exits: for every run engagement of a DL/LB while he attempts to shed (shed-attempt), track the two physical
 * exits the law has (leverage: `behind` >= 1.1, the defender past the blocker's facing; separation: `apart` beyond
 * arm length) and how the rep ended. Split windows that got free within 1 s vs stayed held. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
import { runContactObservers } from '../../src/sim/run-contact-observer.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const reps = new Map<any, any>(); const ends: Record<string, number> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  runContactObservers.set(sim, (e: any, phase: string, data: any) => {
    const d = e.defender; if (!/^(DE|DT|NT|LB)/.test(d.slot)) return;
    let r = reps.get(e);
    if (phase === 'geometry' && d.tags.has('shed-attempt')) {
      if (!r) { r = { t0: sim.t, behind: [], apart: [], ctl: [], phi: [], off: [], slot: d.slot }; reps.set(e, r); }
      if (sim.t - r.t0 <= 1.0) { r.behind.push(data.behind); r.ctl.push(e.control); r.phi.push(Math.abs(e.phi ?? 0)); r.off.push(data.off * 180 / Math.PI);
        r.apart.push(Math.hypot(e.blocker.pos.x - d.pos.x, e.blocker.pos.y - d.pos.y) - e.blocker.profile.radius - d.profile.radius); }
    }
    if (phase === 'end' && r && !r.end) { r.end = data.reason; r.tEnd = sim.t - r.t0; }
  });
  // Ends that bypass the observer (beat()/disengage inside stepRunRep): detect the loss of engagement.
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); for (const [e, r] of reps) if (!r.end && !sim.engagements.includes(e)) { r.end = e.holding ? 'ended (held)' : 'ended (shed/leverage)'; r.tEnd = sim.t - r.t0; } };
  sim.run();
}
const q = (v: number[], f = .5) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
const R = [...reps.values()].filter(r => r.behind.length >= 3);
const free = R.filter(r => r.end && r.tEnd <= 1.0), held = R.filter(r => !(r.end && r.tEnd <= 1.0));
for (const r of free) ends[r.end] = (ends[r.end] ?? 0) + 1;
const row = (label: string, G: any[]) => console.log(`${label.padEnd(26)} n ${String(G.length).padStart(3)} | max |phi| p50 ${q(G.map(r => Math.max(...r.phi))).toFixed(2)} (1 = at his hip) | max angle off the blocker's chest p50 ${q(G.map(r => Math.max(...r.off))).toFixed(0)} deg | max 'behind' p50 ${q(G.map(r => Math.max(...r.behind))).toFixed(2)} (exit at 1.1) | max gap beyond touching p50 ${q(G.map(r => Math.max(...r.apart))).toFixed(2)} yd | control p50 ${q(G.map(r => q(r.ctl))).toFixed(2)} (+ blocker)`);
console.log(`shed-attempt reps ${R.length}`);
row('freed within 1 s', free);
row('still held at 1 s', held);
console.log('how the freed ones ended:', JSON.stringify(ends));
console.log(`held reps past the hip on the rep axis (|phi| >= 1) at some point: ${held.filter(r => Math.max(...r.phi) >= 1).length}/${held.length}; of those, chest angle stayed under 90 deg: ${held.filter(r => Math.max(...r.phi) >= 1 && Math.max(...r.off) < 90).length}`);
console.log(`held reps whose 'behind' ever reached 0.8: ${held.filter(r => Math.max(...r.behind) >= 0.8).length}/${held.length}; control <= 0 (defender in control) for >half the window: ${held.filter(r => r.ctl.filter((c: number) => c <= 0).length > r.ctl.length / 2).length}`);
