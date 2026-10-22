/** PASS_RIDE (experimental, off; on in this branch's profile): a rusher who
 * reaches the blocker's hip is ridden while the blocker's hands are on him
 * and his body is not past; the rep ends only once he clears. On the recorded
 * dropbacks some reps live on at the hip, and none ends there sooner. */
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {afterEach, describe, expect, it, vi} from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function reps(on: boolean) {
  for (const [k, v] of Object.entries({ PASS_KICK: '1', PASS_RIDE: on ? '1' : '0' })) vi.stubEnv(k, v);
  vi.resetModules();
  const {PlaySim} = await import('../src/sim/playsim.js');
  const {ScoutingReport} = await import('../src/sim/recognition.js');
  const {CoverageScouting} = await import('../src/sim/qbmind.js');
  const fixture = JSON.parse(gunzipSync(readFileSync('test/fixtures/pass-cutoff-inputs.json.gz')).toString());
  let atHip = 0, corner = 0;
  for (const row of fixture.rows) {
    const s = structuredClone(row.setup);
    const sim = new PlaySim({...s, energy: new Map<string, number>(s.energy),
      scouting: Object.assign(new ScoutingReport(), {...s.scouting, cells: new Map(s.scouting.cells)}),
      coverageScouting: Object.assign(new CoverageScouting(), s.coverageScouting)});
    while (sim.phase === 'live' && sim.t < 3.5 && sim.carrier === sim.qb) {
      sim.tick();
      for (const e of sim.engagements) if (e.type === 'pass' && Math.abs(e.phi) >= 1) atHip++;
    }
    corner += sim.events.filter(e => e.type === 'shed' && e.note === 'pass: turned the corner').length;
  }
  return {atHip, corner};
}

describe('PASS_RIDE', () => {
  it('rides rushers at the hip instead of freeing them there', async () => {
    const off = await reps(false), on = await reps(true);
    expect(off.atHip).toBe(0);
    expect(on.atHip).toBeGreaterThan(0);
    expect(on.corner).toBeLessThanOrEqual(off.corner);
  }, 60000);
});
