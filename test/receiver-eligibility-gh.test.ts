import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { COUNTER_VARIANTS } from '../src/playbook/concepts.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';

const inputs = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/counter-second-level-inputs.json.gz', import.meta.url))).toString()) as {
  rows: { id: string; setup: PlaySetup }[];
};

describe('receiver eligibility respects accepted manual GH ownership', () => {
  it.each([false, true])('retains the H backer, guard kick and existing core jobs, flip=%s', flip => {
    const setup = structuredClone(inputs.rows.find(r => r.id === 'GH01')!.setup);
    setup.offCall.run = { ...COUNTER_VARIANTS.gh }; setup.offCall.flip = flip;
    const sim = new PlaySim(setup), h = sim.slot('H')!;
    const hp = (h.behavior as RunBlocker).plan;
    expect(hp.kind).toBe('pull'); expect(hp.pullRole).toBe('lead'); expect(hp.target).not.toBeNull();
    expect(hp.pullSurface?.blocker.slot).toBe(flip ? 'LG' : 'RG');
    const plans = sim.offense.flatMap(a => a.behavior instanceof RunBlocker ? [a.behavior.plan] : []);
    const reservations = new Set(plans.filter(p => p.kind !== 'stalk')
      .flatMap(p => [p.target, p.climbTo, p.combination?.backer]).filter(Boolean));
    const stalks = plans.filter(p => p.kind === 'stalk');
    expect(stalks.length).toBeGreaterThan(0);
    for (const p of stalks) expect(reservations.has(p.target)).toBe(false);
    expect(plans.every(p => p.combination?.backer !== hp.target)).toBe(true);
    expect(hp.pullPath!.slice(0, 2).every(w => w.x <= h.pos.x)).toBe(true);
  });
});
