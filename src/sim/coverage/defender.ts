/**
 * A coverage defender who runs a pattern-match rule. Each tick the rule turns
 * his reads of the receivers he keys into a directive; the defender keeps the
 * technique he is in while the directive is unchanged and switches when it
 * changes (a fresh technique starts from his current position and momentum,
 * so every exchange costs real time).
 */
import type { MoveCommand } from '../../physics/kinematics.js';
import type { Gap, MatchRule, ZoneId, ZoneStyle } from '../../playbook/types.js';
import type { Agent, Behavior } from '../agent.js';
import { ManCoverage, ZoneCoverage } from '../behaviors/defense.js';
import type { PlaySim } from '../playsim.js';
import { ReleaseReader } from './reads.js';
import { runRule, zoneSide, type Directive, type RuleState } from './rules.js';
import { Rob, Trap, Wall } from './techniques.js';
import { isDeepZone } from '../../playbook/alignment.js';
import { CoverageJudgment } from './judgment.js';

export class CoverageDefender implements Behavior {
  readonly reader: ReleaseReader;
  private readonly state: RuleState = {};
  private readonly side: 'S' | 'W';
  private sub: Behavior;
  private subKey = '';
  /** What he is doing now, for film and diagnostics ("zone:hook_s", "man:Y", "trap:H"). */
  job = '';
  /** Every job he has taken this play, with the time he took it. */
  readonly history: Array<{ t: number; job: string }> = [];
  readonly judgment = new CoverageJudgment();

  constructor(
    a: Agent,
    private readonly sim: PlaySim,
    readonly rule: MatchRule,
    /** Nominal landmark (alignment, run fits, the QB's picture of the coverage). */
    readonly zone: ZoneId,
    readonly style: ZoneStyle,
    private readonly gap: Gap,
    private readonly gapSign: number,
  ) {
    this.reader = new ReleaseReader(a, sim);
    this.side = zoneSide(zone) ?? ((a.pos.y - sim.ballY) * sim.offAlign.strongSign >= 0 ? 'S' : 'W');
    this.sub = new ZoneCoverage(a, sim, zone, gap, gapSign, style);
    this.subKey = `zone:${zone}:${style}`;
    this.job = `zone:${zone}`;
    this.history.push({ t: sim.t, job: this.job });
  }

  /** Man while covering a receiver, zone otherwise (for code that asks). */
  get kind(): string {
    return this.sub.kind;
  }
  /** Eyes: zone techniques read the quarterback; a man defender reads his man. */
  get zoneEyes(): boolean {
    return !(this.sub instanceof ManCoverage);
  }
  get target(): Agent | null {
    return (this.sub as { target?: Agent | null }).target ?? null;
  }

  /** Current zone technique's adjusted landmark, if he is zoning off. */
  recordedLandmark(): import('../../core/vec.js').Vec2 | undefined {
    return this.sub instanceof ZoneCoverage ? this.sub.recordedLandmark() : undefined;
  }
  recordedZone(): string | undefined { return this.sub instanceof ZoneCoverage ? this.sub.zone : undefined; }
  recordedMan(): import('../types.js').ReplayAgentState['man'] {
    return this.sub instanceof ManCoverage ? this.sub.recordedTechnique() : undefined;
  }

  /** Current rule branch plus keys actually consumed at `readTick`.
   * Call after the controller tick with its pre-increment time. This copies
   * cached declarations only: no new observation, interpretation or RNG.
   * Inputs are witnesses, not a claimed causal explanation of the choice.
   */
  recordedRule(readTick: number) {
    return { rule: this.rule, mode: this.state.mode ?? null, cut: this.state.cut?.idx ?? null,
      judgment: this.judgment.reason, readTick,
      reads: this.reader.recordedReads(readTick).map(rd => ({ target: rd.r.idx, slot: rd.r.slot,
        position: { ...rd.pos }, velocity: { ...rd.vel }, depth: rd.depth, outward: rd.outward,
        release: rd.release, first: rd.first, since: rd.since, climbed: rd.climbed })) };
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const sign = this.side === 'S' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
    const primary = runRule(this.rule, { a, sim, reader: this.reader, side: this.side, sign, zone: this.zone, style: this.style, state: this.state });
    const d = this.judgment.decide(a, sim, this.reader, primary, isDeepZone(this.zone));
    const key = directiveKey(d);
    if (key !== this.subKey) {
      this.sub = this.make(a, d);
      this.subKey = key;
      this.job = key.split(':').slice(0, 2).join(':');
      this.history.push({ t: sim.t, job: this.job });
      if (sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'coverage-job', chose: this.job, cue: null,
        options: [...new Set([directiveKey(primary), key])],
        detail: `Observed rule inputs: ${this.reader.recordedReads(sim.t).map(r => `${r.r.slot}=${r.release} at ${r.depth.toFixed(1)} yd`).join(', ') || 'none'}. Causal trigger is not exposed.` });
      a.tags.add(`cov-${d.t}`);
    }
    return this.sub.update(a, sim);
  }

  private make(a: Agent, d: Directive): Behavior {
    switch (d.t) {
      case 'zone': return new ZoneCoverage(a, this.sim, d.zone, this.gap, this.gapSign, d.style);
      case 'man': return new ManCoverage(a, this.sim, d.r, false, this.gap, this.gapSign, d.opts);
      case 'trap': return new Trap(d.r, this.reader, this.gap, this.gapSign);
      case 'wall': return new Wall(d.r, this.reader, this.gap, this.gapSign);
      case 'rob': return new Rob(d.r, this.reader, this.gap, this.gapSign);
    }
  }
}

function directiveKey(d: Directive): string {
  switch (d.t) {
    case 'zone': return `zone:${d.zone}:${d.style}`;
    case 'man': return `man:${d.r.slot}:${d.opts.lev ?? 'inside'}:${d.opts.overTop ? 'top' : ''}${d.opts.trail ? 'trail' : ''}`;
    default: return `${d.t}:${d.r.slot}`;
  }
}
