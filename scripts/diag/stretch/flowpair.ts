/** What limits an engaged stretch pair's lateral flow? (observation only).
 * Outside/wide zone lab cases: every engaged run rep, from the run-contact
 * observer's movement record each tick, play side positive: the blocker's
 * lateral request terms (defender lateral speed dLat, felt cue, seal
 * correction, the mirror bound, the final lateral after the stretch rule,
 * anchored or not), the defender's lateral request and the achieved lateral
 * speeds of both. Medians by window after the snap; and how often the
 * blocker's seal is at its mirror bound or below the defender's speed.
 * node --import tsx scripts/diag/stretch/flowpair.ts [--concepts oz,wz] [--formations ace_12] [--seeds 77,1] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const WINDOWS: [string, number, number][] = [['0.4-1.0', .4, 1], ['1.0-1.6', 1, 1.6], ['1.6-2.4', 1.6, 2.4]];
type Row = Record<string, number[]> & { n: number[] };
const rows = new Map<string, Row>();
const add = (k: string, key: string, v: number) => { const r = rows.get(k) ?? ({ n: [] } as unknown as Row); rows.set(k, r); (r[key] ??= []).push(v); };
const Rs = rosters();
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'oz,wz'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,1').map(Number)) {
      const sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs);
      const ps = dir === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
      const seen: { e: any; d: Record<string, any> }[] = [];
      runContactObservers.set(sim, (e, phase, data) => { if (phase === 'movement' && data.stretch) seen.push({ e, d: data }); });
      while (sim.phase === 'live' && sim.t < 2.4) {
        seen.length = 0;
        const t = sim.t;
        sim.tick();
        const w = WINDOWS.find(([, a, b]) => t >= a && t < b);
        if (!w) continue;
        for (const { e, d } of seen) {
          const lat = d.lat as { x: number; y: number }, s = Math.sign(lat.y) * ps; // lat frame -> play side
          const k = `${w[0]} ${e.helpers.length ? 'double' : 'single'}`;
          const it = (sim as any).intents;
          add(k, 'dLat', d.dLat * s); add(k, 'correction', d.correction * s); add(k, 'seal', d.seal * s);
          add(k, 'mirror', d.mirror); add(k, 'lateral', d.lateral * s); add(k, 'anchored', d.anchored ? 1 : 0);
          add(k, 'Breq', it[e.blocker.idx].vel.y * ps); add(k, 'Dreq', it[e.defender.idx].vel.y * ps);
          add(k, 'Bvel', e.blocker.vel.y * ps); add(k, 'Dvel', e.defender.vel.y * ps);
          add(k, 'atBound', Math.abs(Math.abs(d.seal) - d.mirror) < 1e-6 ? 1 : 0);
          add(k, 'n', 1);
        }
      }
    }
const keys = ['dLat', 'correction', 'seal', 'mirror', 'lateral', 'Breq', 'Dreq', 'Bvel', 'Dvel'];
console.log('engaged stretch reps, play side +, medians (yd/s) | share anchored, seal at mirror bound');
console.log(`${'window/kind'.padEnd(16)} ${'n'.padStart(6)} ` + keys.map(k => k.padStart(10)).join('') + '   anchored  atBound');
for (const [k, r] of [...rows].sort()) {
  const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
  console.log(`${k.padEnd(16)} ${String(r.n.length).padStart(6)} ` + keys.map(x => med(r[x]).toFixed(2).padStart(10)).join('') + `   ${(100 * mean(r.anchored)).toFixed(0).padStart(6)}%  ${(100 * mean(r.atBound)).toFixed(0).padStart(5)}%`);
}
