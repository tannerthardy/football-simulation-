/** Why zone doubles stay doubled (observation only). For each double on the
 * lab's zone cases: when it formed, when both members first shared the
 * defender (joined), when one climbed, and what held each joined read
 * (blocking.ts comboReadObservers): the keeper check and its failing
 * conditions, the partner's surface, the 0.15 s confirmation, the backer
 * not yet showing, or no climb route. Medians by concept.
 * node --import tsx scripts/diag/runblock/combo-reads.ts [--concepts iz,oz,wz] [--seeds 77,71001,1,2] [--formations ace_12] */
import { comboReadObservers, RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? +s[Math.floor(f * (s.length - 1))].toFixed(2) : NaN; };
const R = rosters();
const byConcept = new Map<string, { formed: number[]; joined: number[]; released: number[]; dur: number[]; never: number; n: number;
  stages: Map<string, number>; keeper: Map<string, number>; backerStops: number; plays: number }>();
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of ['strong', 'weak'] as const) for (const lk of LOOK_SPECS.map((l) => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,71001,1,2').map(Number)) {
      const c: LabCase = { concept, dir, look: lk, roster, seed, formation };
      const sim = makeSim(c, R);
      const S = byConcept.get(concept) ?? { formed: [], joined: [], released: [], dur: [], never: 0, n: 0, stages: new Map<string, number>(), keeper: new Map<string, number>(), backerStops: 0, plays: 0 };
      byConcept.set(concept, S); S.plays++;
      const combos = new Map<any, { formed: number; joined?: number; released?: number; backer: number }>();
      comboReadObservers.set(sim, (_o, combo, stage, d) => {
        const r = combos.get(combo); if (r && r.joined === undefined) r.joined = sim.t;
        S.stages.set(stage, (S.stages.get(stage) ?? 0) + 1);
        if (stage === 'keeper') for (const [k, v] of Object.entries(d)) if (v) S.keeper.set(k, (S.keeper.get(k) ?? 0) + 1);
      });
      while (sim.phase === 'live' && sim.t < 8) {
        sim.tick();
        for (const a of sim.offense) {
          const combo = a.behavior instanceof RunBlocker ? a.behavior.plan.combination : undefined;
          if (combo?.backer && !combos.has(combo)) combos.set(combo, { formed: sim.t, backer: combo.backer.idx });
        }
        for (const [combo, r] of combos) if (r.released === undefined && combo.released) {
          r.released = sim.t; if (r.joined === undefined) r.joined = sim.t;
        }
      }
      const stopper = sim.events.find((e) => e.type === 'carrier_contact')?.b;
      for (const r of combos.values()) {
        S.n++; S.formed.push(r.formed);
        if (r.joined !== undefined) S.joined.push(r.joined);
        if (r.released !== undefined) { S.released.push(r.released); if (r.joined !== undefined) S.dur.push(r.released - r.joined); } else S.never++;
        if (stopper === r.backer) S.backerStops++;
      }
    }
for (const [k, S] of byConcept) {
  const tot = [...S.stages.values()].reduce((a, b) => a + b, 0) || 1;
  console.log(`${k}: plays ${S.plays}, doubles ${S.n} | formed p50 ${q(S.formed)} s | joined p50 ${q(S.joined)} s | released ${S.released.length} (never ${S.never}) at p50 ${q(S.released)} s | joined->climb p25/50/75 ${q(S.dur, .25)}/${q(S.dur)}/${q(S.dur, .75)} s | backer made first contact on ${S.backerStops} doubles`);
  console.log('  held reads: ' + [...S.stages].sort((a, b) => b[1] - a[1]).map(([s, v]) => `${s} ${(100 * v / tot).toFixed(0)}%`).join(', '));
  const kt = S.stages.get('keeper') || 1;
  console.log('  keeper check failing condition (share of keeper holds): ' + [...S.keeper].sort((a, b) => b[1] - a[1]).map(([s, v]) => `${s} ${(100 * v / kt).toFixed(0)}%`).join(', '));
}
