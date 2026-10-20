/** Secondary depth by slot and coverage on zone lab runs (observation only):
 * each DB's depth past the line at the snap, at the handoff + 0.5 s and when
 * the carrier crosses the line, his speed toward the line at the crossing,
 * and the run-fit job he holds then. Flags from the environment.
 * node --import tsx scripts/diag/stretch/dbslots.ts [--concepts iz,oz,wz] [--seeds 77,1] [--formations ace_12] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const rows = new Map<string, { snap: number[]; h5: number[]; cross: number[]; down: number[]; job: Record<string, number> }>();
const Rs = rosters();
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of ['strong', 'weak'] as const) for (const lk of LOOK_SPECS)
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,1').map(Number)) {
      const sim = makeSim({ concept, dir, look: lk[0], roster, seed, formation } as LabCase, Rs);
      const sgn = sim.attackDir('O');
      const dbs = sim.defense.filter(a => /^(CB|FS|SS|NB|S)/.test(a.slot));
      const depth = (a: any) => (a.pos.x - sim.los) * sgn;
      const snap = new Map(dbs.map(a => [a, depth(a)]));
      const h5 = new Map<any, number>(); let crossed = false;
      while (sim.phase === 'live' && sim.t < 6) {
        sim.tick();
        if (sim.handoffAt >= 0 && !h5.size && sim.t >= sim.handoffAt + .5) for (const a of dbs) h5.set(a, depth(a));
        const c = sim.carrier;
        if (!crossed && c && c.team === 'O' && depth(c) > 0) {
          crossed = true;
          for (const a of dbs) {
            const k = `${lk[3].padEnd(10)} ${a.slot}`;
            const r = rows.get(k) ?? { snap: [], h5: [], cross: [], down: [], job: {} };
            rows.set(k, r);
            r.snap.push(snap.get(a)!); r.h5.push(h5.get(a) ?? depth(a)); r.cross.push(depth(a)); r.down.push(-a.vel.x * sgn);
            const j = a.runFit ? `${a.runFit.kind}` : a.behavior.kind;
            r.job[j] = (r.job[j] ?? 0) + 1;
          }
          break;
        }
      }
    }
const m = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)].toFixed(1).padStart(5); };
console.log('coverage   slot   n   depth snap / h+.5 / cross   downhill at cross   job at cross');
for (const [k, r] of [...rows].sort()) console.log(`${k.padEnd(16)} ${String(r.snap.length).padStart(3)} ${m(r.snap)} /${m(r.h5)} /${m(r.cross)}   ${m(r.down)}   ${Object.entries(r.job).sort((a, b) => b[1] - a[1]).map(([j, n]) => `${j} ${n}`).join(', ')}`);
