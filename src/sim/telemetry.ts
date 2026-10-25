/** Observational replay recording. Never advances reads, controllers or RNG. */
import type { Vec2 } from '../core/vec.js';
import { DT } from '../core/units.js';
import { fatigueFactor } from '../physics/kinematics.js';
import { availability, padHeightAt, supportParams } from '../physics/support.js';
import type { Intent } from '../physics/world.js';
import type { Agent } from './agent.js';
import { PassProtector, RunBlocker } from './behaviors/blocking.js';
import { QBPass } from './behaviors/qb.js';
import { ManCoverage, ZoneCoverage } from './behaviors/defense.js';
import { CoverageDefender } from './coverage/defender.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';
import type { ReplayAgentState, ReplayDecision, ReplayLevel, ReplayLink, ReplayTelemetry, ReplayTelemetryFrame } from './types.js';

const q = (n: number) => Math.round(n * 100) / 100;
const vec = (p: Vec2): [number, number] => [q(p.x), q(p.y)];

/** One collector per play. No-op state for light or unrecorded simulations. */
export class ReplayTrace {
  readonly data: ReplayTelemetry | undefined;
  private readonly observations = new Map<string, NonNullable<ReplayTelemetryFrame['perception']>[number]>();
  private observationT = NaN;

  constructor(readonly level: ReplayLevel, sampleEvery: number, enabled: boolean) {
    if (enabled && level !== 'light') this.data = {
      version: 1, level, sampleEvery, sampleSeconds: sampleEvery * DT, frames: [], decisions: [],
      unavailable: ['Decision causes and rejected options are absent unless explicitly recorded at the controller.',
        'Coverage key reads are observed inputs, not proven causal explanations.',
        'No skeletal limbs, gaze cone, carrier candidate-lane scores, or ball-security meter are recorded.',
        ...(level === 'standard' ? ['Perception, beliefs, body and contact internals require full recording.'] : []),
        'Last-step contacts are sampled, not a complete impulse history.'],
    };
  }

  /** Called only with a perception result a controller actually requested. */
  observe(a: Agent, b: Agent, p: Perceived, t: number, source: 'see' | 'qb' = 'see'): void {
    if (this.data?.level !== 'full') return;
    if (this.observationT !== t) { this.observations.clear(); this.observationT = t; }
    this.observations.set(`${a.idx}:${b.idx}:${source}`, { a: a.idx, b: b.idx, t: q(t), source,
      position: vec(p.pos), velocity: vec(p.vel), age: p.age === undefined ? null : q(p.age), pose: p.pose ?? null,
      carrying: p.carrying ?? null });
  }

  /** Controllers submit an actual choice; a missing cause stays null. */
  decide(decision: ReplayDecision): void {
    if (this.data) this.data.decisions.push({ ...decision, t: q(decision.t), options: decision.options?.slice() });
  }

  /** Record state at the same boundary and cadence as positional frames. */
  state(sim: PlaySim, recordedIntents: ReadonlyArray<Intent> = sim.intents): void {
    const data = this.data;
    if (!data) return;
    const full = data.level === 'full';
    const links: ReplayLink[] = [];
    const agents: ReplayAgentState[] = sim.agents.map(a => {
      const b = a.behavior;
      const s: ReplayAgentState = { kind: b.kind };
      if (b instanceof CoverageDefender) {
        s.job = b.job; s.zone = b.recordedZone(); s.man = b.recordedMan(); s.target = b.target?.idx ?? null;
        const landmark = b.recordedLandmark();
        if (landmark) s.landmark = vec(landmark);
      }
      else if (b instanceof ManCoverage) { s.job = `man:${b.target.slot}`; s.target = b.target.idx; s.man = b.recordedTechnique(); }
      else if (b instanceof ZoneCoverage) { s.job = `zone:${b.zone}`; s.zone = b.zone; s.landmark = vec(b.recordedLandmark()); s.target = b.target?.idx ?? null; }
      else if (b instanceof RunBlocker) {
        s.job = b.plan.kind; s.target = b.target?.idx ?? null;
        s.runBlock = { kind: b.plan.kind, target: s.target, drive: vec(b.plan.drive),
          climbTo: b.plan.climbTo === undefined ? undefined : b.plan.climbTo?.idx ?? null,
          pullRole: b.plan.pullRole, pullPath: b.plan.pullPath?.map(vec) };
      } else if (b instanceof PassProtector) { s.target = b.recordedTarget(a); s.job = 'protection'; }
      if (s.target !== undefined && s.target !== null) links.push({ kind: b.kind === 'man' ? 'man' : 'target', a: a.idx, b: s.target });
      const intent = recordedIntents[a.idx];
      if (intent) s.intent = { velocity: vec(intent.vel), facing: intent.facing === undefined ? undefined : q(intent.facing), posture: intent.posture };
      if (a.runFit) s.runFit = { ...a.runFit };
      if (a.passSet) s.passSet = { ...a.passSet };
      if (full) {
        const sup = a.body.support;
        if (sup) {
          const params = supportParams(a.profile);
          s.body = { velocity: vec(a.vel), energy: q(a.body.energy), posture: q(sup.posture),
            balance: q(availability(sup, params, fatigueFactor(a.body.energy))), state: sup.state,
            squeeze: q(a.body.squeeze ?? 0), lean: vec(sup.lean), padHeight: q(padHeightAt(params, sup.posture)), supportDeviation: vec(sup.xi) };
        }
        if (a.recog) s.belief = { read: a.recog.read, passProbability: q(1 / (1 + Math.exp(-a.recog.logOdds))) };
      }
      return s;
    });
    for (const e of sim.engagements) {
      links.push({ kind: 'block', a: e.blocker.idx, b: e.defender.idx });
      for (const h of e.helpers) links.push({ kind: 'block', a: h.idx, b: e.defender.idx });
    }
    if (sim.bond) for (const a of sim.bond.tacklers) links.push({ kind: 'tackle', a: a.idx, b: sim.bond.carrier.idx });
    const frame: ReplayTelemetryFrame = { t: q(sim.t), agents, links };
    if (full) {
      frame.blocks = sim.engagements.map(e => ({ a: e.blocker.idx, b: e.defender.idx, helpers: e.helpers.map(h => h.idx), type: e.type,
        control: q(e.control), phi: q(e.phi), baseA: q(e.baseB), baseB: q(e.baseD), move: e.move, landed: e.moveOk, win: q(e.win),
        hands: e.hands ? { extension: q(e.hands.extension), push: q(e.hands.push), hold: q(e.hands.hold), steer: q(e.hands.steer),
          height: e.hands.height, normalForce: e.hands.normalForce, tangentForce: e.hands.tangentForce } : undefined }));
      const bond = sim.bond;
      if (bond) frame.tackle = { carrier: bond.carrier.idx, stall: q(bond.stalled ?? 0), progressX: q(bond.progressX),
        tacklers: bond.tacklers.map(a => { const h = bond.holds?.get(a); return { a: a.idx, grip: bond.grip?.get(a) ?? null,
          legs: h?.legs ?? 0, force: h?.force, slipping: h?.slipping, origin: h?.origin }; }) };
      frame.perception = this.observationT === sim.t ? [...this.observations.values()] : [];
      if (sim.qbMind) frame.qb = { eyes: sim.qbEyes?.idx ?? null, belief: { ...sim.qbMind.belief }, best: sim.qbMind.top(),
        ...(sim.qb.behavior instanceof QBPass ? sim.qb.behavior.recordedState() : {}) };
      frame.contacts = (sim.lastStep?.contacts ?? []).map(c => ({ a: c.i, b: c.j, closing: q(c.closing), impulse: q(c.impulse) }));
      const ball = sim.ball;
      frame.ball = { kind: ball.kind, height: q(sim.ballPos().z) };
      if (ball.kind === 'air' || ball.kind === 'pitch') {
        frame.ball.target = ball.target?.idx;
        frame.ball.intended = [q(ball.intended.x), q(ball.intended.y), q(ball.intended.z)];
        if (ball.kind === 'air') frame.ball.arrivalT = q(ball.arrivalT);
      }
    }
    if (data.frames.at(-1)?.t === frame.t) data.frames.pop();
    data.frames.push(frame);
  }
}
