/** QB_SETTLE (experimental, off): the drop slows into the launch spot at a
 * settling rate rather than braking hard at the end. On the recorded
 * dropbacks the QB's largest deceleration before the throw is lower. */
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {afterEach, describe, expect, it, vi} from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function peakDecel(on: boolean, index: number) {
  vi.stubEnv('QB_SETTLE', on ? '1' : '0'); vi.resetModules();
  const {PlaySim} = await import('../src/sim/playsim.js');
  const {ScoutingReport} = await import('../src/sim/recognition.js');
  const {CoverageScouting} = await import('../src/sim/qbmind.js');
  const fixture = JSON.parse(gunzipSync(readFileSync('test/fixtures/pass-cutoff-inputs.json.gz')).toString());
  const s = structuredClone(fixture.rows.find((r: {index: number}) => r.index === index).setup);
  const sim = new PlaySim({...s, energy: new Map<string, number>(s.energy),
    scouting: Object.assign(new ScoutingReport(), {...s.scouting, cells: new Map(s.scouting.cells)}),
    coverageScouting: Object.assign(new CoverageScouting(), s.coverageScouting)});
  const speeds: number[] = [];
  while (sim.phase === 'live' && sim.t < 3 && sim.carrier === sim.qb && !sim.events.some(e => e.type === 'throw')) {
    sim.tick();
    speeds.push(Math.hypot(sim.qb.vel.x, sim.qb.vel.y));
  }
  const w = Math.round(0.2 / sim.dt);
  let peak = 0;
  for (let k = w; k < speeds.length; k++) peak = Math.max(peak, (speeds[k - w] - speeds[k]) / (w * sim.dt));
  return peak;
}

describe('QB_SETTLE', () => {
  it.each([39, 18, 19])('settles into the drop with a gentler stop, row %i', async (index) => {
    const off = await peakDecel(false, index), on = await peakDecel(true, index);
    expect(on).toBeLessThan(off);
  }, 60000);
});
