/** Receiver-on-DB run reps as the runner goes by (observation only). Per rep:
 * the closest the carrier came to the engaged DB during the rep, whether the
 * DB started a shed attempt, how the rep ended, where the carrier was then
 * (distance, ahead of the DB or past him), and whether this DB touched the
 * carrier afterwards. Zone lab cases; flags from the environment.
 * node --import tsx scripts/diag/stretch/stalkpass.ts [--concepts iz,oz,wz] [--seeds 77,1] [--formations ace_12] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
type Rep = { db: any; t0: number; t1?: number; why?: string; minDc: number; shed: boolean; endDc?: number; endPast?: number; touched: boolean; depth0: number };
const all: Rep[] = [];
const Rs = rosters();
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,1').map(Number)) {
      const sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs);
      const isWR = (a: any) => a.slot === 'X' || a.slot === 'Z';
      const isDB = (a: any) => /^(CB|FS|SS|NB)/.test(a.slot);
      const reps = new Map<object, Rep>();
      const ended: Rep[] = [];
      const dir_ = sim.attackDir('O');
      runContactObservers.set(sim, (e: any, phase, data: any) => {
        if (!isWR(e.blocker) || !isDB(e.defender)) return;
        let r = reps.get(e);
        if (!r) { const c = sim.carrier; r = { db: e.defender, t0: sim.t, minDc: Infinity, shed: false, touched: false, depth0: c ? (c.pos.x - sim.los) * dir_ : -9 }; reps.set(e, r); }
        if (phase === 'end' && r.t1 === undefined) {
          r.t1 = sim.t; r.why = String(data.reason);
          const c = sim.carrier;
          if (c && c.team === 'O') { r.endDc = Math.hypot(c.pos.x - r.db.pos.x, c.pos.y - r.db.pos.y); r.endPast = (c.pos.x - r.db.pos.x) * dir_; }
          ended.push(r);
        }
      });
      while (sim.phase === 'live' && sim.t < 8) {
        sim.tick();
        const c = sim.carrier;
        if (!c || c.team !== 'O') continue;
        for (const [e, r] of reps) {
          if (r.t1 !== undefined) continue;
          r.minDc = Math.min(r.minDc, Math.hypot(c.pos.x - r.db.pos.x, c.pos.y - r.db.pos.y));
          if (r.db.tags?.has('shed-attempt')) r.shed = true;
        }
        for (const r of reps.values()) {
          if (r.touched) continue;
          if (Math.hypot(r.db.pos.x - c.pos.x, r.db.pos.y - c.pos.y) < r.db.profile.radius + c.profile.radius + r.db.profile.reach * .6) r.touched = true;
        }
      }
      for (const r of reps.values()) { if (r.t1 === undefined) { r.why = '(engaged at end)'; } all.push(r); }
    }
const bucket = (x: number) => x < 2 ? '<2' : x < 4 ? '2-4' : x < 6 ? '4-6' : '6+';
const rows: Record<string, { n: number; shed: number; touched: number; why: Record<string, number>; past: number }> = {};
for (const r of all) {
  const k = bucket(r.minDc);
  const s = rows[k] ??= { n: 0, shed: 0, touched: 0, why: {}, past: 0 };
  s.n++; s.shed += +r.shed; s.touched += +r.touched; s.why[r.why!] = (s.why[r.why!] ?? 0) + 1;
  if ((r.endPast ?? -9) > 0) s.past++;
}
console.log(`WR-on-DB reps ${all.length}; by the carrier's closest approach to the engaged DB during the rep:`);
for (const k of ['<2', '2-4', '4-6', '6+']) {
  const s = rows[k]; if (!s) continue;
  console.log(`  ${k.padEnd(4)} reps ${String(s.n).padStart(4)} | shed attempt ${(100 * s.shed / s.n).toFixed(0)}% | DB touched carrier later ${(100 * s.touched / s.n).toFixed(0)}% | carrier past DB at rep end ${(100 * s.past / s.n).toFixed(0)}% | ends ${Object.entries(s.why).sort((a, b) => b[1] - a[1]).map(([w, v]) => `${w} ${v}`).join(', ')}`);
}
