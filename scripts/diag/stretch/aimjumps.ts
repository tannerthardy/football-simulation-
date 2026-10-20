/** How stable are players' chosen targets? (observation only, sim internals)
 * Wraps SnapMind.aim, the shared held-target primitive (run fits, block fits,
 * run contact, zone drops), and records each adoption of a new target: how
 * far it moved from the previous target of the same job, and whether it now
 * lies on the other side of the player across the field (a reversal of the
 * lateral direction it asks for, by more than 0.5 yd each side). Per group:
 * adoptions per second, jumps over 1 yd per second, side flips per second.
 * node --import tsx scripts/diag/stretch/aimjumps.ts [--formations ..] [--concepts ..] [--seeds ..] */
import { SnapMind } from '../../../src/sim/mind.js';
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
type V = { x: number; y: number };
const owner = new Map<SnapMind, { pos: V; slot: string; team: string }>();
const last = new Map<SnapMind, Map<string, V>>();
const rows = new Map<string, { sec: number; adopt: number; jump: number; flip: number; jobs: Record<string, number> }>();
let now = 0;
const groupOf = (team: string, slot: string) => team === 'O' ? (['LT', 'LG', 'C', 'RG', 'RT'].includes(slot) ? 'O OL' : slot === 'Y' || slot === 'H' ? 'O TE' : slot === 'F' ? 'O FB' : 'O ' + slot)
  : slot.startsWith('DE') || slot.startsWith('DT') || slot === 'NT' ? 'D DL' : slot.startsWith('LB') ? 'D LB' : 'D DB';
const original = SnapMind.prototype.aim;
SnapMind.prototype.aim = function (this: SnapMind, job: string, desired: V, t: number): V {
  const out = original.call(this, job, desired, t);
  const who = owner.get(this), prevJobs = last.get(this) ?? new Map<string, V>(); last.set(this, prevJobs);
  const key = job.split(':')[0], prev = prevJobs.get(job);
  if (who && prev !== out) {
    const row = rows.get(groupOf(who.team, who.slot))!;
    row.adopt++; row.jobs[key] = (row.jobs[key] ?? 0) + 1;
    if (prev) {
      if (Math.hypot(out.x - prev.x, out.y - prev.y) > 1) row.jump++;
      const a = prev.y - who.pos.y, b = out.y - who.pos.y;
      if (Math.abs(a) > .5 && Math.abs(b) > .5 && Math.sign(a) !== Math.sign(b)) row.flip++;
    }
    prevJobs.set(job, out);
  }
  return out;
};
const Rs = rosters();
for (const formation of list('--formations', 'i_pro_21,ace_12')) for (const concept of list('--concepts', 'power,counter,duo,trap'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77').map(Number)) {
      owner.clear(); last.clear();
      const sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs);
      for (const a of sim.agents) {
        owner.set(a.mind, { pos: a.pos, slot: a.slot, team: a.team });
        const k = groupOf(a.team, a.slot); if (!rows.has(k)) rows.set(k, { sec: 0, adopt: 0, jump: 0, flip: 0, jobs: {} });
      }
      while (sim.phase === 'live' && sim.t < 3.5) {
        for (const a of sim.agents) owner.get(a.mind)!.pos = { ...a.pos };
        sim.tick(); now = sim.t;
      }
      for (const a of sim.agents) rows.get(groupOf(a.team, a.slot))!.sec += sim.t;
    }
console.log('per player-second: target adoptions, jumps > 1 yd, side flips (by job)');
for (const [k, r] of [...rows].sort()) if (r.adopt) console.log(`${k.padEnd(6)} adopt ${(r.adopt / r.sec).toFixed(2)} jump ${(r.jump / r.sec).toFixed(2)} flip ${(r.flip / r.sec).toFixed(2)} | ${Object.entries(r.jobs).map(([j, n]) => `${j} ${(n / r.sec).toFixed(2)}`).join(', ')}`);
