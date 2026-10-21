/** Run-defense depth flags (experimental, off): PULL_FLOW (a fit that has read
 * a pull keeps no scrape against it) and LB_READ_STEP (with LB_DEPTH, the stack
 * backer reads two steps inside his alignment instead of one). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';

const offense = generateTeam(new Rng(51), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(52), 'D', 'D', { strength: .55 });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(flags: Record<string, string>) {
  for (const [k, v] of Object.entries(flags)) vi.stubEnv(k, v);
  vi.resetModules();
  return { fits: await import('../src/sim/run-fits.js'), PlaySim: (await import('../src/sim/playsim.js')).PlaySim };
}

describe('PULL_FLOW', () => {
  it('off: the scrape is unchanged, against the pull or not', async () => {
    const { fits } = await load({ PULL_FLOW: '0' });
    expect(fits.pullScrape(-1.5, 1)).toBe(-1.5);
    expect(fits.pullScrape(1.2, -1)).toBe(1.2);
  });
  it('on: no scrape against a read pull; with the pull, or with no pull read, unchanged', async () => {
    const { fits } = await load({ PULL_FLOW: '1' });
    expect(fits.pullScrape(-1.5, 1)).toBe(0);
    expect(fits.pullScrape(1.2, -1)).toBe(0);
    expect(fits.pullScrape(.8, 1)).toBe(.8);
    expect(fits.pullScrape(-.8, 0)).toBe(-.8);
  });
});

/** The middle backer's shallowest depth on a power play before the back's
 * path threatens his gap (no fit-threat tag yet, not engaged). */
async function backerReadDepth(flags: Record<string, string>) {
  const { PlaySim } = await load(flags);
  const formation = FORMATION_BY_ID.ace_12;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'power' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  const lb = sim.slot('LB_M')!;
  const home = sim.defAlign.spots.LB_M!.pos.x - sim.los;
  let least = Infinity;
  while (sim.phase === 'live' && sim.t < 2.2) {
    lb.tags.delete('fit-threat-read');
    sim.tick();
    if (lb.tags.has('fit-threat-read') || lb.engagement) break;
    if (lb.runFit?.kind === 'insert') least = Math.min(least, lb.pos.x - sim.los);
  }
  return { home, least };
}

describe('LB_READ_STEP', () => {
  it('needs LB_DEPTH: alone it changes nothing', async () => {
    const a = await backerReadDepth({ LB_DEPTH: '0', LB_READ_STEP: '0' });
    const b = await backerReadDepth({ LB_DEPTH: '0', LB_READ_STEP: '1' });
    expect(b.least).toBe(a.least);
  });
  it('with LB_DEPTH the read sits about a step deeper inside his alignment', async () => {
    const one = await backerReadDepth({ LB_DEPTH: '1', LB_READ_STEP: '0' });
    const two = await backerReadDepth({ LB_DEPTH: '1', LB_READ_STEP: '1' });
    expect(one.home).toBeGreaterThanOrEqual(3);
    expect(two.least).toBeLessThan(one.least - .4);
    expect(two.least).toBeGreaterThan(two.home - 2.3);
  });
});
