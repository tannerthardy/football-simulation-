/** Why a freed lineman is slow after the runner crosses (observation only).
 * Zone lab cases with flags from the environment. At the carrier's crossing
 * + DT s, every DL not in a rep or a tackle and still up: time since his last
 * rep ended (or "never engaged"), requested vs achieved speed, balance
 * capacity (support availability), body facing vs his requested travel,
 * clearance to the nearest other body, and whether the carrier is past him.
 * node --import tsx scripts/diag/depth/freedl.ts [--dt 0.5] [--concepts iz,oz,wz] [--seeds 77,1] */
import { fatigueFactor } from '../../../src/physics/kinematics.js';
import { availability, supportParams } from '../../../src/physics/support.js';
import type { Agent } from '../../../src/sim/agent.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const DT = Number(arg('--dt', '0.5'));
const ang = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI;
const q = (v: number[], f = .5) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] : NaN;
const rows: any[] = [], ends: any[] = [];
const Rs = rosters();
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of ['strong', 'weak'] as const) for (const lk of LOOK_SPECS)
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,1').map(Number)) {
      const sim = makeSim({ concept, dir, look: lk[0], roster, seed, formation } as LabCase, Rs);
      const sgn = sim.attackDir('O');
      const lastRep = new Map<Agent, number>();
      let crossT = -1;
      // How DL run reps end: the reason, and where the carrier is then.
      runContactObservers.set(sim, (e: any, kind: string, info: any) => {
        if (kind !== 'end' || !/^(DE|DT|NT)/.test(e.defender.slot)) return;
        const c = sim.carrier;
        const passed = c && c.team === 'O' ? (c.pos.x - e.defender.pos.x) * sgn : NaN;
        const dist = c ? Math.hypot(c.pos.x - e.defender.pos.x, c.pos.y - e.defender.pos.y) : NaN;
        ends.push({ why: String(info?.reason ?? '').split(':')[0], rel: crossT < 0 ? (c && c !== sim.qb ? 'behind LOS' : 'pre-handoff') : 'after crossing', passed, dist });
      });
      while (sim.phase === 'live' && sim.t < 8) {
        sim.tick();
        for (const d of sim.defense) if (d.engagement) lastRep.set(d, sim.t);
        const c = sim.carrier;
        if (!c || c.team !== 'O') continue;
        if (crossT < 0 && (c.pos.x - sim.los) * sgn > 0) crossT = sim.t;
        if (crossT < 0 || sim.t < crossT + DT) continue;
        for (const d of sim.defense) {
          if (!/^(DE|DT|NT)/.test(d.slot) || d.engagement || sim.bond?.tacklers.includes(d) || d.isDown(sim.t)) continue;
          const it = (sim as any).intents[d.idx];
          const req = it ? Math.hypot(it.vel.x, it.vel.y) : 0;
          const sup = d.body.support;
          const cap = sup ? availability(sup, supportParams(d.profile), fatigueFactor(d.body.energy)) : 1;
          const reqHeading = it && req > .4 ? Math.atan2(it.vel.y, it.vel.x) : d.facing;
          let clear = Infinity;
          for (const o of sim.agents) if (o !== d) clear = Math.min(clear, Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) - o.profile.radius - d.profile.radius);
          const since = lastRep.has(d) ? sim.t - lastRep.get(d)! : null;
          rows.push({ req, v: d.speed, cap, face: ang(d.facing - reqHeading), clear, since, past: (c.pos.x - d.pos.x) * sgn > 0 });
        }
        break;
      }
    }
const show = (label: string, r: any[]) => console.log(`${label.padEnd(30)} n ${String(r.length).padStart(4)} | request p50 ${q(r.map(x => x.req)).toFixed(1)} achieved p25/50/75 ${q(r.map(x => x.v), .25).toFixed(1)}/${q(r.map(x => x.v)).toFixed(1)}/${q(r.map(x => x.v), .75).toFixed(1)} | capacity p50 ${q(r.map(x => x.cap)).toFixed(2)} (<0.9: ${(100 * r.filter(x => x.cap < .9).length / Math.max(1, r.length)).toFixed(0)}%) | facing off request p50 ${q(r.map(x => x.face)).toFixed(0)} deg | clearance p50 ${q(r.map(x => x.clear)).toFixed(2)} yd (touching ${(100 * r.filter(x => x.clear < .05).length / Math.max(1, r.length)).toFixed(0)}%)`);
console.log(`Free DL at crossing + ${DT} s`);
show('all', rows);
show('never engaged', rows.filter(r => r.since === null));
for (const [lo, hi] of [[0, .25], [.25, .5], [.5, 1], [1, 9]]) show(`rep ended ${lo}-${hi} s ago`, rows.filter(r => r.since !== null && r.since >= lo && r.since < hi));
show('requesting >= 5 yd/s', rows.filter(r => r.req >= 5));

console.log('DL run-rep endings (all, by carrier state):');
const keys = [...new Set(ends.map(e => `${e.rel} | ${e.why}`))].sort();
for (const k of keys) {
  const r = ends.filter(e => `${e.rel} | ${e.why}` === k);
  console.log(`  ${k.padEnd(44)} n ${String(r.length).padStart(5)} | carrier dist p50 ${q(r.map(x => x.dist).filter(Number.isFinite)).toFixed(1)} past him p50 ${q(r.map(x => x.passed).filter(Number.isFinite)).toFixed(1)}`);
}
