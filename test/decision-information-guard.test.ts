import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// INFO-1: defensive decisions read possession from the defender's own
// pictures (possession-read.ts), never the authoritative holder or the play's
// private clocks. Rules, physics, the offense and recording may read true
// state. A new decision-code read fails here; shrink a debt row when it is paid.
const TRUE_STATE = /\bsim\.(?:ball\.)?(?:carrier|scrambled|catchAt|handoffAt|throwAt)\b/g;

const ALLOWED = new Set([
  // Referee facts and physics.
  'src/sim/tackle.ts', 'src/sim/contact-legality.ts', 'src/sim/contact-holding.ts',
  'src/sim/pass-interference.ts', 'src/sim/pass-legality.ts', 'src/sim/team-contact-rules.ts',
  // The offense reading its own QB and ball.
  'src/sim/assign.ts', 'src/sim/behaviors/qb.ts', 'src/sim/behaviors/blocking.ts', 'src/sim/behaviors/receiver.ts',
  // Screen blockers: the offense's own carrier and ball, as for blocking.ts.
  'src/sim/behaviors/screen.ts', 'src/sim/behaviors/space-block.ts',
  // Recording: the responsibility ledger notes who actually holds the ball; no controller reads it.
  'src/sim/responsibility-ledger.ts',
  // Lab scene construction, not in-play decisions.
  'src/lab/coverage-scene.ts', 'src/lab/scenarios.ts', 'src/lab/schematic-stress.ts',
]);

/** Known remaining defensive reads, with exact counts, until each is repaired. */
const DEBT: Record<string, { reads: number; why: string }> = {
  'src/sim/engagement.ts': { reads: 5, why: 'pass-block lifecycle: release after the throw and conversion to run blocking (blocker side)' },
  'src/sim/run-fits.ts': { reads: 2, why: 'legacy direct-caller fallback when no acquired read is supplied' },
};

// The ball carrier decides from his own pictures (pose, perceived position,
// visible contact), not the engagement record or true support state. Remaining
// reads, with exact counts, until each is repaired.
const RUNNER_HIDDEN = /\.(?:engagement\b|isDown\()/g;
const RUNNER_DEBT = { reads: 2, why: 'QB slide threat (true positions and isDown) and squeeze bodies in command()' };

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : path.endsWith('.ts') ? [path] : [];
  });
}

describe('decision-code information guard', () => {
  const root = new URL('..', import.meta.url).pathname;
  const reads = new Map<string, number>();
  for (const path of sources(join(root, 'src'))) {
    const file = relative(root, path).split('\\').join('/');
    if (file === 'src/sim/playsim.ts') continue; // The owner of the state.
    const n = readFileSync(path, 'utf8').match(TRUE_STATE)?.length ?? 0;
    if (n) reads.set(file, n);
  }

  it('reads true possession state only in allowed files or listed debt', () => {
    const unexpected = [...reads].filter(([file]) => !ALLOWED.has(file) && !(file in DEBT));
    expect(unexpected).toEqual([]);
  });

  it('keeps each debt file at or below its listed count', () => {
    const grown = Object.entries(DEBT).filter(([file, debt]) => (reads.get(file) ?? 0) > debt.reads);
    expect(grown).toEqual([]);
  });

  it('keeps the ball carrier off the engagement record and true support state', () => {
    const carrier = readFileSync(join(root, 'src/sim/behaviors/carrier.ts'), 'utf8');
    // The designed phase's lead blocker and closing threats come from the runner's pictures.
    const designed = carrier.slice(carrier.indexOf('// Designed phase: press the aiming point.'), carrier.indexOf('// QB slide:'));
    expect(designed.match(RUNNER_HIDDEN) ?? []).toEqual([]);
    expect((carrier.match(RUNNER_HIDDEN) ?? []).length).toBeLessThanOrEqual(RUNNER_DEBT.reads);
  });

  it('keeps live gaps off the engagement record and true support state', () => {
    // Every run controller reads the line through live gaps, so it is built
    // only from the observer's pictures.
    const gaps = readFileSync(join(root, 'src/sim/live-gaps.ts'), 'utf8');
    expect(gaps.match(RUNNER_HIDDEN) ?? []).toEqual([]);
  });

  // QB_BODY_SEEN: the passer's throwing motion and eyes are body states read through perception; the published
  // fields are the QB's own record (qb.ts) and telemetry's. defense.ts keeps its QB_BODY_SEEN-off branch until the
  // flag is promoted (dated 2026-11-13; shrink to 0 then).
  const QB_PUBLISHED = /\bsim\.(?:windupAt|windupEndAt|qbEyes)\b/g;
  const QB_PUBLISHED_OWNERS = new Set(['src/sim/behaviors/qb.ts', 'src/sim/telemetry.ts']);
  const QB_PUBLISHED_DEBT: Record<string, { reads: number; why: string; since: string }> = {
    'src/sim/behaviors/defense.ts': { reads: 14, why: 'QB_BODY_SEEN off: SHOULDER_READ plant/restart, sawThrow arm key, SEEN_EYES=0', since: '2026-11-13' },
  };
  it('reads the passer\'s published arm and eyes only in their owners or the listed QB_BODY_SEEN-off debt', () => {
    const over: string[] = [];
    for (const path of sources(join(root, 'src'))) {
      const file = relative(root, path).split('\\').join('/');
      if (file === 'src/sim/playsim.ts' || QB_PUBLISHED_OWNERS.has(file)) continue;
      const n = readFileSync(path, 'utf8').match(QB_PUBLISHED)?.length ?? 0;
      if (n > (QB_PUBLISHED_DEBT[file]?.reads ?? 0)) over.push(`${file}: ${n}`);
    }
    expect(over).toEqual([]);
  });

  it('has no defensive decision reading the private scramble flag', () => {
    // The blocker converts pass pro to run blocking when his own QB runs.
    const blockMode = 'src/sim/engagement.ts';
    const scrambled = [...reads.keys()].filter(file => !ALLOWED.has(file) && file !== blockMode
      && /\bsim\.scrambled\b/.test(readFileSync(join(root, file), 'utf8')));
    expect(scrambled).toEqual([]);
  });
});
