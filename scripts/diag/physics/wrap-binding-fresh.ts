/** Fresh matched body/profile and decision inputs; uses the original panel
 * installation and controller. New rosters, not regenerated caps mid-play. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam } from '../../../src/league/team.js';
import { CELLS, rep } from '../tackle/panel.js';
import { sourceVersion } from '../../source-version.js';

const source = sourceVersion(), rows = [];
for (const [o, d] of [[71, 72], [81, 82]]) {
  const teams = { offense: generateTeam(new Rng(o), 'Fresh O', 'FO', { strength: .55 }),
    defense: generateTeam(new Rng(d), 'Fresh D', 'FD', { strength: .55 }) };
  const rosterHash = createHash('sha256').update(JSON.stringify(teams)).digest('hex');
  for (const cell of CELLS) for (const side of [1, -1] as const)
    rows.push({ o, d, rosterHash, ...rep(cell, side, 4001, {}, teams) });
}
assert(sourceVersion() === source);
const out = process.argv[2] ?? 'out/wrap-binding/fresh.json';
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ sourceBefore: source, sourceAfter: source,
  collectorSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
  flags: Object.fromEntries(['WRAP_BIND', 'LEG_BRACE', 'TACKLE_ROLL'].map(k => [k, process.env[k] ?? '0'])),
  protocol: 'two-fresh-rosters-native-tackle-panel-v1', rows }));
console.log(out, rows.length);
