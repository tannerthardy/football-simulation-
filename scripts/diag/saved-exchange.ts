/** Portable, full-context snap inputs from PR #54. No game/prefix replay. */
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {PlaySim, type PlaySetup} from '../../src/sim/playsim.js';
import {CoverageScouting} from '../../src/sim/qbmind.js';
import {ScoutingReport} from '../../src/sim/recognition.js';

export const savedExchanges = JSON.parse(gunzipSync(readFileSync(
  'test/fixtures/shotgun-exchange.json.gz')).toString());

export function savedExchange(id: string): PlaySim {
  const row = savedExchanges.inputs.find((r: {id: string}) => r.id === id);
  assert(row, `Unknown saved exchange ${id}`);
  const s = structuredClone(row.setup);
  const setup: PlaySetup = {...s, energy: new Map(s.energy),
    scouting: Object.assign(new ScoutingReport(), {...s.scouting, cells: new Map(s.scouting.cells)}),
    coverageScouting: Object.assign(new CoverageScouting(), s.coverageScouting)};
  const sim = new PlaySim(setup);
  assert.deepEqual({...sim.rng}, row.expectedInitialRng, 'Saved native initialization changed');
  return sim;
}
