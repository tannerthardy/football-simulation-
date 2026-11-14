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
import { believesRun, ManCoverage, OPEN_CARRY, pursueIfLive, runFit, sawThrow, ZoneCoverage } from '../behaviors/defense.js';
import type { PlaySim } from '../playsim.js';
import { ReleaseReader } from './reads.js';
import { CROSS_PASS, crossing, CUT_ENTER, CUT_EXIT, CUT_WALL, hookCurlLevel, runRule, zoneSide, type Directive, type RuleState } from './rules.js';
import { CrossWall, ReadRelease, Rob, Trap, Wall } from './techniques.js';
import { isDeepZone, zoneLandmark } from '../../playbook/alignment.js';
import { CoverageJudgment } from './judgment.js';

export class CoverageDefender implements Behavior {
  readonly reader: ReleaseReader;
  private readonly state: RuleState = {};
  /** CUT_WALL: the crosser he is walling in his area (commit: taken inside CUT_ENTER, passed past CUT_EXIT). */
  private walling: Agent | null = null;
  /** CROSS_PASS: the crosser he has passed (or is walling), held by the exit margin. */
  private passed: Agent | null = null;
  private readonly side: 'S' | 'W';
  private sub: Behavior;
  private subKey = '';
  private supportRecorded = false;
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

  /** The current job's scramble contract (man and deep zones plaster). */
  get plastersScramble(): boolean {
    return (this.sub as { plastersScramble?: boolean }).plastersScramble === true;
  }

  /** Man while covering a receiver, zone otherwise (for code that asks). */
  get kind(): string {
    return this.sub.kind;
  }
  /** Eyes: zone techniques read the quarterback; a man defender reads his man.
   * OPEN_CARRY: an underneath match carry inside a zone call is still a zone
   * defender: he carries with his eyes on the quarterback through the route
   * (whether he actually sees the throwing motion is his facing, in sawThrow). */
  get zoneEyes(): boolean {
    if (OPEN_CARRY && this.sub instanceof ManCoverage && !this.sub.opts.protectDepth && !this.sim.defCall.coverage.man) return true;
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
    return this.sub instanceof ManCoverage || this.sub instanceof ReadRelease ? this.sub.recordedTechnique() : undefined;
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
    const live = pursueIfLive(sim, a);
    if (live) return live;
    const sign = this.side === 'S' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
    const primary = runRule(this.rule, { a, sim, reader: this.reader, side: this.side, sign, zone: this.zone, style: this.style, state: this.state });
    const decided = this.judgment.decide(a, sim, this.reader, primary, isDeepZone(this.zone));
    const d = CUT_WALL ? this.passUnder(sim, decided) : decided;
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
    // A match changes the receiver responsibility, not the installed run
    // support. A personally acquired runner can still activate that support
    // while the new man is a different receiver. Recheck belief and picture
    // each tick; recognized flight retains the ordinary ball priority.
    if (this.sub instanceof ManCoverage && believesRun(sim, a)
      && (a.runFit?.kind === 'insert' || a.runFit?.kind === 'alley'
        // The acquired Quarters flat match retains this same body's force
        // duty (and any installed inside option); it does not create a fitter.
        || (a.runFit?.kind === 'force' && this.rule === 'q_apex' && this.state.mode === 'flat'))
      && (sim.ball.kind !== 'air' || !sawThrow(a, sim, this.sub.target))) {
      for (const back of sim.offense) {
        if (!sim.offAlign.spots[back.slot]?.backfield
          || (back.player.position !== 'RB' && back.player.position !== 'FB')) continue;
        const cue = sim.see(a, back);
        if (cue.carrying !== true) continue;
        if (!this.supportRecorded) {
          this.supportRecorded = true;
          if (sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'coverage-run-fit',
            chose: `keyed-fit:${back.slot}`, cue: `${back.slot} carrying=true in consumed picture; current run belief`,
            options: [this.job, `keyed-fit:${back.slot}`],
            detail: `Installed ${a.runFit.kind} ${a.runFit.gap}-gap side ${a.runFit.side} survives ${this.job}; picture age ${cue.age ?? 'unknown'} s. No live-possession confirmation.` });
        }
        return runFit(a, sim, this.gap, this.gapSign, { target: back, cue });
      }
    }
    return this.sub.update(a, sim);
  }

  /**
   * CUT_WALL, one coached rule: an under (a shallow crosser, 7 yd or less) is passed, not carried, by a zone or match
   * defender. Whatever his rule's man or wall directive, he walls the crosser from his own area (his landmark) and,
   * once the crosser is through it, plays his zone. Families whose teaching carries the shallow keep the carry: MEG
   * corners and the MUSH nickel (man by rule), the low-hole rat (his job is the crosser), and pure man calls. A deep
   * "over" (deeper than 7) is outside the rule.
   */
  private passUnder(sim: PlaySim, d: Directive): Directive {
    if (sim.defCall.coverage.man || this.rule === 'q_corner_meg' || this.rule === 'mush' || this.rule === 'rat') return d;
    if (d.t === 'crossWall') return d;
    const area = zoneLandmark(this.zone, sim.offAlign);
    const target = d.t === 'man' || d.t === 'wall' ? d.r : null;
    const rd = target ? this.reader.read(sim, target) : null;
    // CROSS_PASS: the carries the families teach: the halves apex matches #2 up and in (HNFL-097); the quarter-flat apex
    // carries a shallow #2 back across himself with #3 away (HNFL-094) while #2 stays the shallow he declared (his
    // rule's own 7 yd), not an over that climbs out of it.
    if (CROSS_PASS && rd && ((this.rule === 'c2_hook' && this.state.mode === 'in')
      || (this.rule === 'q_apex' && this.state.mode === 'two' && rd.deepest <= 7))) return d;
    const under = !!rd && (CROSS_PASS ? crossing(rd, hookCurlLevel(sim), this.passed === rd.r) : rd.release === 'under' && rd.depth <= 7);
    if (CROSS_PASS) this.passed = under && rd ? rd.r : this.passed === target ? null : this.passed;
    if (!under || !rd) { if (this.walling === target) this.walling = null; return d; }
    const off = Math.abs(rd.pos.y - area.y);
    if (this.walling === rd.r ? off < CUT_EXIT : off < CUT_ENTER) {
      this.walling = rd.r;
      return { t: 'crossWall', r: rd.r, area, half: CUT_ENTER };
    }
    if (this.walling === rd.r) this.walling = null;
    // Through his area (or not yet in it): the crosser is someone else's; he plays his zone.
    return { t: 'zone', zone: this.zone, style: this.style };
  }

  private make(a: Agent, d: Directive): Behavior {
    switch (d.t) {
      case 'zone': return new ZoneCoverage(a, this.sim, d.zone, this.gap, this.gapSign, d.style);
      case 'man':
        if (this.sub instanceof ReadRelease && this.sub.target === d.r
          && (d.opts.lev ?? 'inside') === 'inside' && !d.opts.trail && !d.opts.overTop) return this.sub.match();
        return new ManCoverage(a, this.sim, d.r, false, this.gap, this.gapSign,
          { ...d.opts, protectDepth: isDeepZone(this.zone) });
      case 'read': return new ReadRelease(a, this.sim, d.r, this.reader, this.gap, this.gapSign, d.initialPosition);
      case 'trap': return new Trap(d.r, this.reader, this.gap, this.gapSign);
      case 'wall': return new Wall(d.r, this.reader, this.gap, this.gapSign, d.inside, d.flat);
      case 'rob': return new Rob(d.r, this.reader, this.gap, this.gapSign);
      case 'crossWall': return new CrossWall(d.r, this.reader, this.gap, this.gapSign, d.area, d.half);
    }
  }
}

function directiveKey(d: Directive): string {
  switch (d.t) {
    case 'zone': return `zone:${d.zone}:${d.style}`;
    case 'man': return `man:${d.r.slot}:${d.opts.lev ?? 'inside'}:${d.opts.overTop ? 'top' : ''}${d.opts.trail ? 'trail' : ''}`;
    case 'wall': return `wall:${d.r.slot}:${d.inside ?? ''}:${d.flat?.slot ?? ''}`;
    case 'crossWall': return `crossWall:${d.r.slot}`;
    default: return `${d.t}:${d.r.slot}`;
  }
}
