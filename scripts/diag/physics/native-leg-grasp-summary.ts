/** Reduce the saved native audit; this script simulates zero additional plays. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const rawPath = 'out/native-leg-grasp/result.json';
const receiptPath = 'out/native-leg-grasp/audit-ground.receipt.json';
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const raw = read(rawPath), receipt = read(receiptPath);
const cfg = read(raw.input.path), parent = read(cfg.parent);
const speed = (v: any) => Math.hypot(v.x, v.y);
const distance = (a: any, b: any) => Math.hypot(a.x - b.x, a.y - b.y);
const maximum = (xs: number[]) => Math.max(0, ...xs);
const minimum = (xs: number[]) => xs.length ? Math.min(...xs) : null;
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
const bodySummary = (b: any) => ({ pos: b.pos, vel: b.vel, spin: b.spin, facing: b.facing,
  support: { xi: b.support.xi, state: b.support.state, feetLock: b.support.feetLock, foot: b.support.foot } });
assert(receipt.exitCode === 0 && receipt.inputsUnchanged);
assert.equal(receipt.sourceSha256, raw.source);
assert.equal(raw.toolSha256, sha('scripts/diag/physics/native-leg-grasp.ts'));
assert.equal(raw.input.sha256, sha(raw.input.path));

function summarize(r: any) {
  const start = r.steps[0].t;
  const steps = r.steps.filter((s: any) => s.t < start + cfg.windowSeconds - 1e-8);
  const before = steps[0].before, after = steps.at(-1).after;
  const initial = before[1].vel, magnitude = speed(initial);
  const direction = { x: initial.x / magnitude, y: initial.y / magnitude };
  const rows = r.rows.filter((q: any) => q.t < start + cfg.windowSeconds - 1e-8);
  const bodies = r.ids.map((id: number, k: number) => {
    const profile = r.first.profiles[k], slot = profile.slot;
    const parts: Record<string, any> = {};
    for (const s of steps) {
      const channels = { ...s.parts[id], ground: {
        ...s.ledger[k].ground, l: s.ledger[k].groundYaw,
        work: s.ledger[k].groundWork + s.ledger[k].groundYawWork,
      } };
      for (const [kind, value] of Object.entries(channels) as [string, any][]) {
        const p = parts[kind] ??= { x: 0, y: 0, l: 0, work: 0 };
        for (const field of ['x', 'y', 'l', 'work']) p[field] += value[field];
      }
    }
    for (const p of Object.values(parts)) {
      p.projectedDeltaSpeed = (p.x * direction.x + p.y * direction.y) / profile.mass;
    }
    const feet = r.placement.filter((q: any) => q.slot === slot && q.t < start + cfg.windowSeconds - 1e-8);
    const stance = r.ground.filter((q: any) => q.slot === slot && q.t < start + cfg.windowSeconds - 1e-8);
    return {
      slot, massKg: profile.mass, before: bodySummary(before[k]), after: bodySummary(after[k]),
      initialSpeed: speed(before[k].vel), finalSpeed: speed(after[k].vel), parts,
      ground: {
        modes: [...new Set(stance.map((q: any) => q.mode))],
        maxStanceDemandFraction: maximum(stance.filter((q: any) => q.mode === 'stance' && q.capacity > 0)
          .map((q: any) => q.demand / q.capacity)),
        minAvailability: minimum(stance.map((q: any) => q.availability)),
        maxTranslationForce: maximum(stance.map((q: any) => speed(q.force))),
        minCorrectiveCapacity: minimum(stance.map((q: any) => q.correctiveCapacity)),
      },
      correctiveSupport: {
        sampled: feet.length,
        maxForce: maximum(feet.map((q: any) => speed(q.force))),
        maxAbsoluteVelocityDeficit: maximum(feet.map((q: any) => distance(q.achieved, q.desired))),
        maxOffset: maximum(feet.map((q: any) => speed(q.offset))),
        maxLockFraction: maximum(feet.map((q: any) => q.feetLock)),
        maxVelocityLawResidual: maximum(feet.map((q: any) => q.velocityResidual)),
        motorWork: sum(steps.map((s: any) => s.ledger[k].supportWork)),
        motorWorkLimit: sum(steps.map((s: any) => s.ledger[k].supportWorkLimit)),
      },
    };
  });
  return {
    variant: r.variant, prefix: r.prefix, acquisition: r.first.event, acquiredJoint: r.first.joint,
    interval: [start, start + cfg.windowSeconds], bodies,
    grip: {
      selectedRowCount: rows.length,
      maxSharedCapacityFraction: maximum(rows.filter((q: any) => q.limit > 0).map((q: any) => q.used / q.limit)),
      maxCapacityExcess: maximum(rows.map((q: any) => q.capacityExcess)),
      maxDoseResidual: maximum(rows.map((q: any) => q.residual)),
      firstSlippingTick: r.steps.find((s: any) => s.grip.slipping)?.t ?? null,
      firstBrokenTick: r.steps.find((s: any) => s.grip.broken)?.t ?? null,
      trace: r.steps.map((s: any) => ({ t: s.t, ...s.grip })),
    },
    checks: {
      maxMomentumResidual: maximum(r.steps.flatMap((s: any) => s.ledger.map((q: any) => q.momentumResidual))),
      maxSpinImpulseResidual: maximum(r.steps.flatMap((s: any) => s.ledger.map((q: any) => q.spinResidual))),
      maxWorkResidual: maximum(r.steps.flatMap((s: any) => s.ledger.map((q: any) => Math.abs(q.workResidual)))),
      maxMotorWorkResidual: maximum(r.steps.map((s: any) => s.maxMotorWorkResidual)),
      maxGroundResidual: maximum(r.steps.flatMap((s: any) => s.ledger.map((q: any) => q.groundResidual))),
      maxArmImpulseExcess: maximum(r.steps.flatMap((s: any) => s.ledger.map((q: any) => q.armImpulse - q.armImpulseLimit))),
      maxArmWorkExcess: maximum(r.steps.flatMap((s: any) => s.ledger.map((q: any) => q.armWork - q.armWorkLimit))),
      maxMotorWorkExcess: maximum(r.steps.flatMap((s: any) => s.ledger.map((q: any) => q.supportWork - q.supportWorkLimit))),
    },
    outcome: { t: r.t, phase: r.phase, censored: r.censored, yards: r.creditedYards,
      fingerprint: r.fingerprint, exactSavedNativeEnding: r.observerExact },
  };
}
const runs = raw.runs.map(summarize);
const compare = (left: string, right: string) => {
  const a = runs.find((r: any) => r.variant.id === left)!, b = runs.find((r: any) => r.variant.id === right)!;
  return { left, right, bodies: a.bodies.map((x: any, k: number) => ({
    slot: x.slot, positionDifference: distance(x.after.pos, b.bodies[k].after.pos),
    velocityDifference: distance(x.after.vel, b.bodies[k].after.vel),
    speedDifference: Math.abs(x.finalSpeed - b.bodies[k].finalSpeed),
    facingDifference: Math.abs(x.after.facing - b.bodies[k].after.facing),
    correctiveSupportDifference: distance(x.after.support.xi, b.bodies[k].after.support.xi),
  })) };
};
const result = {
  protocol: 'native-leg-grasp-evidence-v1', decision: 'Preserve the tackle; no demonstrated restraint/accounting defect in this window.',
  testedRevision: receipt.commit, sourceSha256: raw.source, runtimeChanged: false,
  flags: receipt.flags, baselineWorldDefaults: receipt.worldDefaults,
  explicitWorldOverrides: { handContact: parent.handContact, groundMovement: parent.groundMovement },
  environment: { node: receipt.node, platform: receipt.platform, arch: receipt.arch },
  inputs: { ...raw.input, parentSha256: sha(cfg.parent), raw: rawPath, rawSha256: sha(rawPath),
    collectorSha256: raw.toolSha256, reducerSha256: sha('scripts/diag/physics/native-leg-grasp-summary.ts') },
  receipt: { path: receiptPath, sha256: sha(receiptPath), ...receipt },
  runs, comparisons: [compare('native', 'refine48'), compare('refine48', 'refine192'), compare('tiny', 'zero')],
  powerlessVersusRemoved: { selectedBodiesAndSupportExactlyEqualThroughSeconds: cfg.weakContinuationSeconds },
  runtime: {
    finalCollectorInternalSeconds: raw.elapsedSeconds,
    attempts: ['out/native-leg-grasp/audit.receipt.json', 'out/native-leg-grasp/audit-ground-initial.receipt.json',
      'out/native-leg-grasp/audit-typed.receipt.json', receiptPath].map(path => {
      const r = read(path);
      return { revision: r.commit, path, exitCode: r.exitCode, seconds: sum(r.commands.map((c: any) => c.elapsedSeconds)) };
    }),
    scope: 'Instrumented replay cost, not an uninstrumented native-runtime benchmark.',
  },
  units: { position: 'yd', velocity: 'yd/s', impulse: 'kg yd/s', angularImpulse: 'kg yd²/s',
    force: 'kg yd/s²', work: 'kg yd²/s²; body energy transfer is not pair dissipation or joules' },
  limits: [
    'Patch contact override on pinned PR79 host; not a current-develop combined validation or default activation.',
    'Full .2s loaded interval; weak/refined continuations censored at .4s, no eventual gain claim.',
    'Timestep self-refinement retains the large braking but does not establish a converged independent force-law reference.',
    'Support placement and slip history remain timestep-sensitive; no tolerance was relaxed and no recovery rule was retuned.',
    'Finite shared grip capacity and support mobility are existing model assumptions, not validated human grip/leg calibration.',
    'This local momentum/spin/work ledger does not clear prior global angular-law or moving-geometry failures.',
    'World replacement remains HOLD; no adapter, universal exactly-once World/fallback/native-cost claim.',
    'Seven extraction assertions, nine historical patch failures, and older dry-cap budget failure remain separately retained.',
  ],
};
const destination = 'data/reviews/current/native-leg-grasp.json';
writeFileSync(destination, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ destination, runs: runs.map((r: any) => ({
  id: r.variant.id, speed: r.bodies[1].finalSpeed, firstSlip: r.grip.firstSlippingTick,
  firstBroken: r.grip.firstBrokenTick, outcome: r.outcome,
})), comparisons: result.comparisons }));
