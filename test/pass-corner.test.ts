/** PASS_CORNER (experimental, off; on in this branch's profile): the tackle
 * cuts an edge rusher off where the rusher's arc has turned toward the QB,
 * not at the earliest point of the arc. On the same recorded rep he meets
 * the end later and deeper, having given ground instead of stepping up. */
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {afterEach, describe, expect, it, vi} from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function contactOf(on: boolean) {
  for (const [k, v] of Object.entries({ OL_ALIGN: '0', GAIT_STEP: '0', PULL_STEP: '0', MESH_POINT: '0', SNAP_REACT: '0', PASS_CORNER: on ? '1' : '0' }))
    vi.stubEnv(k, v);
  vi.resetModules();
  const {PlaySim} = await import('../src/sim/playsim.js');
  const {ScoutingReport} = await import('../src/sim/recognition.js');
  const {CoverageScouting} = await import('../src/sim/qbmind.js');
  const fixture = JSON.parse(gunzipSync(readFileSync('test/fixtures/pass-cutoff-inputs.json.gz')).toString());
  const s = structuredClone(fixture.rows.find((r: {index: number}) => r.index === 39).setup);
  const sim = new PlaySim({...s, energy: new Map<string, number>(s.energy),
    scouting: Object.assign(new ScoutingReport(), {...s.scouting, cells: new Map(s.scouting.cells)}),
    coverageScouting: Object.assign(new CoverageScouting(), s.coverageScouting)});
  const b = sim.slot('LT')!, d = sim.slot('DE_W')!, x0 = b.pos.x;
  let minX = x0;
  while (sim.phase === 'live' && sim.t < 2.5) {
    sim.tick();
    minX = Math.max(minX, b.pos.x);
    if (sim.events.some(e => e.type === 'block_contact' && e.a === b.idx && e.b === d.idx))
      return {t: sim.t, retreat: x0 - b.pos.x, forward: minX - x0};
  }
  return null;
}

describe('PASS_CORNER', () => {
  it('meets the edge rusher later and deeper, without stepping up first', async () => {
    const off = (await contactOf(false))!, on = (await contactOf(true))!;
    expect(on).not.toBeNull();
    expect(on.t).toBeGreaterThan(off.t);
    expect(on.retreat).toBeGreaterThan(off.retreat);
    expect(on.forward).toBeLessThanOrEqual(off.forward + 1e-9);
  }, 60000);
});
