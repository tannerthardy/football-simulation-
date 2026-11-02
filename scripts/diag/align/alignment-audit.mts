/**
 * Pre-snap alignment audit (observation only; docs/FORMATION_CATALOG_PLAN.md).
 * Every formation × flip × hash against every defensive personnel ×
 * installable front × coverage (no pressure), aligned with the production
 * alignOffense/alignDefense. Reports bodies closer than MIN, fewer than seven
 * offensive players near the line, defenders in or near the neutral zone or
 * out of bounds, and shells that show fewer deep players than their look.
 * Some combinations are never called by the automatic callers, so counts are
 * upper bounds. Usage: npx tsx scripts/diag/align/alignment-audit.mts [root] > out/align-audit.json
 */
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');
const { FORMATIONS } = await import(`${root}/src/playbook/formations.ts`);
const { FRONTS, COVERAGES } = await import(`${root}/src/playbook/defense.ts`);
const { DEF_PERSONNEL } = await import(`${root}/src/playbook/types.ts`);
const { alignOffense, alignDefense } = await import(`${root}/src/playbook/alignment.ts`);
const { coverageHasNamedZonePlayers } = await import(`${root}/src/playbook/call-integrity.ts`);

const LOS = 40;
const HASHES: Record<string, number> = { left: 29.73, mid: 26.67, right: 23.6 };
const MIN = 0.9; // yd between body centres
type Spot = { slot: string; pos: { x: number; y: number } };
const counts: Record<string, number> = {};
const byKey: Record<string, Record<string, number>> = {};
const examples: Record<string, string[]> = {};
const note = (issue: string, key: string, ex: string) => {
  counts[issue] = (counts[issue] ?? 0) + 1;
  (byKey[issue] ??= {})[key] = (byKey[issue][key] ?? 0) + 1;
  if ((examples[issue] ??= []).length < 12) examples[issue].push(ex);
};
let looks = 0, alignments = 0;
for (const f of FORMATIONS) for (const flip of [false, true]) for (const [hash, y] of Object.entries(HASHES)) {
  const off = alignOffense(f, flip, LOS, y, {});
  const tag = `${f.id}${flip ? ' flip' : ''} ${hash}`;
  looks++;
  const os = Object.values(off.spots) as Spot[];
  for (let i = 0; i < os.length; i++) for (let j = i + 1; j < os.length; j++) {
    const d = Math.hypot(os[i].pos.x - os[j].pos.x, os[i].pos.y - os[j].pos.y);
    if (d < MIN) note('offense bodies within MIN', `${os[i].slot}-${os[j].slot}`, `${tag}: ${d.toFixed(2)}`);
  }
  // Installed line depths (OL stagger, inline TE at 1.19) are well inside 1.3 yd.
  if (os.filter(s => LOS - s.pos.x < 1.3).length < 7) note('offense fewer than 7 near the line', f.id, tag);
  for (const [personnel, slots] of Object.entries(DEF_PERSONNEL)) {
    const present = Object.keys(slots as object);
    for (const front of FRONTS.filter((x: { personnel: string[] }) => x.personnel.includes(personnel))) for (const cov of COVERAGES) {
      if (!coverageHasNamedZonePlayers(personnel, cov)) continue;
      const call = `${personnel}/${front.id}/${cov.id}`;
      let d;
      try { d = alignDefense({ personnel, front, coverage: cov, pressure: null, label: '' }, off, present); }
      catch (e) { note('alignDefense threw', call, `${call} vs ${tag}: ${(e as Error).message}`); continue; }
      alignments++;
      const ds = Object.values(d.spots) as Spot[];
      for (let i = 0; i < ds.length; i++) {
        if (ds[i].pos.x < LOS + 0.3) note('defender within 0.3 yd of the line', ds[i].slot, `${call} vs ${tag}`);
        if (ds[i].pos.y < 0.5 || ds[i].pos.y > 52.83) note('defender out of bounds', ds[i].slot, `${call} vs ${tag}`);
        for (let j = i + 1; j < ds.length; j++) {
          const dd = Math.hypot(ds[i].pos.x - ds[j].pos.x, ds[i].pos.y - ds[j].pos.y);
          if (dd < MIN) note(dd < 0.05 ? 'defense bodies on the same spot' : 'defense bodies within MIN',
            [ds[i].slot, ds[j].slot].sort().join('-'), `${call} vs ${tag}: ${dd.toFixed(2)}`);
        }
      }
      const look = cov.look ?? cov.shell;
      const deep = ds.filter(s => s.pos.x - LOS > 8).length;
      if (look !== 'zero' && deep < (look === 'two-high' ? 2 : 1)) note('shell shows fewer deep (>8 yd) than its look', cov.id, `${call} vs ${tag}: ${deep}`);
    }
  }
}
const top = (m: Record<string, number>) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 15));
console.log(JSON.stringify({
  formations: FORMATIONS.length, fronts: FRONTS.length, coverages: COVERAGES.length, offenseLooks: looks, defenseAlignments: alignments, minSpacing: MIN,
  counts, byKey: Object.fromEntries(Object.entries(byKey).map(([k, v]) => [k, top(v)])), examples,
}, null, 1));
