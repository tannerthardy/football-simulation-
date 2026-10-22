/** PASS_KICK (experimental, off): against an edge rusher the tackle sets
 * vertically. On the recorded dropbacks he never steps toward the line
 * before contact and is deeper at 1.0 s than with the arc cut-off. */
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {afterEach, describe, expect, it, vi} from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function kick(on: boolean, index: number) {
  for (const [k, v] of Object.entries({ OL_ALIGN: '0', GAIT_STEP: '0', PULL_STEP: '0', MESH_POINT: '0', SNAP_REACT: '0', PASS_CORNER: '1', PASS_KICK: on ? '1' : '0' }))
    vi.stubEnv(k, v);
  vi.resetModules();
  const {PlaySim} = await import('../src/sim/playsim.js');
  const {ScoutingReport} = await import('../src/sim/recognition.js');
  const {CoverageScouting} = await import('../src/sim/qbmind.js');
  const fixture = JSON.parse(gunzipSync(readFileSync('test/fixtures/pass-cutoff-inputs.json.gz')).toString());
  const s = structuredClone(fixture.rows.find((r: {index: number}) => r.index === index).setup);
  const sim = new PlaySim({...s, energy: new Map<string, number>(s.energy),
    scouting: Object.assign(new ScoutingReport(), {...s.scouting, cells: new Map(s.scouting.cells)}),
    coverageScouting: Object.assign(new CoverageScouting(), s.coverageScouting)});
  const b = sim.slot('LT')!, x0 = b.pos.x;
  let forward = 0, depth = NaN;
  while (sim.phase === 'live' && sim.t < 1.0 + 1e-9) {
    sim.tick();
    if (!b.engagement) forward = Math.max(forward, b.pos.x - x0);
    depth = sim.los - b.pos.x;
  }
  return {forward, depth};
}

describe('PASS_KICK', () => {
  it.each([39, 18, 19])('the left tackle gives ground and is deeper at 1.0 s, row %i', async (index) => {
    const off = await kick(false, index), on = await kick(true, index);
    expect(on.forward).toBeLessThan(0.05);
    expect(on.depth).toBeGreaterThan(off.depth);
  }, 60000);
});
