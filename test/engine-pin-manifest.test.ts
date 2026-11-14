import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// The core suite runs in two projects (vitest.config.ts): `defaults` files on the real engine, `pinned` files on the
// legacy one (every promoted flag set to 0). The pinned set may only shrink: PINNED_AT_START is the set on
// 2026-11-14 (develop fe59480c, engine-59), and a file may leave it by passing on the defaults, never join it. A new test
// file is a defaults file: write it for the real engine and stub the flags it needs.
const PINNED_AT_START = new Set<string>(["test/acquired-qb-continuation.test.ts", "test/arrival.test.ts", "test/back-man-run-fit.test.ts", "test/back-release.test.ts", "test/backer-read-step.test.ts", "test/backer-takeon.test.ts", "test/block-seen.test.ts", "test/bounded-attachment-world.test.ts", "test/call-mix.test.ts", "test/carrier-decision-cadence.test.ts", "test/catch-caller-interval.test.ts", "test/catch-hands.test.ts", "test/chase-arrival.test.ts", "test/climb-access.test.ts", "test/climb-reread-passed.test.ts", "test/combination-ownership.test.ts", "test/combo-attention.test.ts", "test/combo-strike-access.test.ts", "test/combo-transfer.test.ts", "test/command-trace.test.ts", "test/concept-menu.test.ts", "test/contact-holding-rules.test.ts", "test/contact-motion.test.ts", "test/cov7-abandonment.test.ts", "test/cover3-cover2-rules.test.ts", "test/cover6-half-side.test.ts", "test/coverage-flat-responsibility.test.ts", "test/coverage-judgment.test.ts", "test/coverage-mechanics.test.ts", "test/coverage-rules.test.ts", "test/cushion-break.test.ts", "test/db-slots.test.ts", "test/deep-coverage-leverage.test.ts", "test/defensive-call-integrity.test.ts", "test/directional-brace.test.ts", "test/dl-attack-landmark.test.ts", "test/dl-flatten.test.ts", "test/dl-games.test.ts", "test/draw-presentation.test.ts", "test/draw-read.test.ts", "test/edge-contain-flow.test.ts", "test/fangio-tree.test.ts", "test/finish-check.test.ts", "test/fit-te-gap-slide.test.ts", "test/flat-press.test.ts", "test/front-menu.test.ts", "test/gap-match.test.ts", "test/grasp-angular-transfer.test.ts", "test/grasp-jeopardy.test.ts", "test/gun-split-backs.test.ts", "test/hand-angular-transfer.test.ts", "test/hand-comoving.test.ts", "test/hand-force-integration.test.ts", "test/hand-force-point.test.ts", "test/held-recovery.test.ts", "test/held-stride.test.ts", "test/helper-fit.test.ts", "test/hold-sink.test.ts", "test/hook-stem-continuity.test.ts", "test/incidental-catch-readiness.test.ts", "test/kick-braking.test.ts", "test/lb-flow-intercept.test.ts", "test/lb-guard-step.test.ts", "test/lb-start.test.ts", "test/line-read.test.ts", "test/lineup-order.test.ts", "test/long-yardage-run.test.ts", "test/man-cushion-compression.test.ts", "test/man-run-continuity.test.ts", "test/motion-contact.test.ts", "test/native-pass-foul-game.test.ts", "test/ol-align.test.ts", "test/open-hands.test.ts", "test/overtake-climb.test.ts", "test/pad-leverage.test.ts", "test/pass-anchor.test.ts", "test/pass-contact-rules.test.ts", "test/pass-contact.test.ts", "test/pass-cutoff-approach.test.ts", "test/pass-hip-ride.test.ts", "test/pass-installation.test.ts", "test/perimeter-run-play.test.ts", "test/planned-climb-fit.test.ts", "test/possession-awareness.test.ts", "test/presnap-alignment-contract.test.ts", "test/presnap-coverage-checks.test.ts", "test/press-contact.test.ts", "test/press-front-stance.test.ts", "test/prethrow-opi.test.ts", "test/pro-call.test.ts", "test/projected-cap.test.ts", "test/protection.test.ts", "test/pursuit-contact.test.ts", "test/qb-feel.test.ts", "test/qb-interception-estimate.test.ts", "test/qb-rhythm.test.ts", "test/qb-rusher-recording.test.ts", "test/qb-scramble-lane.test.ts", "test/quarters-trips-rules.test.ts", "test/read-compiler.test.ts", "test/read-lean.test.ts", "test/receiver-native-motion.test.ts", "test/receiver-option-information.test.ts", "test/receiver-route-effort.test.ts", "test/receiver-run-eligibility.test.ts", "test/redirect-phase-contract.test.ts", "test/redirect-protection.test.ts", "test/release-seen.test.ts", "test/responsibility-ledger.test.ts", "test/route-craft.test.ts", "test/run-base.test.ts", "test/run-combo-retarget.test.ts", "test/run-contact-flow.test.ts", "test/run-contact-track.test.ts", "test/run-contact-workoff-interaction.test.ts", "test/run-execution.test.ts", "test/run-hand-control.test.ts", "test/run-pace-gather.test.ts", "test/runner-side-recovery.test.ts", "test/scenario-pack.test.ts", "test/schematic-stress.test.ts", "test/seen-eyes.test.ts", "test/shed-pursue.test.ts", "test/short-package.test.ts", "test/shotgun-exchange.test.ts", "test/shotgun-rb-alignment.test.ts", "test/shoulders-set.test.ts", "test/situation-depth.test.ts", "test/snap-count.test.ts", "test/support-contact-frame.test.ts", "test/support-escape-objective.test.ts", "test/support-receiver-holder.test.ts", "test/support-work-off.test.ts", "test/tackle-support-choice.test.ts", "test/team-contact-rules.test.ts", "test/throw-body.test.ts", "test/tip-away.test.ts", "test/traffic-turning.test.ts", "test/world-physics.test.ts", "test/wrap-binding.test.ts", "test/zone-backer-count.test.ts", "test/zone-helper-check.test.ts", "test/zone-runoff-work.test.ts", "test/zone-throw-key.test.ts"]);

const root = new URL('..', import.meta.url).pathname;
const manifest: { pinned: string[]; defaults: string[] } = JSON.parse(readFileSync(join(root, 'test/engine-pin.json'), 'utf8'));

function tests(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? tests(path) : path.endsWith('.test.ts') ? [path] : [];
  });
}

// What vitest.config.ts excludes from core: integration, workflow and research tiers.
const OTHER_TIERS = [/^test\/integration\//, /^test\/research\//, /^test\/(hands-bunch|film-pairs|film-pack-inputs|saved-game-play|play-lab)\.test\.ts$/];

describe('engine pin manifest', () => {
  const core = tests(join(root, 'test')).map(p => relative(root, p).split('\\').join('/')).filter(f => !OTHER_TIERS.some(r => r.test(f))).sort();

  it('places every core test file in exactly one of pinned and defaults', () => {
    const both = manifest.pinned.filter(f => manifest.defaults.includes(f));
    const listed = new Set([...manifest.pinned, ...manifest.defaults]);
    expect({ both, unlisted: core.filter(f => !listed.has(f)), missing: [...listed].filter(f => !core.includes(f)) })
      .toEqual({ both: [], unlisted: [], missing: [] });
  });

  it('only ever shrinks the pinned set', () => {
    const added = manifest.pinned.filter(f => !PINNED_AT_START.has(f));
    expect(added, 'A file may leave the pinned set when it passes on the real engine; none may join it.').toEqual([]);
  });

  it('keeps both lists sorted and free of duplicates', () => {
    for (const list of [manifest.pinned, manifest.defaults]) {
      expect(list).toEqual([...new Set(list)].sort());
    }
  });
});
