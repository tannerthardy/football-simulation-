/** Offline fixture selection by capabilities only. No plays are simulated.
 * Run once on the pinned baseline, review the vectors, then commit the fixture.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { derivePhysical } from '../src/players/physical.js';
import { sourceVersion } from './source-version.js';

const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
if (sourceVersion() !== profile.sourceSha256) throw new Error('Select fixtures on the pinned runtime');
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pool = Array.from({ length: 96 }, (_, i) => {
  const seedO = `roster-screen-v1:${i}:O`, seedD = `roster-screen-v1:${i}:D`;
  const o = generateTeam(new Rng(seedO), 'Screen offense', `S${i}O`, { strength: .55, offScheme: 'spread', defScheme: '4-3' });
  const d = generateTeam(new Rng(seedD), 'Screen defense', `S${i}D`, { strength: .55, offScheme: 'spread', defScheme: '4-3' });
  const offense = pickOffense(o, '11'), defense = pickDefense(d, 'nickel');
  const z = derivePhysical(offense.Z), cb = derivePhysical(defense.CB_S!), rb = derivePhysical(offense.RB), fs = derivePhysical(defense.FS!);
  const ol = [offense.LT, offense.LG, offense.C, offense.RG, offense.RT].map(derivePhysical);
  const dl = [defense.DE_W!, defense.DE_S!, defense.DT_W!, defense.DT_S!].map(derivePhysical);
  return { poolIndex: i, seedO, seedD, offense, defense, vector: {
    receiverSpeedEdge: z.vmax - cb.vmax,
    receiverBrakeEdge: z.brake - cb.brake,
    receiverStepEdge: z.stepSpeed! - cb.stepSpeed!,
    rbElusiveness: offense.RB.ratings.elusiveness,
    tacklerTechnique: defense.FS!.ratings.tackling,
    rbStepEdge: rb.stepSpeed! - fs.stepSpeed!,
    linePowerRatio: mean(ol.map(p => p.power)) / mean(dl.map(p => p.power)),
  } };
});
const used = new Set<number>();
const select = (id: string, rationale: string, score: (p: typeof pool[number]) => number) => {
  const chosen = pool.filter(p => !used.has(p.poolIndex)).sort((a, b) => score(b) - score(a) || a.poolIndex - b.poolIndex)[0];
  used.add(chosen.poolIndex);
  return { id, rationale, ...chosen };
};
const matchups = [
  select('speed-gap', 'Fast selected Z versus slower CB_S; test attainable closing and gathering.', p => p.vector.receiverSpeedEdge),
  select('technique-elusive', 'High FS tackling technique and elusive selected RB; neither technique nor evasion guarantees an outcome.', p => p.vector.tacklerTechnique + p.vector.rbElusiveness),
  select('ordinary', 'Small movement edges and comparable OL/DL power, with ordinary tackling and evasion grades.', p => -Math.abs(p.vector.receiverSpeedEdge) - Math.abs(p.vector.receiverBrakeEdge) - Math.abs(p.vector.receiverStepEdge) - 5 * Math.abs(p.vector.linePowerRatio - 1) - .015 * Math.abs(p.vector.tacklerTechnique - 70) - .01 * Math.abs(p.vector.rbElusiveness - 70)),
  select('offensive-advantage', 'Generated offensive speed, stepping and line-power advantages; preserve opportunities for earned offensive wins.', p => p.vector.receiverSpeedEdge + p.vector.rbStepEdge + 3 * (p.vector.linePowerRatio - 1)),
];
const fixture = { schemaVersion: 1, id: 'roster-transfer-v1', source: sourceVersion(),
  selection: '96 seeded pairs at strength .55, actual 11/nickel selectors; ranked by capabilities before any outcomes. Four frozen selected lineups, not regenerated during screening.',
  calls: [
    { id: 'slant_flat', coverage: 'cover3' }, { id: 'mesh', coverage: 'cover1' },
    { id: 'iz_strong', coverage: 'cover3' }, { id: 'oz_strong', coverage: 'cover3' },
  ], seeds: [71001, 71002], matchups };
writeFileSync('config/roster-screen.json', JSON.stringify(fixture, null, 2) + '\n');
console.log(JSON.stringify(matchups.map(({ id, poolIndex, vector }) => ({ id, poolIndex, vector })), null, 2));
