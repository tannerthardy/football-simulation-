/**
 * QB_V2's boundary with the old controller (QB lane, 2026-11-24; the outside audit's seam 1, Integration's ruling).
 * Everything V2 needs from QBPass comes through one interface, `PasserView`, which QBPass implements over its own
 * perception and mechanics. This file builds the host the modules read (`V2Host`) and turns the cycle's intent into a
 * command. It lives in src/sim/qbv2, so the information guard (test/qbv2-information.test.ts) covers it by construction:
 * nothing here reads another body's true state, only the view's pictures and the passer's own body.
 */
import type { Agent } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import type { MoveCommand } from '../../physics/kinematics.js';
import type { ReceiverForecast } from '../receiver-forecast.js';
import type { PhysicalProfile } from '../../players/physical.js';
import type { Vec2 } from '../../core/vec.js';
import { anticipationLead, bar, confidenceNeed, resolveTau, type PasserRatings } from './ratings.js';
import type { V2Drive, V2Host } from './drive.js';
import type { ReceiverRef } from '../../playbook/types.js';

/** What QBPass lends V2: his pictures (of defenders, receivers and the rush), his own body and his throwing mechanics.
 * Each member is a perception or his own; none returns another player's true state. */
export interface PasserView {
  readonly a: Agent;
  readonly sim: PlaySim;
  readonly snapAt: number;
  readonly releaseZ: number;
  readonly ratings: PasserRatings;
  /** His picture of a defender (QBMind), its age and spread; the head he sees on him. */
  estimate(d: Agent): { pos: Vec2; vel: Vec2; facing: number };
  pictureAge(d: Agent): number;
  pictureSpread(d: Agent): number;
  /** Time with no new observation of him (s; 0 while watched) and the look's own spread (yd), apart from unseen time. */
  unseenFor(d: Agent): number;
  seenSpread(d: Agent): number;
  /** How far his estimate of a defender has moved to his belief of the man's job (0-1; card spec §1). */
  jobWeight(d: Agent): number;
  seenHead(d: Agent): number | null;
  /** His forecast of a receiver (the install he knows, updated from what he sees). */
  forecast(r: Agent): ReceiverForecast | undefined;
  /** The half-width of his clear look (rad) and his focus. */
  clearHalf(): number;
  /** His throw to a receiver as he would make it now (point and flight), or null. The returned object is the old
   * controller's evaluation, handed back to `startThrow`. */
  evaluate(r: Agent, felt: number): { point: { x: number; y: number; z: number }; T: number } | null;
  windup(): number;
  missSigma(dist: number, felt: number): number;
  bodyOf(d: Agent): PhysicalProfile;
  ballSkills(d: Agent): number;
  /** A body on him (his own contact, 0-1), and the rusher he feels most urgently (where he feels him, how soon). */
  heldBy(): number;
  urgentRusher(): { pos: Vec2; time: number } | null;
  narrow(): number;
  /** His drop's timing: the plant (set) and first-read times, one hitch step; whether the drift's read-from-secure is on. */
  drift: boolean;
  plantAt: number;
  readFrom: number | undefined;
  stride: number;
  /** His receivers by the plan's refs. */
  receiverFor(ref: ReceiverRef): Agent | null;
  /** The old controller's kept mechanics, in his own frame. */
  startThrow(ev: { point: { x: number; y: number; z: number }; T: number }): MoveCommand | null;
  throwAway(at?: { x: number; y: number; z: number }): MoveCommand;
  shouldScramble(): boolean;
  scramble(): MoveCommand;
  pocketMove(read: Agent | undefined): MoveCommand;
  /** His eyes on the receiver he throws to (the play's shared record of where the passer is looking). */
  setEyes(r: Agent): void;
  /** Tracing hooks (the harness's qb-trace). */
  traceRead(read: number, target: string | null): void;
  traceStage(cmd: MoveCommand): void;
}

const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));

/** Outside the pocket with enter and exit margins (audit §1 #5, §3 #4): out past 4.5 yd from the ball's lane, back in
 * inside 3.75 yd. */
export class PocketTest {
  private out = false;
  update(a: Agent, sim: PlaySim): boolean {
    const dy = Math.abs(a.pos.y - sim.ballY);
    this.out = this.out ? dy > 3.75 : dy > 4.5;
    return this.out;
  }
}

/** Build the host the modules read, from the passer's view. */
export function makeHost(v: PasserView, felt: number, pocket: PocketTest, planDrop: string): V2Host {
  const { a, sim } = v, r = v.ratings;
  void planDrop;
  const rush = v.urgentRusher();
  return {
    a, sim, releaseZ: v.releaseZ, snapAt: v.snapAt,
    estimate: (d) => v.estimate(d), seenHead: (d) => v.seenHead(d), pictureAge: (d) => v.pictureAge(d), pictureSpread: (d) => v.pictureSpread(d),
    unseenFor: (d) => v.unseenFor(d), seenSpread: (d) => v.seenSpread(d), jobWeight: (d) => v.jobWeight(d),
    predict: (rc, ahead) => v.forecast(rc)?.predict(sim.t, ahead) ?? null,
    breakAt: (rc) => v.forecast(rc)?.breakAt() ?? null,
    timingAt: (rc) => { const f = v.forecast(rc); return f ? f.turnAt() ?? f.breakAt() : null; },
    breakPoint: (rc) => v.forecast(rc)?.breakPoint() ?? null,
    routeStart: (rc) => { const st = v.forecast(rc)?.prior.start; return st ? { x: st.x, y: st.y } : null; },
    // His own contact, and the side his most urgent felt rusher comes from (audit §1 #4).
    contact: v.heldBy() > 0,
    hotSide: rush && rush.time <= 1.5 ? ((rush.pos.y - sim.ballY) * (sim.offAlign.strongSign >= 0 ? 1 : -1) >= 0 ? 'S' : 'W') : null,
    inClear: (p) => { const eyes = a.head ?? a.body.facing; return Math.abs(wrap(Math.atan2(p.y - a.pos.y, p.x - a.pos.x) - eyes)) < v.clearHalf() * (0.65 + 0.35 * a.mind.focus); },
    mechanics: (rc, u) => v.evaluate(rc, u),
    windup: () => v.windup(),
    placeSpread: (dist) => v.missSigma(dist, felt),
    body: (d) => v.bodyOf(d),
    ballSkills: (d) => v.ballSkills(d),
    plantAt: v.plantAt, readFrom: v.readFrom, stride: v.stride,
    felt, tau: resolveTau(r, v.narrow()), need: confidenceNeed(r, felt),
    lead: v.drift ? anticipationLead(r) : undefined,
    bar: bar(felt, v.narrow()),
    outside: pocket.update(a, sim),
  };
}

/** One V2 step: the cycle's intent turned into a command with the kept mechanics. Null only while drifting with nothing
 * to do (the drift keeps moving him). */
export class V2Wiring {
  private read = -1;
  readonly intents: Record<string, number> = {};
  readonly pocket = new PocketTest();
  host: V2Host | null = null;

  step(v: PasserView, v2: V2Drive, felt: number, drifting = false): MoveCommand | null {
    const h = makeHost(v, felt, this.pocket, v2.plan.drop); this.host = h;
    const intent = v2.tick(h);
    this.intents[intent.kind] = (this.intents[intent.kind] ?? 0) + 1;
    if (v2.cycle.readIdx !== this.read) {
      this.read = v2.cycle.readIdx;
      const rd = v2.plan.reads[this.read];
      v.traceRead(this.read, rd ? (rd.look.kind === 'receiver' ? rd.look.ref : `${rd.look.side ?? 'S'}:${rd.look.role}`) : null);
    }
    const rd = v2.plan.reads[v2.cycle.readIdx], ref = rd ? (rd.look.kind === 'receiver' ? rd.look.ref : rd.throws[0]?.ref) : null;
    const readAgent = ref ? v2.target(h, ref) ?? undefined : undefined;
    let cmd: MoveCommand | null = null;
    if (intent.kind === 'throw') {
      const rc = v2.target(h, intent.judged.option.ref), ev = rc ? v.evaluate(rc, felt) : null;
      if (ev) { v.setEyes(rc!); cmd = v.startThrow(ev); }
      // The cycle's 'throw' holds only once the windup has begun (audit §1 #1): the wiring could not start it (no finish,
      // a gate, no mechanics), so the commit falls back to where he was.
      if (!cmd) v2.cycle.uncommit();
    } else if (intent.kind === 'kill') {
      const rc = v2.target(h, intent.ref), seen = rc ? v.estimate(rc).pos : null; // at where he sees the receiver
      cmd = v.throwAway(seen ? { x: seen.x, y: seen.y, z: 0 } : undefined);
    } else if (intent.kind === 'away') cmd = v.throwAway();
    else if (intent.kind === 'escape' && v.shouldScramble()) cmd = v.scramble();
    if (!cmd && drifting) return null;
    cmd ??= v.pocketMove(readAgent);
    v.traceStage(cmd);
    return cmd;
  }
}
