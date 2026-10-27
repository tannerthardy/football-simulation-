/**
 * Reads a live game for the film weirdness detectors. It never changes one:
 * it copies numbers out of the PlaySim after each tick, draws no random numbers
 * and returns the engine's own results untouched (test/scorecard-weird-games.test.ts
 * and scripts/weird-identity.ts show games are byte-identical with it on).
 *
 * Two seams: a `playResult` hook wraps the play's `tick` and `run`; and,
 * because pre-snap motion is stepped inside the PlaySim constructor before any
 * hook can run, a wrapper on `World.step` logs the contacts of steps taken at
 * negative world time.
 */
import type { GameHooks, GameResult } from '../../../src/game/game.js';
import { World } from '../../../src/physics/world.js';
import type { Agent } from '../../../src/sim/agent.js';
import type { PlaySim } from '../../../src/sim/playsim.js';
import type { PlayStats } from '../../../src/sim/types.js';
import { DETECTORS } from './detectors.js';
import { Tracker } from './tracker.js';
import type { DetectorId, PlayWeird, WAgent, WContact, WFrame, WeirdEvent } from './types.js';

/** Events kept per detector per game, worst first. Counts are never capped. */
export const EVENT_CAP = 25;
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);

export interface PreSnap {
  steps: number;
  contacts: Array<{ t: number; list: WContact[] }>;
}
const preSnap = new WeakMap<World, PreSnap>();
let original: World['step'] | undefined;

/** Log pre-snap contacts. Idempotent; returns whether this call installed it. */
export function installPreSnapCapture(): boolean {
  if (original) return false;
  original = World.prototype.step;
  const orig = original;
  World.prototype.step = function (this: World, ...args: Parameters<World['step']>) {
    const t = this.time;
    const report = orig.apply(this, args);
    if (t < 0) {
      let rec = preSnap.get(this);
      if (!rec) preSnap.set(this, (rec = { steps: 0, contacts: [] }));
      rec.steps++;
      if (report.contacts.length) {
        rec.contacts.push({ t, list: report.contacts.map((c) => ({ i: c.i, j: c.j, impulse: c.impulse, closing: c.closing })) });
      }
    }
    return report;
  };
  return true;
}

export function uninstallPreSnapCapture(): void {
  if (original) World.prototype.step = original;
  original = undefined;
}

export interface ObserveCtx {
  /** `sc7/` in a scorecard run, empty for the film room. */
  idPrefix: string;
  /** 1-based game number in the run. */
  game: number;
  /** Events kept per detector per game (default EVENT_CAP); film-room mode keeps them all. */
  cap?: number;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function blank(a: Agent): WAgent {
  return {
    idx: a.idx, team: a.team, slot: a.slot, x: 0, y: 0, vx: 0, vy: 0, facing: 0, rvx: 0, rvy: 0, rfacing: null,
    engaged: false, down: false, inBond: false, blocks: -1, job: '',
  };
}

/** Copy this tick's state into the reused agent records. */
export function fill(sim: PlaySim, w: WAgent[]): void {
  const bond = sim.bond;
  for (const a of sim.agents) {
    const o = w[a.idx];
    const it = sim.intents[a.idx];
    o.x = a.body.pos.x;
    o.y = a.body.pos.y;
    o.vx = a.body.vel.x;
    o.vy = a.body.vel.y;
    o.facing = a.body.facing;
    o.rvx = it?.vel?.x ?? 0;
    o.rvy = it?.vel?.y ?? 0;
    o.rfacing = it?.facing ?? null;
    o.engaged = a.engagement !== null;
    o.down = a.isDown(sim.t);
    o.inBond = !!bond && (bond.carrier === a || bond.tacklers.includes(a));
    o.blocks = -1;
    o.job = a.behavior.kind;
    o.manTarget = null;
    // Sticky across the play: the record is rebuilt per play (blank), this only remembers earlier ticks.
    o.firstEngaged = o.engaged && !o.everEngaged;
    if (o.engaged) o.everEngaged = true;
    o.pullRole = a.team === 'O' ? (a.behavior as unknown as { plan?: { pullRole?: 'kick' | 'lead' | 'trap' } }).plan?.pullRole ?? null : null;
    if (a.team === 'D' && a.behavior.kind === 'man') {
      const man = a.behavior as unknown as { target?: Agent };
      o.manTarget = man.target?.idx ?? null;
    }
    if (a.team === 'O') {
      const e = a.engagement;
      if (e && (e.blocker === a || e.helpers.includes(a))) o.blocks = e.defender.idx;
      else {
        const beh = a.behavior as unknown as { target?: Agent | null; plan?: { kind?: string } };
        const tg = beh.target;
        if (tg && tg.team === 'D') o.blocks = tg.idx;
        if (beh.plan?.kind) o.job = beh.plan.kind;
      }
    }
  }
}

/** The pre-snap steps and contacts logged for a PlaySim's world (installPreSnapCapture must be active). */
export function preSnapOf(world: World): PreSnap | undefined {
  return preSnap.get(world);
}

/**
 * Watch one play: wraps the instance's `tick` and `run` and returns a getter for
 * what the detectors found, valid once `sim.run()` has returned. `clock` is told
 * how many milliseconds the observation itself took. Reads only.
 */
export function watchPlay(sim: PlaySim, clock: (ms: number) => void = () => {}): { result(): PlayWeird } {
  const t0 = performance.now();
  const w = sim.agents.map(blank);
  const tracker = new Tracker(DETECTORS, w.map((a) => a.slot));
  const pre = preSnap.get(sim.world);
  const motion = sim.motion ? { kind: sim.motion.plan.kind, slot: sim.motion.plan.slot } : null;
  if (pre?.steps) {
    tracker.counts.staged = 1;
    if (!motion) tracker.counts.stagedNoMotion = 1;
  }
  for (const step of pre?.contacts ?? []) {
    tracker.feed({ t: round2(step.t), phase: 'pre', isPass: sim.isPass, offense: true, runner: -1, agents: w, contacts: step.list, motion });
  }
  const frame: WFrame = { t: 0, phase: 'live', isPass: sim.isPass, offense: true, runner: -1, agents: w };
  const recent: WFrame[] = [];
  let flight: WFrame[] = [];
  const olCount = w.filter((a) => a.team === 'O' && OL.has(a.slot)).length;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const s = performance.now();
    fill(sim, w);
    const c = sim.carrier;
    frame.t = round2(sim.t - sim.dt);
    frame.isPass = sim.isPass;
    frame.offense = sim.possession === 'O';
    frame.runner = c && c.team === 'O' && (c !== sim.qb || sim.scrambled) ? c.idx : -1;
    frame.qb = sim.qb.idx;
    frame.holder = c ? c.idx : -1;
    frame.scrambled = sim.scrambled;
    frame.ended = sim.phase === 'dead';
    const b = sim.ball;
    frame.ball = { kind: b.kind };
    if ('flight' in b) Object.assign(frame.ball, {
      x: b.flight.pos.x, y: b.flight.pos.y, z: b.flight.pos.z,
      vx: b.flight.vel.x, vy: b.flight.vel.y,
    });
    if (b.kind === 'air') Object.assign(frame.ball, {
      target: b.target?.idx ?? -1, releaseT: b.releaseT,
      throwaway: b.throwaway, deflected: b.deflected,
    });
    // Read installed data only. liveAim() would acquire a new line picture;
    // calling it here would change what the player consumes.
    const opts = c?.behavior.kind === 'carrier'
      ? (c.behavior as unknown as { opts?: { aim?: { x: number; y: number }; run?: unknown } }).opts : undefined;
    frame.runAim = !sim.isPass && opts?.run && opts.aim ? { ...opts.aim } : undefined;
    // One immutable copy per tick, shared by the short onset window and the
    // current flight. No controllers, perception, flight prediction or RNG.
    const sample: WFrame = { ...frame, agents: w.map(a => ({ ...a })), recent: undefined, flight: undefined };
    if (b.kind === 'air') {
      if (flight[0]?.ball?.releaseT !== b.releaseT) flight = [];
      flight.push(sample);
    }
    frame.recent = recent;
    frame.flight = flight;
    tracker.feed(frame);
    if (b.kind !== 'air') flight = [];
    recent.push(sample);
    while (recent.length && frame.t - recent[0].t > .55 + 1e-9) recent.shift();
    tracker.count('ticks');
    tracker.count('olFrames', olCount);
    if (frame.runner >= 0) {
      tracker.counts.runner = 1;
      if (!sim.isPass) tracker.counts.runRunner = 1;
    }
    clock(performance.now() - s);
  };
  const run = sim.run.bind(sim);
  sim.run = () => {
    const result = run();
    const s = performance.now();
    tracker.close();
    // The brief's control: with no motion called, no teammates should touch.
    if (!motion) tracker.counts['presnap.noMotion'] = tracker.counts['presnap.events'];
    else tracker.counts['presnap.motionMan'] = tracker.events.filter((e) => e.detector === 'presnap' && e.players.includes(motion.slot)).length;
    clock(performance.now() - s);
    return result;
  };
  clock(performance.now() - t0);
  return { result: () => ({ events: tracker.events, counts: tracker.counts }) };
}

export interface WeirdObserver {
  hooks: GameHooks;
  /** After the game: events with film-style ids, and the probe sums. */
  finish(res: GameResult): { events: WeirdEvent[]; sums: Record<string, number>; ms: number };
}

export function weirdObserver(ctx: ObserveCtx): WeirdObserver {
  installPreSnapCapture();
  const captures = new WeakMap<PlayStats, PlayWeird>();
  let ms = 0;
  return {
    hooks: {
      playResult(sim, kind) {
        if (kind !== 'scrimmage') return undefined;
        const watch = watchPlay(sim, (d) => { ms += d; });
        const run = sim.run.bind(sim);
        sim.run = () => {
          const result = run();
          captures.set(result.stats, watch.result());
          return result;
        };
        return undefined;
      },
    },
    finish(res) {
      const events: WeirdEvent[] = [];
      const sums: Record<string, number> = {};
      const add = (k: string, v: number) => { sums[k] = (sums[k] ?? 0) + v; };
      for (const p of res.log) {
        const cap = p.stats ? captures.get(p.stats) : undefined;
        if (!cap) continue;
        const id = `${ctx.idPrefix}G${ctx.game}-P${String(p.index + 1).padStart(3, '0')}`;
        const nullified = p.nullified ? { nullified: true as const } : {};
        for (const e of cap.events) events.push({ ...e, id, play: p.index + 1, ...nullified });
        if ((p.kind !== 'run' && p.kind !== 'pass') || p.nullified) continue;
        add('plays', 1);
        for (const k of ['staged', 'runner', 'runRunner', 'olFrames', 'ticks', 'stagedNoMotion', 'presnap.noMotion', 'presnap.motionMan']) add(k, cap.counts[k] ?? 0);
        for (const d of DETECTORS) {
          const k = d.id;
          add(`${k}.events`, cap.counts[`${k}.events`] ?? 0);
          add(`${k}.frames`, cap.counts[`${k}.frames`] ?? 0);
          if ((cap.counts[`${k}.events`] ?? 0) > 0) add(`${k}.playsHit`, 1);
          if (d.episodeMin) add(`${k}.episodes`, cap.counts[`${k}.episodes`] ?? 0);
        }
      }
      sums.ms = ms;
      return { events: capEvents(events, ctx.cap ?? EVENT_CAP), sums, ms };
    },
  };
}

/** Keep the worst `cap` events per detector, in play order. */
export function capEvents(events: WeirdEvent[], cap = EVENT_CAP): WeirdEvent[] {
  const by = new Map<DetectorId, WeirdEvent[]>();
  for (const e of events) (by.get(e.detector) ?? by.set(e.detector, []).get(e.detector)!).push(e);
  const keep = new Set<WeirdEvent>();
  for (const list of by.values()) {
    for (const e of [...list].sort((a, b) => b.severity - a.severity).slice(0, cap)) keep.add(e);
  }
  return events.filter((e) => keep.has(e));
}
