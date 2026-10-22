/** The sim's pre-snap secondary by coverage role (observation only; flags from
 * the environment). Pure alignment, no play: every coverage against 2x2 and
 * 3x1 sets, the ball on each hash and the middle. For each corner and safety,
 * the role his coverage gives him, his depth, his leverage on the nearest
 * receiver (+ outside) and, for safeties, his distance from the middle of the
 * field. Same summaries as scripts/diag/align/nfl_scheme.py's defense block.
 * node --import tsx scripts/diag/align/sim_scheme.ts */
import { FIELD_WIDTH, HASH_LEFT_Y, HASH_RIGHT_Y, CENTER_Y } from '../../../src/core/field.js';
import { alignDefense, alignOffense } from '../../../src/playbook/alignment.js';
import { COVERAGES } from '../../../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { DEF_PERSONNEL, type DefSlot } from '../../../src/playbook/types.js';

const rows = new Map<string, { depth: number[]; lev: number[]; mid: number[] }>();
const add = (k: string, depth: number, lev: number | null, mid: number) => {
  const r = rows.get(k) ?? { depth: [], lev: [], mid: [] }; rows.set(k, r);
  r.depth.push(depth); if (lev !== null) r.lev.push(lev); r.mid.push(mid);
};
const los = 40;
for (const cov of COVERAGES) for (const fid of ['gun_doubles_11', 'gun_trips_11']) for (const ballY of [HASH_LEFT_Y, CENTER_Y, HASH_RIGHT_Y]) {
  const off = alignOffense(FORMATION_BY_ID[fid], false, los, ballY);
  const present = Object.keys(DEF_PERSONNEL.nickel) as DefSlot[];
  const def = alignDefense({ personnel: 'nickel', front: FRONT_BY_ID.over, coverage: cov, pressure: null, label: '' }, off, present);
  const wide = Object.values(off.spots).filter(s => !s.backfield && !s.inline && !['LT', 'LG', 'C', 'RG', 'RT', 'QB'].includes(s.slot));
  for (const slot of ['CB_S', 'CB_W', 'NB', 'FS', 'SS'] as DefSlot[]) {
    const s = def.spots[slot]; if (!s) continue;
    const role = cov.roles[slot];
    const name = !role ? 'underneath' : role.kind === 'zone' ? role.zone : role.kind === 'man' ? `man${role.lev ? '-' + role.lev : ''}${role.trail ? '-trail' : ''}` : role.kind;
    const pos = slot.startsWith('CB') || slot === 'NB' ? 'CB' : 'S';
    const r = wide.length ? wide.reduce((a, b) => Math.abs(a.pos.y - s.pos.y) < Math.abs(b.pos.y - s.pos.y) ? a : b) : null;
    const lev = r && Math.abs(r.pos.y - s.pos.y) < 4 ? (s.pos.y - r.pos.y) * Math.sign(r.pos.y - ballY) : null;
    add(`${pos.padEnd(2)} ${cov.family ?? cov.id} ${cov.press ? 'press' : 'off'} ${name}`, s.pos.x - los, lev, Math.abs(s.pos.y - FIELD_WIDTH / 2));
  }
}
const med = (v: number[]) => v.length ? [...v].sort((a, b) => a - b)[v.length >> 1].toFixed(2) : '-';
for (const [k, r] of [...rows].sort()) console.log(`${k.padEnd(44)} depth ${med(r.depth)}  lev ${med(r.lev)}  from middle ${med(r.mid)}  (n ${r.depth.length})`);
