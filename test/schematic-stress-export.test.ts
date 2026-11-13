import { describe, expect, it } from 'vitest';
import { EXPECTED_NATIVE_FILMS, EXPECTED_SCHEMATIC_SOURCE, validateSchematicRecordings,
  type NativeFilm, type NativePanel } from '../scripts/export-schematic-stress.js';

/** Small metadata-only recording witness. No raw dataset, ignored output or
 * football simulation is needed to exercise the export acceptance boundary. */
function fixture() {
  const rows = EXPECTED_NATIVE_FILMS.map(id => ({ id, observerVerified: true, fixture: { condition: 'adverse', concept: id === 'SS-08-written' ? 'quick_outs' : 'mesh' },
    snap: { rushCount: id === 'SS-10-written' ? 3 : 4, coverageCount: id === 'SS-10-written' ? 8 : 7,
      counts: { S: id === 'SS-08-written' ? 4 : 3, W: 1 }, offense: [{ slot: 'Y', route: 'shallow' }] },
    metrics: { outcome: 'tackle', duration: .1, offenseYardsBeforePenalties: 0 } }));
  const panel = { schema: 'schematic-stress-v1', sourceBefore: EXPECTED_SCHEMATIC_SOURCE,
    sourceAfter: EXPECTED_SCHEMATIC_SOURCE, limitations: ['Recorded limits'], rows } as unknown as NativePanel;
  const film = { schema: 'schematic-stress-film-v1', sourceBefore: EXPECTED_SCHEMATIC_SOURCE,
    sourceAfter: EXPECTED_SCHEMATIC_SOURCE, limitations: panel.limitations,
    plays: EXPECTED_NATIVE_FILMS.map(id => ({ id, setupKind: 'native-static-11v11', down: id === 'SS-10-written' ? 3 : 1,
      distance: id === 'SS-10-written' ? 27 : 10, players: Array.from({ length: 22 }, (_, i) => ({ slot: String(i) })),
      result: { outcome: 'tackle', duration: .1, offenseYards: 0, frames: [{ t: 0, agents: Array(66).fill(0) }, { t: .05, agents: Array(66).fill(0) }],
        telemetry: { level: 'full', frames: [{}] } } })) } as unknown as NativeFilm;
  return { panel, film };
}

describe('saved schematic-film acceptance boundary', () => {
  it('accepts the five fixed complete recording IDs without simulating a play', () => {
    const { panel, film } = fixture(); expect(() => validateSchematicRecordings(panel, film)).not.toThrow();
  });
  it('refuses mixed source versions and missing observer checks', () => {
    const { panel, film } = fixture(); film.sourceAfter = 'stale';
    expect(() => validateSchematicRecordings(panel, film)).toThrow('source-pinned');
    film.sourceAfter = film.sourceBefore; panel.rows[0].observerVerified = false;
    expect(() => validateSchematicRecordings(panel, film)).toThrow('Incomplete');
  });
  it('refuses omitted or duplicate film IDs and incomplete physical frames', () => {
    const { panel, film } = fixture(); film.plays[1].id = film.plays[0].id;
    expect(() => validateSchematicRecordings(panel, film)).toThrow('source-pinned');
    film.plays[1].id = EXPECTED_NATIVE_FILMS[1]; film.plays[0].result.frames![1].agents.pop();
    expect(() => validateSchematicRecordings(panel, film)).toThrow('Incomplete');
  });
  it('refuses calling the static quad a screen or reporting a false three/eight ledger', () => {
    const { panel, film } = fixture(); panel.rows[3].fixture.concept = 'screen';
    expect(() => validateSchematicRecordings(panel, film)).toThrow('caveat/role');
    panel.rows[3].fixture.concept = 'quick_outs'; panel.rows[4].snap.rushCount = 4; panel.rows[4].snap.coverageCount = 7;
    expect(() => validateSchematicRecordings(panel, film)).toThrow('caveat/role');
  });
});
