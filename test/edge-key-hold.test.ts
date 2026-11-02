import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { PlaySim } from '../src/sim/playsim.js';
import { restoreSetup } from '../scripts/diag/saved-play.js';

// A play-side end on counter keys the end of the line inside him and closes behind its down block. Two
// captured snaps (matched-restage seed 15, stream shift 2) where he instead speed-rushed 3.5-4 yd upfield and
// the kick puller turned up behind him: in #30 the down block stepped the keyed tackle out of a 3-yd key range
// and the end lost his key; in #76 he aligned 4.7 yd outside the end of the line and never had one.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/edge-key-hold.json', import.meta.url), 'utf8')) as { snaps: Record<string, string> };

function play(snap: string) {
  const saved = restoreSetup(Buffer.from(fixture.snaps[snap], 'base64'));
  const base = typeof saved.seed === 'number' ? new Rng(saved.seed) : saved.seed;
  const sim = new PlaySim({ ...saved, seed: base.fork('shift:2') });
  const kicker = sim.offense.find(a => (a.behavior as { plan?: { pullRole?: string } }).plan?.pullRole === 'kick')!;
  const end = (kicker.behavior as unknown as { target: typeof kicker }).target;
  const dir = Math.sign(end.pos.x - sim.los);
  while (sim.phase === 'live' && sim.t < 1.6) sim.tick();
  return { end, depth: (end.pos.x - sim.los) * dir };
}

describe('an edge keeps reading the end of the line he keyed', () => {
  it.each(['30', '76'])('counter snap %s: he squeezes the down block instead of rushing past the play', snap => {
    const { end, depth } = play(snap);
    expect(end.slot).toBe('DE_W');
    expect(end.tags.has('key-squeeze')).toBe(true);
    // 3.65 (#30) and 3.9 (#76) yd into the backfield at 1.6 s before; now within a yard and a half of the line.
    expect(depth).toBeGreaterThan(-1.5);
  });
});
