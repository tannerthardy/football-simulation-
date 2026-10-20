/** Receiver-on-DB run reps (observation only): how many, how long, how they
 * end (run-contact observer end reasons), and whether the engaged DB is the
 * carrier's first contact or reaches the carrier at all. Zone lab cases.
 * node --import tsx scripts/diag/stretch/stalkreps.ts [--concepts iz,oz,wz] [--seeds 77,1] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const reasons: Record<string, number> = {};
const dur: number[] = [];
let plays = 0, reps = 0, dbStalked = 0, stalkedDbTouches = 0, stalkedDbs = 0, longRuns = 0, longRunsWithStalk = 0;
const Rs = rosters();
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,1').map(Number)) {
      const sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs);
      plays++;
      const starts = new Map<object, number>(), stalked = new Set<object>();
      const isWR = (a: any) => a.slot === 'X' || a.slot === 'Z';
      const isDB = (a: any) => /^(CB|FS|SS|NB)/.test(a.slot);
      runContactObservers.set(sim, (e: any, phase) => {
        if (!isWR(e.blocker) || !isDB(e.defender)) return;
        if (!starts.has(e)) { starts.set(e, sim.t); reps++; stalked.add(e.defender); }
      });
      const ends = new Map<object, string>();
      const prev = runContactObservers.get(sim)!;
      runContactObservers.set(sim, (e: any, phase, data) => { prev(e, phase, data); if (phase === 'end' && starts.has(e) && !ends.has(e)) { ends.set(e, String(data.reason)); dur.push(sim.t - starts.get(e)!); } });
      const touched = new Set<object>();
      while (sim.phase === 'live' && sim.t < 8) {
        sim.tick();
        const c = sim.carrier;
        if (c && c.team === 'O') for (const d of sim.defense) if (Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < d.profile.radius + c.profile.radius + d.profile.reach * .6) touched.add(d);
      }
      for (const [e, t0] of starts) if (!ends.has(e)) { reasons['(still engaged at end)'] = (reasons['(still engaged at end)'] ?? 0) + 1; dur.push(sim.t - t0); }
      for (const r of ends.values()) reasons[r] = (reasons[r] ?? 0) + 1;
      stalkedDbs += stalked.size; for (const d of stalked) if (touched.has(d)) stalkedDbTouches++;
      const gain = ((sim.carrier ?? sim.qb).pos.x - sim.los) * sim.attackDir('O');
      if (gain >= 20) { longRuns++; if (stalked.size) longRunsWithStalk++; }
      if (stalked.size) dbStalked++;
    }
const q = (f: number) => { const s = [...dur].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(f * s.length))].toFixed(2) : '-'; };
console.log(`plays ${plays}; WR-on-DB run reps ${reps} (${(reps / plays).toFixed(2)}/play); plays with a stalked DB ${dbStalked}`);
console.log(`rep duration p25/p50/p75 ${q(.25)}/${q(.5)}/${q(.75)} s; ends: ${Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`stalked DBs reaching the carrier ${stalkedDbTouches}/${stalkedDbs}; 20+ runs ${longRuns}, with a stalked DB ${longRunsWithStalk}`);
