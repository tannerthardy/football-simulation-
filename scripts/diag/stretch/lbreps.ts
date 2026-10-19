/** How second-level block reps end (observation only, sim internals). Every
 * run rep whose defender is a linebacker: its end reason (run-contact
 * observer), its duration, and where the runner was relative to the backer
 * at the end; reps still on at the play's end are censored. By concept.
 * node --import tsx scripts/diag/stretch/lbreps.ts [--formations ace_12,i_pro_21] [--concepts iz,oz,power,counter] [--seeds 77,71001,1] */
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const q = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? `${s[s.length >> 2].toFixed(2)}/${s[s.length >> 1].toFixed(2)}/${s[(3 * s.length) >> 2].toFixed(2)}` : '-'; };
const rows = new Map<string, Map<string, number[]>>();
// Separations: the last movement observation of the rep (frame: axis from
// blocker to defender, lat across it), and relative motion at the end.
type V = { x: number; y: number };
const sep = new Map<string, { relN: number[]; relT: number[]; dLat: number[]; mirror: number[]; bLat: number[]; fwdSelf: number[]; stretch: number[] }>();
const lastMove = new WeakMap<object, Record<string, unknown>>();
// Geometry at the rep's first observation: blocker downfield of the backer,
// and the backer's own downhill speed (toward the line, + = toward offense).
const startGeo = new WeakMap<object, { ahead: number; downhill: number; fwd: number; driveUp: number }>();
const sepStart = new Map<string, { ahead: number[]; downhill: number[]; aheadEnd: number[]; driveUp: number[] }>();
const add = (c: string, why: string, dur: number) => {
  const m = rows.get(c) ?? new Map<string, number[]>(); rows.set(c, m);
  (m.get(why) ?? m.set(why, []).get(why)!).push(dur);
};
const Rs = rosters();
for (const formation of list('--formations', 'ace_12,i_pro_21')) for (const concept of list('--concepts', 'iz,oz,power,counter'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,71001,1').map(Number)) {
      const sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs);
      const open = new Set<{ start: number; defender: { slot: string } }>();
      runContactObservers.set(sim, (e, kind, data) => {
        if (!e.defender.slot.startsWith('LB')) return;
        if (kind === 'movement') {
          lastMove.set(e, data);
          if (!startGeo.has(e)) {
            const up = sim.attackDir('O'), dr = data.drive as V;
            startGeo.set(e, { ahead: (e.blocker.pos.x - e.defender.pos.x) * up, downhill: -e.defender.vel.x * up, fwd: data.forward as number, driveUp: dr.x * up });
          }
        }
        if (kind === 'end') {
          const why = String((data as { reason?: string }).reason).replace(/^run: /, 'shed: ');
          add(concept, why, sim.t - e.start); open.delete(e);
          const m = lastMove.get(e);
          if (why === 'separation' && m) {
            const axis = m.axis as V, lat = m.lat as V, bv = e.blocker.vel, dv = e.defender.vel;
            const rel = { x: dv.x - bv.x, y: dv.y - bv.y };
            // axis points from defender to blocker in the rep frame; normal separation is relative motion along -axis.
            const s0 = sep.get(concept) ?? { relN: [], relT: [], dLat: [], mirror: [], bLat: [], fwdSelf: [], stretch: [] }; sep.set(concept, s0);
            s0.relN.push(-(rel.x * axis.x + rel.y * axis.y)); s0.relT.push(Math.abs(rel.x * lat.x + rel.y * lat.y));
            s0.dLat.push(Math.abs(m.dLat as number)); s0.mirror.push(m.mirror as number);
            s0.bLat.push(Math.abs(bv.x * lat.x + bv.y * lat.y)); s0.stretch.push(m.stretch ? 1 : 0);
            const up = sim.attackDir('O'); s0.fwdSelf.push(((e.blocker.pos.x - e.defender.pos.x) * up));
            const g = startGeo.get(e);
            if (g) {
              const s1 = sepStart.get(concept) ?? { ahead: [], downhill: [], aheadEnd: [], driveUp: [] }; sepStart.set(concept, s1);
              s1.ahead.push(g.ahead); s1.downhill.push(g.downhill); s1.aheadEnd.push((e.blocker.pos.x - e.defender.pos.x) * up); s1.driveUp.push(g.driveUp);
            }
          }
        } else open.add(e);
      });
      while (sim.phase === 'live' && sim.t < 10) sim.tick();
      for (const e of open) if (sim.engagements.includes(e as never)) add(concept, 'censored (on at the end)', sim.t - e.start);
    }
for (const [c, v] of sep) console.log(`${c} separations n ${v.relN.length}: relative motion along the rep axis p25/50/75 ${q(v.relN)} | across ${q(v.relT)} | backer's lateral ${q(v.dLat)} vs blocker's mirror cap ${q(v.mirror)}, blocker's achieved lateral ${q(v.bLat)} | blocker downfield of backer (yd) ${q(v.fwdSelf)} | stretch reps ${(100 * v.stretch.reduce((a, b) => a + b, 0) / v.stretch.length).toFixed(0)}%`);
for (const [c, v] of sepStart) console.log(`${c} separations, at rep start: blocker downfield of backer ${q(v.ahead)} yd -> at end ${q(v.aheadEnd)} | backer downhill speed at start ${q(v.downhill)} yd/s | drive line upfield component ${q(v.driveUp)}`);
for (const [c, m] of rows) {
  const n = [...m.values()].reduce((s, v) => s + v.length, 0);
  console.log(`${c}: LB reps ${n}`);
  for (const [why, v] of [...m].sort((a, b) => b[1].length - a[1].length)) console.log(`  ${why.padEnd(34)} ${(100 * v.length / n).toFixed(0).padStart(3)}%  duration p25/50/75 ${q(v)} s`);
}
