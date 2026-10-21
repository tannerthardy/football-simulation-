/** Offensive linemen's first second on lab run cases (observation only):
 * requested and achieved lateral speed toward the play side and upfield
 * speed, by plan kind and engaged or not, in 0.25 s windows.
 * node --import tsx scripts/diag/runblock/ol-first-second.ts [--concepts oz,wz] [--seeds 77,71001] */
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const R = rosters();
const rows = new Map<string, number[][]>();
const W = [.25, .5, .75, 1.0, 1.25];
for (const concept of list('--concepts', 'oz,wz')) for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
  for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,71001').map(Number)) {
    const sim = makeSim({ concept, dir, look, roster, seed, formation: list('--formations', 'ace_12')[0] } as LabCase, R);
    const ps = dir === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign, ad = sim.attackDir('O');
    const ol = sim.offense.filter(a => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot));
    while (sim.phase === 'live' && sim.t < 1.25) {
      sim.tick();
      const w = W.find(x => sim.t <= x + 1e-9 && sim.t > x - .25 + 1e-9);
      if (w === undefined) continue;
      const it = (sim as any).intents;
      for (const a of ol) {
        const kind = a.behavior instanceof RunBlocker ? a.behavior.plan.kind : a.behavior.kind;
        const k = `${w.toFixed(2)} ${kind}${a.engagement ? ' engaged' : ''}`;
        const r = rows.get(k) ?? []; rows.set(k, r);
        r.push([it[a.idx].vel.y * ps, a.vel.y * ps, it[a.idx].vel.x * ad, a.vel.x * ad]);
      }
    }
  }
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
console.log('window kind: n | lateral req / achieved | upfield req / achieved (yd/s, play side +)');
for (const [k, r] of [...rows].sort()) if (r.length > 40)
  console.log(`${k.padEnd(24)} ${String(r.length).padStart(5)} | ${mean(r.map(x => x[0])).toFixed(2)} / ${mean(r.map(x => x[1])).toFixed(2)} | ${mean(r.map(x => x[2])).toFixed(2)} / ${mean(r.map(x => x[3])).toFixed(2)}`);
