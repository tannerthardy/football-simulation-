/** Re-blocks after the carrier crosses the line (observation only). For every
 * front defender (DL/LB) and DB: each run-rep start after the crossing that
 * follows an earlier rep of his, the gap he was free before it, who blocked
 * him again (same blocker or another, by position), whether that blocker was
 * behind him relative to his facing (more than 90 deg off), and whether the
 * runner was already past him. Zone lab cases; flags from the environment.
 * node --import tsx scripts/diag/stretch/relatch2.ts [--concepts iz,oz,wz] [--seeds 77,1] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const grp = (s: string) => /^(DE|DT|NT)/.test(s) ? 'DL' : /^LB/.test(s) ? 'LB' : 'DB';
const pos = (a: any) => a.player?.position ?? a.slot;
const rows: any[] = [];
let plays = 0;
const Rs = rosters();
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of ['strong', 'weak'] as const) for (const lk of LOOK_SPECS)
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,1').map(Number)) {
      const sim = makeSim({ concept, dir, look: lk[0], roster, seed, formation } as LabCase, Rs);
      plays++;
      const sgn = sim.attackDir('O');
      let crossT = -1;
      const last = new Map<any, { e: any; end: number; blocker: any }>();
      while (sim.phase === 'live' && sim.t < 8) {
        sim.tick();
        const c = sim.carrier;
        if (crossT < 0 && c && c.team === 'O' && (c.pos.x - sim.los) * sgn > 0) crossT = sim.t;
        for (const d of sim.defense) {
          const e = d.engagement as any;
          const prev = last.get(d);
          if (e && (!prev || prev.e !== e)) {
            if (prev && prev.end >= 0 && crossT >= 0 && sim.t > crossT && e.type === 'run') {
              const b = e.blocker === d ? e.defender : e.blocker;
              const toB = Math.atan2(b.pos.y - d.pos.y, b.pos.x - d.pos.x);
              const off = Math.abs(Math.atan2(Math.sin(toB - d.body.facing), Math.cos(toB - d.body.facing))) * 180 / Math.PI;
              rows.push({ g: grp(d.slot), free: sim.t - prev.end, same: b === prev.blocker, by: pos(b), behind: off > 90,
                past: c ? (c.pos.x - d.pos.x) * sgn > 0 : false });
            }
            last.set(d, { e, end: -1, blocker: e.blocker === d ? e.defender : e.blocker });
          } else if (!e && prev && prev.end < 0) prev.end = sim.t;
        }
      }
    }
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : '-'; };
console.log(`plays ${plays}; re-blocks after the crossing (a new rep after an earlier one ended): ${rows.length} (${(rows.length / plays).toFixed(2)}/play)`);
for (const g of ['DL', 'LB', 'DB']) {
  const s = rows.filter(r => r.g === g); if (!s.length) continue;
  const by: Record<string, number> = {}; for (const r of s) by[r.by] = (by[r.by] ?? 0) + 1;
  console.log(`  ${g}: ${s.length} (${(s.length / plays).toFixed(2)}/play) | free before p25/p50 ${q(s.map(r => r.free), .25)}/${q(s.map(r => r.free))} s | same blocker ${(100 * s.filter(r => r.same).length / s.length).toFixed(0)}% | blocker behind his facing ${(100 * s.filter(r => r.behind).length / s.length).toFixed(0)}% | runner already past him ${(100 * s.filter(r => r.past).length / s.length).toFixed(0)}% | by ${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
