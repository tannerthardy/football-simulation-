/**
 * BELIEVED_BODY (experimental, off; Flex, 2026-11-24; docs/reviews/2026-11-24-believed-body.md): what a player believes about
 * an opponent's physical capacities, held by him (a holder), made of evidence entries each with a source (his build seen,
 * the staff's film, what he saw), shared only by explicit messages over a channel (the huddle between plays). Decisions read
 * `believedCaps(sim, holder, target)`; with the flag off it returns the target's true capacities, as the code read them before.
 *
 * Step 2 (coverage): the capacities a coverage decision reads of a receiver: top speed, burst (vmax / tau), braking and
 * cutting. This file is the producer: it reads a target's true capacities only for the staff's film (truth + one error per
 * game, never truth times a rating) and on the flag's off path.
 */
import { Rng } from '../core/rng.js';
import type { PhysicalProfile } from '../players/physical.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';

export const BELIEVED_BODY = process.env.BELIEVED_BODY === '1';

/** The capacities a decision may hold a belief about (step 2). `tau` is derived from vmax and accel. */
export type Caps = Pick<PhysicalProfile, 'vmax' | 'tau' | 'brake' | 'lateral'>;
type Cap = 'vmax' | 'accel' | 'brake' | 'lateral';
const CAPS: readonly Cap[] = ['vmax', 'accel', 'brake', 'lateral'];

export interface Source { kind: 'appearance' | 'film' | 'saw' | 'told'; from?: string; channel?: 'own' | 'huddle'; play: number; t: number }
export interface Entry { cap: Cap; value: number; sd: number; kind: 'floor' | 'measure'; source: Source }

/** The engine's own population relation between visible build and capacity (scripts/diag/belief/body-prior-fit.mts, 64 teams,
 * 3264 players; OLS on u = (weight - 250) / 50, u^2 and h = (height - 74) / 2): coefficients and the sd left after build. */
const PRIOR: Record<Cap, { c: [number, number, number, number]; sd: number }> = {
  vmax: { c: [8.921, -0.850, -0.053, -0.020], sd: 0.217 },
  accel: { c: [7.042, -0.717, -0.154, -0.053], sd: 0.806 },
  brake: { c: [6.281, -0.522, -0.086, -0.049], sd: 0.379 },
  lateral: { c: [6.379, -0.568, -0.139, -0.020], sd: 0.419 },
};
export const PRIOR_FIT = PRIOR;
/** His sight of a man's weight is off by one draw per (holder, man, game) (lb; stated choice). */
const APPEAR_WEIGHT_SD = 8;
/** The staff's film (stated choices): sd at no snaps, snaps per season, and the snaps the staff needs per unit of study. */
const FILM_SD0: Record<Cap, number> = { vmax: 0.30, accel: 0.8, brake: 0.4, lateral: 0.4 };
const SNAPS_PER_YEAR = 500;
const N0_PER_STUDY = 150;
const STUDY = 0.5;
/** A clear look (stated choices): a plateau of seen speed held this long (s) at under this seen acceleration (yd/s^2), above
 * this speed (yd/s); its sd at one plateau's length; the effort sd added when the context says full speed. */
const LOOK_SECONDS = 0.6;
const LOOK_FLAT = 1.0;
const LOOK_MIN_SPEED = 4;
const LOOK_SD = 0.2;
/** A burst look: from under this speed to 60% of his believed top speed; the sight error of its mean acceleration (yd/s^2). */
const BURST_FROM = 1.5;
const BURST_SD = 1.0;
/** The huddle channel (stated choices, not measured): items per player per play, loss by the receiver's awareness, and the
 * sd a told value carries on top of the teller's. */
const HUDDLE_ITEMS = 2;
const huddleLost = (awareness01: number) => 0.15 - 0.13 * awareness01;
const TOLD_SD = 0.1;

const normPdf = (x: number) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
/** Standard normal CDF (Abramowitz-Stegun 7.1.26 erf). */
const normCdf = (x: number) => { const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return 0.5 * (1 + Math.sign(x) * erf); };
const prior = (cap: Cap, weightLb: number, heightIn: number) => {
  const u = (weightLb - 250) / 50, h = (heightIn - 74) / 2, c = PRIOR[cap].c;
  return c[0] + c[1] * u + c[2] * u * u + c[3] * h;
};

/** One holder's belief about one man: his evidence and its combination. */
export class Belief {
  readonly entries: Entry[] = [];
  private cache: Partial<Record<Cap, { mean: number; sd: number; floor: number }>> = {};
  add(e: Entry): void { this.entries.push(e); delete this.cache[e.cap]; }
  get(cap: Cap): { mean: number; sd: number; floor: number } {
    const hit = this.cache[cap];
    if (hit) return hit;
    let w = 0, wm = 0, floor = -Infinity;
    for (const e of this.entries) {
      if (e.cap !== cap) continue;
      if (e.kind === 'floor') floor = Math.max(floor, e.value);
      else { const p = 1 / (e.sd * e.sd); w += p; wm += p * e.value; }
    }
    const mean = w > 0 ? wm / w : 0, sd = w > 0 ? 1 / Math.sqrt(w) : Infinity;
    // A seen floor truncates the estimate (he can do at least this): the mean and sd of the prior-and-film normal above it.
    if (Number.isFinite(floor) && Number.isFinite(sd) && sd > 0) {
      const a = (floor - mean) / sd;
      if (a > 6) return (this.cache[cap] = { mean: floor, sd: sd / a, floor });
      const lam = normPdf(a) / Math.max(1e-12, 1 - normCdf(a));
      return (this.cache[cap] = { mean: mean + sd * lam, sd: sd * Math.sqrt(Math.max(1e-6, 1 + a * lam - lam * lam)), floor });
    }
    return (this.cache[cap] = { mean: Math.max(mean, floor), sd, floor });
  }
  caps(): Caps {
    const vmax = this.get('vmax').mean, accel = Math.max(1, this.get('accel').mean);
    return { vmax, tau: vmax / accel, brake: this.get('brake').mean, lateral: this.get('lateral').mean };
  }
}

interface Track { since: number; lastT: number; lastSpeed: number; sum: number; n: number; emitted: number | null;
  burstFrom: number | null; burstV0: number }

/** A game's beliefs: every holder's, by player id, about every man he has evidence on. One store per game; a play without
 * one gets a fresh store (its beliefs start from build and film). */
export class BeliefStore {
  play = 0;
  private held = new Map<string, Map<string, Belief>>();
  private tracks = new Map<string, Track>();
  /** This play's own looks, for the huddle: holder id -> target id -> the step his look made in vmax. */
  private seenThisPlay = new Map<string, Map<string, number>>();
  constructor(readonly seed: number | string) {}

  belief(holder: Agent, target: Agent): Belief {
    let mine = this.held.get(holder.player.id);
    if (!mine) this.held.set(holder.player.id, mine = new Map());
    let b = mine.get(target.player.id);
    if (!b) {
      mine.set(target.player.id, b = this.seedBelief(holder, target));
      this.flushPending(holder.player.id, target.player.id, b);
    }
    return b;
  }

  private seedBelief(holder: Agent, target: Agent): Belief {
    const b = new Belief(), m = target.player.measurables;
    // Appearance: his build as this holder sees it (one weight error per holder, man and game).
    const wSeen = m.weightLb + new Rng(`bb-appear|${this.seed}|${holder.player.id}|${target.player.id}`).normal(0, APPEAR_WEIGHT_SD);
    for (const cap of CAPS) {
      const slope = (prior(cap, wSeen + 1, m.heightIn) - prior(cap, wSeen - 1, m.heightIn)) / 2;
      b.add({ cap, value: prior(cap, wSeen, m.heightIn), sd: Math.hypot(PRIOR[cap].sd, slope * APPEAR_WEIGHT_SD), kind: 'measure',
        source: { kind: 'appearance', play: this.play, t: 0 } });
    }
    // Film: the opposing staff's report on him (every holder of a belief about him is on the other team), truth plus one
    // error per game, tighter for a man with more snaps on film. A man with none has no film.
    const n = SNAPS_PER_YEAR * target.player.experience;
    if (n > 0) {
      const rng = new Rng(`bb-film|${this.seed}|${target.player.id}`), p = target.profile;
      const truth: Record<Cap, number> = { vmax: p.vmax, accel: p.vmax / p.tau, brake: p.brake, lateral: p.lateral };
      for (const cap of CAPS) {
        const sd = FILM_SD0[cap] / Math.sqrt(1 + n / (N0_PER_STUDY * STUDY));
        b.add({ cap, value: truth[cap] + rng.normal(0, sd), sd, kind: 'measure', source: { kind: 'film', from: 'staff', play: this.play, t: 0 } });
      }
    }
    return b;
  }

  /** What the holder believes the man's capacities are. */
  caps(holder: Agent, target: Agent): Caps { return this.belief(holder, target).caps(); }

  /**
   * His own look at the man this tick, from the picture his decision already holds (only attended men are fed). What he sees a
   * man do is a lower bound on what he can do, never a sample of it: most of what he sees is a man not at full effort (a route
   * runs below top speed: staged go, 2026-11-24, seen 8.7 yd/s at 4.5 s of a true 10.9). A plateau of seen speed held
   * LOOK_SECONDS is a floor on his top speed; a rise from near rest is a floor on his burst. The belief is the build-and-film
   * estimate truncated at the floor (Belief.get), so seeing 9.2 proves at least 9.2 at once and seeing 6 proves nothing. Each look is
   * one entry, made once per plateau; nothing is re-estimated per tick.
   */
  look(holder: Agent, target: Agent, cue: Perceived, t: number, awareness01: number): void {
    if (cue.stale) return;
    const key = `${holder.player.id}|${target.player.id}`, speed = Math.hypot(cue.vel.x, cue.vel.y);
    let tr = this.tracks.get(key);
    if (!tr) this.tracks.set(key, tr = { since: t, lastT: t, lastSpeed: speed, sum: 0, n: 0, emitted: null, burstFrom: null, burstV0: 0 });
    const dt = t - tr.lastT;
    if (speed < BURST_FROM) { tr.burstFrom = t; tr.burstV0 = speed; }
    const flat = dt > 0 && Math.abs(speed - tr.lastSpeed) / dt < LOOK_FLAT;
    if (dt > 0 && (!flat || speed < LOOK_MIN_SPEED)) { tr.since = t; tr.sum = 0; tr.n = 0; tr.emitted = null; }
    if (speed >= LOOK_MIN_SPEED && (dt === 0 || flat)) {
      tr.sum += speed; tr.n++;
    }
    const b = this.belief(holder, target);
    // Burst: his mean acceleration over a rise from near rest to 60% of the top speed he believes. A man's acceleration only
    // falls as his speed rises, so the mean over the rise is a lower bound on his burst from rest (vmax / tau), whatever his
    // effort; less the sight error of the two speeds.
    if (tr.burstFrom !== null && speed >= 0.6 * b.get('vmax').mean) {
      const dt60 = t - tr.burstFrom;
      if (dt60 > 0.1 && this.registers(key, 'burst', awareness01)) {
        b.add({ cap: 'accel', value: (speed - tr.burstV0) / dt60 - BURST_SD, sd: BURST_SD, kind: 'floor', source: { kind: 'saw', channel: 'own', play: this.play, t } });
      }
      tr.burstFrom = null;
    }
    if (tr.n > 0 && t - tr.since >= LOOK_SECONDS && tr.emitted === null) {
      tr.emitted = t;
      if (this.registers(key, `look${tr.since.toFixed(2)}`, awareness01)) {
        const before = b.get('vmax').mean, v = tr.sum / tr.n, sd = LOOK_SD * (1.25 - 0.5 * awareness01);
        b.add({ cap: 'vmax', value: v - 2 * sd, sd, kind: 'floor', source: { kind: 'saw', channel: 'own', play: this.play, t } });
        let mine = this.seenThisPlay.get(holder.player.id);
        if (!mine) this.seenThisPlay.set(holder.player.id, mine = new Map());
        mine.set(target.player.id, Math.max(mine.get(target.player.id) ?? 0, Math.abs(b.get('vmax').mean - before)));
      }
    }
    tr.lastT = t; tr.lastSpeed = speed;
  }

  /** Whether he takes a clear look in at all (0.7 + 0.3 x awareness; stated choice), drawn on the store's own stream. */
  private registers(key: string, what: string, awareness01: number): boolean {
    return new Rng(`bb-reg|${this.seed}|${this.play}|${key}|${what}`).next() < 0.7 + 0.3 * awareness01;
  }

  /**
   * The huddle, between plays: each player on the field tells his unit's men on the field about the opponents he took the
   * biggest steps on this play (HUDDLE_ITEMS), as `told` entries carrying his own evidence plus TOLD_SD; a message is lost by
   * the receiver's awareness. Only that unit hears it (the defense does not pass to its own offense).
   */
  huddle(units: Array<Array<{ id: string; awareness01: number }>>): void {
    for (const unit of units) {
      for (const teller of unit) {
        const seen = this.seenThisPlay.get(teller.id);
        if (!seen) continue;
        const top = [...seen].sort((p, q) => q[1] - p[1]).slice(0, HUDDLE_ITEMS);
        for (const [targetId] of top) {
          // He tells what he saw, not what he believes: his own looks from this play, re-sourced as told. His build prior
          // and the staff's film are the hearer's too already; passing them on would count them twice.
          const saw = (this.held.get(teller.id)?.get(targetId)?.entries ?? []).filter((e) => e.source.kind === 'saw' && e.source.play === this.play);
          if (!saw.length) continue;
          for (const hearer of unit) {
            if (hearer.id === teller.id) continue;
            if (new Rng(`bb-huddle|${this.seed}|${this.play}|${teller.id}|${hearer.id}|${targetId}`).next() < huddleLost(hearer.awareness01)) continue;
            const told: Entry[] = saw.map((e) => ({ ...e, sd: Math.hypot(e.sd, TOLD_SD), value: e.kind === 'floor' ? e.value - TOLD_SD : e.value,
              source: { kind: 'told', from: teller.id, channel: 'huddle', play: this.play, t: 0 } }));
            // A man he has not met yet: kept until his belief of him is first made.
            const b = this.held.get(hearer.id)?.get(targetId);
            if (b) for (const e of told) b.add(e); else this.pending(hearer.id, targetId).push(...told);
          }
        }
      }
    }
    this.seenThisPlay.clear();
    this.tracks.clear();
    this.play++;
  }

  private waiting = new Map<string, Entry[]>();
  private pending(holderId: string, targetId: string): Entry[] {
    const k = `${holderId}|${targetId}`;
    let l = this.waiting.get(k);
    if (!l) this.waiting.set(k, l = []);
    return l;
  }
  /** Entries told to a holder about a man before he had a belief of him are added when the belief is first made. */
  private flushPending(holderId: string, targetId: string, b: Belief): void {
    const k = `${holderId}|${targetId}`, l = this.waiting.get(k);
    if (l) { for (const e of l) b.add(e); this.waiting.delete(k); }
  }
}

/** The capacities `holder` takes `target` to have: his belief (BELIEVED_BODY), else the man's own, as before. */
export function believedCaps(sim: { beliefs: BeliefStore | null }, holder: Agent, target: Agent): Caps {
  return BELIEVED_BODY && sim.beliefs ? sim.beliefs.caps(holder, target) : target.profile;
}

/** Feed a decision's own picture of a man to the holder's belief (BELIEVED_BODY; a no-op off). */
export function lookAt(sim: { beliefs: BeliefStore | null; t: number }, holder: Agent, target: Agent, cue: Perceived): void {
  if (BELIEVED_BODY && sim.beliefs) sim.beliefs.look(holder, target, cue, sim.t, Math.min(1, Math.max(0, holder.r('awareness'))));
}
