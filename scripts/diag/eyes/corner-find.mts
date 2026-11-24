/** QB_CANON_SEEN corner finding (Flex, 2026-11-24): how often the passer's positional corner rule (qbmind.ts cornersSeen,
 * called here directly: per side, the widest defensive back within 12 yd of the line and 4+ yd off the ball, in his
 * QB_SCAN picture) names a man who is not the outside
 * corner, on press, bunch/stack, condensed splits and rotated / inverted safeties; and what the miss does downstream (the
 * quick-game answer he checks to, against the answer the true corners give). Staged pre-snap only: no World steps.
 * Truth per side = the CB_S / CB_W standing widest on that side (true positions). Kinds of miss:
 *   other  - he names a safety / nickel / backer instead
 *   none   - he finds no one on that side; "both" = no corner on either side, so quickCheck falls back to its default
 * "rule" = the rule on true positions already misses; "scan" = only his scan error makes it miss.
 * usage: node --import tsx scripts/diag/eyes/corner-find.mts [seeds=60] */
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { cornersSeen } from '../../../src/sim/qbmind.js';
import { DEF_PERSONNEL } from '../../../src/playbook/types.js';

type V = { x: number; y: number };
const N = Number(process.argv[2] ?? 60);
const off = generateTeam(new Rng(41), 'Probe O', 'PRBO', { strength: .55 });
const def = generateTeam(new Rng(42), 'Probe D', 'PRBD', { strength: .55 });
const CASES: { name: string; form: string; cov: string; ballY?: number; room?: number; pers?: 'nickel' | 'base43' }[] = [
  { name: 'doubles, cover 3 (control)', form: 'gun_doubles_11', cov: 'cover3' },
  { name: 'press: doubles, cover 1', form: 'gun_doubles_11', cov: 'cover1' },
  { name: 'press: doubles, 2-man', form: 'gun_doubles_11', cov: 'cover2man' },
  { name: 'press: trips, cover 0', form: 'gun_trips_11', cov: 'cover0' },
  { name: 'bunch, cover 1 banjo', form: 'gun_bunch_11', cov: 'cover1_banjo' },
  { name: 'bunch, cover 3', form: 'gun_bunch_11', cov: 'cover3' },
  { name: 'stack/wing: ace 12, cover 3', form: 'ace_12', cov: 'cover3', pers: 'base43' },
  { name: 'condensed: doubles room+6, cover 1', form: 'gun_doubles_11', cov: 'cover1', room: 6 },
  { name: 'condensed: doubles room+6, cover 3', form: 'gun_doubles_11', cov: 'cover3', room: 6 },
  { name: 'condensed: trips room+6, cover 4', form: 'gun_trips_11', cov: 'cover4', room: 6 },
  { name: 'boundary hash: doubles, cover 2', form: 'gun_doubles_11', cov: 'cover2', ballY: 18.5 },
  { name: 'heavy 13, cover 1', form: 'heavy_13', cov: 'cover1', pers: 'base43' },
  { name: 'rolled: cover 3 buzz', form: 'gun_doubles_11', cov: 'cover3_buzz' },
  { name: 'rolled: cover 3 cloud', form: 'gun_doubles_11', cov: 'cover3_cloud' },
  { name: 'rolled: cover 2 invert', form: 'gun_doubles_11', cov: 'cover2_invert' },
  { name: 'rolled: cover 6 rev', form: 'gun_doubles_11', cov: 'cover6_rev' },
  { name: 'rolled: cover 8 trix', form: 'gun_trips_11', cov: 'cover8_trix' },
];
const RECS = [0.2, 0.5, 0.9];

function pickIdx(P: V[], db: boolean[], los: number, by: number, side: number): number {
  const pts = P.map((p, i) => ({ p, db: db[i] }));
  const got = cornersSeen(pts, los, by).find((q) => (q.y - by) * side > 0);
  return got ? P.indexOf(got) : -1;
}
const quick = (depth: number) => depth > 5 ? 'hitches' : depth < 2.5 ? 'slant_flat' : 'quick_outs';

console.log('| case | rec | sides | right | other: rule / scan | none: rule / scan | other is | |depth err| on a right pick (yd) | quick answer differs | both missed | errors |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const c of CASES) {
  const formation = FORMATION_BY_ID[c.form], coverage = COVERAGE_BY_ID[c.cov];
  if (!formation || !coverage) { console.log(`| ${c.name} | missing ${!formation ? c.form : c.cov} |`); continue; }
  const pers = c.pers ?? 'nickel';
  for (const rec of RECS) {
    let both = 0, sides = 0, right = 0, oRule = 0, oScan = 0, nRule = 0, nScan = 0, qd = 0, plays = 0, errs = 0; const who = new Map<string, number>(); const dErr: number[] = [];
    for (let s = 0; s < N; s++) {
      try {
        const sim = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, pers),
          offCall: { formation, flip: s % 2 === 1, kind: 'pass', pass: PASS_BY_ID.hitches, label: 'probe' },
          defCall: { personnel: pers, front: FRONT_BY_ID.over, coverage, pressure: null, label: 'probe' },
          los: 40, ballY: c.ballY ?? 26.67, firstDownX: 50, seed: 1000 + s, audibles: false,
          ...(c.room != null ? { offStyle: { wrRoom: c.room } } : {}) } as ConstructorParameters<typeof PlaySim>[0]);
        const qb = sim.qbMind as unknown as { rec: number; scanErr: Map<unknown, V>; scanned(d: unknown): V };
        qb.rec = rec; qb.scanErr.clear();
        const T = sim.defense.map((d) => ({ x: d.pos.x, y: d.pos.y })), S = sim.defense.map((d) => qb.scanned(d));
        const los = sim.los, by = sim.ballY; plays++;
        const db = sim.defense.map((d) => { const g = DEF_PERSONNEL[pers]?.[d.slot as keyof typeof DEF_PERSONNEL['nickel']]; return g === 'CB' || g === 'S'; });
        let found = 0;
        const seenD: number[] = [], trueD: number[] = [];
        for (const side of [1, -1]) {
          let tc = -1;
          sim.defense.forEach((d, i) => { if ((d.slot === 'CB_S' || d.slot === 'CB_W') && (T[i].y - by) * side > 0 && (tc < 0 || (T[i].y - by) * side > (T[tc].y - by) * side)) tc = i; });
          if (tc < 0) continue;
          sides++; trueD.push(T[tc].x - los);
          const r = pickIdx(T, db, los, by, side), k = pickIdx(S, db, los, by, side);
          if (k >= 0) { seenD.push(S[k].x - los); found++; }
          if (k === tc) { right++; dErr.push(Math.abs(S[k].x - T[tc].x)); continue; }
          if (k < 0) { if (r < 0) nRule++; else nScan++; continue; }
          if (r === tc) oScan++; else oRule++;
          const sl = sim.defense[k].slot; who.set(sl, (who.get(sl) ?? 0) + 1);
        }
        if (!found) both++;
        const mean = (a: number[], dflt: number) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : dflt;
        if (quick(mean(seenD, 6)) !== quick(mean(trueD, 6))) qd++;
      } catch (e) { errs++; if (errs === 1) console.error(c.name, String(e).slice(0, 200)); }
    }
    const pct = (n: number, d: number) => d ? (100 * n / d).toFixed(1) + '%' : '-';
    const med = dErr.sort((a, b) => a - b)[Math.floor(dErr.length / 2)] ?? NaN;
    console.log(`| ${c.name} | ${rec} | ${sides} | ${pct(right, sides)} | ${pct(oRule, sides)} / ${pct(oScan, sides)} | ${pct(nRule, sides)} / ${pct(nScan, sides)} | ${[...who].map(([k, v]) => `${k} ${v}`).join(', ') || '-'} | ${med.toFixed(2)} | ${pct(qd, plays)} | ${pct(both, plays)} | ${errs} |`);
  }
}
