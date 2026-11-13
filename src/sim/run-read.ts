/** The back's run read: where his eyes are, what he keys, and what the key's
 * relationship to its block tells him.
 *
 * Coaching sequence (docs/references/Running_Back_Mechanics_Textbook.md
 * sections 1-3, 8, 10 and 35): press the track, read the defender or block
 * that controls the lane, decide, get vertical. The read is a relationship,
 * not a painted gap:
 *
 * - The first key is the defender who controls the called lane, found in his
 *   own picture after the snap: on outside/wide zone the first man on or
 *   outside the play-side tackle, on inside zone the first man play side of
 *   the center. A slant hands the key to whoever is now there.
 * - Go to the side of the block away from the key: key sealed inside his
 *   blocker means bounce outside the block; key outside or widening means
 *   bang up the blocker's inside hip. If the frontside answers cannot be
 *   reached ahead of the fitters, bend back behind the flow.
 * - The second key is the nearest fitting backer. Everything else is seen
 *   peripherally (later), more so for a back with poor vision.
 *
 * He commits when the relationship declares, when he reaches his decision
 * depth, or when pressing is no longer safe; never on a timer. Better readers
 * project the relationship further ahead and need less evidence. Each read
 * carries a held judgment error, so backs misread.
 */
import type { Vec2 } from '../core/vec.js';
import { sprintTime, timeToReach } from '../physics/reach.js';
import type { RunScheme } from '../playbook/types.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';
import { observeRunRead, runReadObservers } from './run-read-observer.js';

/** Press-and-read for zone runs. Experimental, off by default (RUN_READ=1 on):
 * see docs/reviews/run-read.md. */
export const RUN_READ = process.env.RUN_READ === '1';

/** Diagnostic candidate, parked after fresh controls lost clean arrivals.
 * Changes only the RB arrival model; see docs/reviews/run-read-approach.md. */
export const RUN_READ_TURN = process.env.RUN_READ_TURN === '1';

/** Keys seen focally, the rest peripherally (READ_EYES=0: no peripheral delay). */
const READ_EYES = process.env.READ_EYES !== '0';

const STRETCH = new Set<RunScheme>(['outsideZone', 'wideZone']);
export const READ_SCHEMES = new Set<RunScheme>(['outsideZone', 'wideZone', 'insideZone']);

export type Answer = 'bounce' | 'bang' | 'bend';

export interface RunReadState {
  answer: Answer | null;
  why: 'declared' | 'decision depth' | 'unsafe' | null;
  entry: Vec2 | null;
  key: Agent | null;
  blocker: Agent | null;
  fitter: Agent | null;
  beat: number;
  nextRead: number;
  committedAt: number | null;
  /** Last picture, for diagnostics. */
  leverage: number | null;
  risks: Partial<Record<Answer, number>>;
}

/** Diagnostic access for probes. */
export const runReads = new WeakMap<Agent, RunReadState>();

const SURFACE = new Set(['LT', 'LG', 'C', 'RG', 'RT']);

interface Frame { side: number; dir: number; lat: (p: Vec2) => number; depth: (p: Vec2) => number; at: (lat: number, depth: number) => Vec2 }

function frame(sim: PlaySim, a: Agent, side: number): Frame {
  const dir = sim.attackDir(a.team);
  return {
    side, dir,
    lat: (p) => (p.y - sim.ballY) * side,
    depth: (p) => (p.x - sim.los) * dir,
    at: (lat, depth) => ({ x: sim.los + depth * dir, y: sim.ballY + lat * side }),
  };
}

/** Who the back keys now, from his own picture. */
export function readKeys(a: Agent, sim: PlaySim, scheme: RunScheme, side: number, track: Vec2) {
  const f = frame(sim, a, side);
  const surface = sim.offense.filter((o) => SURFACE.has(o.slot) || sim.offAlign.spots[o.slot]?.inline);
  const seenLat = (o: Agent) => f.lat(sim.see(a, o).pos);
  const ol = surface.filter((o) => SURFACE.has(o.slot));
  const tackle = Math.max(...ol.map(seenLat));
  const center = sim.slot('C') ? seenLat(sim.slot('C')!) : 0;
  const defenders = sim.opponents(a).filter((d) => !d.isDown(sim.t)).map((d) => ({ d, s: sim.see(a, d) }));
  const atLine = defenders.filter(({ s }) => f.depth(s.pos) < 2 && s.pose !== 'down');
  const floor = STRETCH.has(scheme) ? tackle - .6 : center + .3;
  const first = atLine.filter(({ s }) => f.lat(s.pos) >= floor).sort((p, q) => f.lat(p.s.pos) - f.lat(q.s.pos))[0]?.d ?? null;
  let blocker: Agent | null = null;
  if (first) {
    // Bodies locked together are visible; otherwise the nearest surface body.
    blocker = sim.engagements.find((e) => e.defender === first)?.blocker ?? null;
    if (!blocker) {
      const k = sim.see(a, first).pos;
      blocker = surface.map((o) => ({ o, dist: Math.hypot(sim.see(a, o).pos.x - k.x, sim.see(a, o).pos.y - k.y) }))
        .filter((c) => c.dist < 1.4).sort((p, q) => p.dist - q.dist)[0]?.o ?? null;
    }
  }
  const fitter = defenders.filter(({ d, s }) => d !== first && f.depth(s.pos) >= 1.5 && f.depth(s.pos) < 7
    && f.lat(s.pos) > -3 && f.lat(s.pos) < tackle + 5)
    .sort((p, q) => Math.hypot(p.s.pos.x - track.x, p.s.pos.y - track.y) - Math.hypot(q.s.pos.x - track.x, q.s.pos.y - track.y))[0]?.d ?? null;
  return { key: first, blocker, fitter, center, tackle };
}

/** Can perceived defenders get to his path to this entry before he does?
 * Sampled along the approach, with his own acceleration from his current
 * velocity along it (0 = clean); the worst point counts. */
export function entryRisk(a: Agent, sim: PlaySim, entry: Vec2, chargeRedirect = RUN_READ_TURN): number {
  const D = Math.hypot(entry.x - a.pos.x, entry.y - a.pos.y) || 1e-6;
  const ux = (entry.x - a.pos.x) / D, uy = (entry.y - a.pos.y) / D;
  const s0 = Math.max(0, a.vel.x * ux + a.vel.y * uy);
  const seen = sim.opponents(a).filter((d) => !d.isDown(sim.t)).map((d) => ({ d, s: sim.see(a, d) }));
  const trace = runReadObservers.has(sim) && process.env.READ_RISK_TRACE === '1';
  const samples: unknown[] = [];
  let worst = 0;
  for (const u of [.35, .7, 1]) {
    const q = { x: a.pos.x + ux * D * u, y: a.pos.y + uy * D * u };
    // Candidate: pay for redirecting existing velocity just as defenders do.
    // The legacy straight sprint erases sideways/away momentum. Keep that
    // default until the candidate's fresh protected-route regressions resolve.
    const arrive = chargeRedirect ? timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile }, q)
      : sprintTime(D * u, s0, a.profile.vmax, a.profile.tau);
    let risk = 0;
    const threats: unknown[] = [];
    for (const { d, s } of seen) {
      if (Math.hypot(s.pos.x - q.x, s.pos.y - q.y) > 8) continue;
      // Bodies locked in a block are slower to come off it; not a known outcome.
      const tied = d.engagement ? .35 : 0;
      const reach = timeToReach({ ...s, profile: d.profile, speedScale: d.speedScale }, q, d.profile.radius + a.profile.radius) + tied;
      risk += Math.max(0, arrive - reach) * 3;
      if (trace) threats.push({ defender: d.idx, seen: s, tied, reach, uncontainedReach: reach - tied,
        actual: { pos: d.pos, vel: d.vel }, contribution: Math.max(0, arrive - reach) * 3 });
    }
    worst = Math.max(worst, risk);
    if (trace) samples.push({ u, point: q, arrive, risk, threats });
  }
  if (trace) observeRunRead(sim, a, 'entry-risk', { entry, pos: a.pos, vel: a.vel, samples, risk: worst });
  return worst;
}

/** Entry points for each answer in the current picture (absolute positions). */
function entries(a: Agent, sim: PlaySim, f: Frame, key: Perceived, keyR: number, blocker: Perceived | null, blockerR: number,
  center: number, h: number): Record<Answer, Vec2> {
  const proj = (p: Perceived) => f.lat({ x: p.pos.x + p.vel.x * h, y: p.pos.y + p.vel.y * h });
  const k = proj(key), b = blocker ? proj(blocker) : k;
  const pad = Math.max(keyR, blocker ? blockerR : 0) + a.profile.radius;
  const depth = .5;
  return {
    bounce: f.at(Math.max(k, b) + pad + .35, depth),
    bang: f.at(Math.min(k, b) - pad - .25, depth),
    // Behind the flow: the backside of the center.
    bend: f.at(Math.min(center - 1.0, Math.min(k, b) - pad - 2.5), depth),
  };
}

/**
 * One read beat for a designed zone run. Returns the committed answer and
 * entry, or null while the back should keep pressing his track.
 */
export function runRead(a: Agent, sim: PlaySim, scheme: RunScheme, side: number, track: Vec2, canCommit = true): RunReadState {
  let st = runReads.get(a);
  if (!st) {
    st = { answer: null, why: null, entry: null, key: null, blocker: null, fitter: null, beat: 0, nextRead: sim.t, committedAt: null, leverage: null, risks: {} };
    runReads.set(a, st);
  }
  const vision = a.r('vision'), anticipation = a.r('anticipation');
  // Eyes: first key and second key; the rest peripheral.
  const peripheral = READ_EYES ? .08 + .17 * (1 - vision) : 0;
  if (sim.t < st.nextRead) {
    a.eyes = { keys: [st.key, st.fitter].filter((x): x is Agent => !!x), peripheral };
    return st;
  }
  st.nextRead = sim.t + a.mind.decisionInterval;
  st.beat++;
  const f = frame(sim, a, side);
  const keys = readKeys(a, sim, scheme, side, track);
  st.fitter = keys.fitter;
  // The key is the man identified early at the line; he is tracked, and only
  // re-keyed if he leaves the line or goes down. A committed back keeps his
  // answer; only its entry moves with the bodies.
  const gone = st.key && (st.key.isDown(sim.t) || f.depth(sim.see(a, st.key).pos) > 2.5);
  if (!st.answer && (!st.key || gone)) st.key = keys.key;
  if (!st.answer && st.key) st.blocker = sim.engagements.find((x) => x.defender === st!.key)?.blocker ?? (st.key === keys.key ? keys.blocker : st.blocker);
  a.eyes = { keys: [st.key, st.fitter].filter((x): x is Agent => !!x), peripheral };
  if (!st.key) return st;
  const key = sim.see(a, st.key), blocker = st.blocker ? sim.see(a, st.blocker) : null;
  // Better readers project the relationship further ahead.
  const h = .1 + .35 * anticipation;
  const proj = (p: Perceived) => f.lat({ x: p.pos.x + p.vel.x * h, y: p.pos.y + p.vel.y * h });
  // Held per-read misjudgment of the relationship, larger for poor vision.
  const noise = a.mind.judgment(`run-read:${st.beat}`) * (.1 + .35 * (1 - vision));
  // Positive: the blocker is outside his man (key sealed inside).
  const leverage = blocker ? proj(blocker) - proj(key) + noise : -1 + noise;
  st.leverage = leverage;
  const e = entries(a, sim, f, key, st.key.profile.radius, blocker, st.blocker?.profile.radius ?? 0, keys.center, h);
  e.bend = bendEntry(a, sim, f, f.lat(e.bang) - 1) ?? e.bend;
  // Capture the actual consumed picture, including the independently found
  // current key. Diagnostic consumers copy these values synchronously.
  const observed = (result: RunReadState): RunReadState => {
    if (runReadObservers.has(sim)) observeRunRead(sim, a, 'read', {
      beat: st!.beat, canCommit, candidateKey: keys.key?.idx ?? null,
      key: st!.key?.idx ?? null, blocker: st!.blocker?.idx ?? null,
      fitter: st!.fitter?.idx ?? null, gone: !!gone, keySeen: key,
      blockerSeen: blocker, horizon: h, noise, leverage, entries: e,
      track, side, answer: result.answer, entry: result.entry,
      committedAt: result.committedAt, why: result.why, risks: result.risks,
    });
    return result;
  };
  if (st.answer) { st.entry = e[st.answer]; return observed(st); }
  // Without the ball he reads but cannot cut yet.
  if (!canCommit) return observed(st);

  const margin = .2 + .4 * (1 - .5 * vision - .5 * a.r('playRecognition'));
  const declared = Math.abs(leverage) > margin;
  const order: Answer[] = leverage > 0
    ? (STRETCH.has(scheme) ? ['bounce', 'bang', 'bend'] : ['bend', 'bounce', 'bang'])
    : ['bang', 'bend', 'bounce'];
  const risks: Partial<Record<Answer, number>> = {};
  for (const ans of order) risks[ans] = entryRisk(a, sim, e[ans]);
  st.risks = risks;
  const depth = f.depth(a.pos);
  // Decision depth: he must have chosen before he is on the line's heels.
  const atDepth = depth > -1.6;
  // Pressing is unsafe once an unblocked defender can close on him within two reads.
  const unsafe = sim.opponents(a).some((d) => {
    if (d.isDown(sim.t) || d.engagement) return false;
    const s = sim.see(a, d);
    return timeToReach({ ...s, profile: d.profile, speedScale: d.speedScale }, a.pos, a.profile.radius + d.profile.radius + d.profile.reach * .75) < 2 * a.mind.decisionInterval;
  });
  const ok = order.find((ans) => risks[ans]! < .6);
  // The read forms early, but the cut is made near the decision point:
  // turning early lets the second level fit it. A clear read lets him go a
  // step before the heels of his line.
  if (declared && ok && ok === order[0] && depth > -2.2) return observed(commit(st, a, sim, ok, e[ok], 'declared'));
  if (atDepth || unsafe) {
    const pick = ok ?? order.reduce((p, q) => (risks[q]! < risks[p]! ? q : p));
    return observed(commit(st, a, sim, pick, e[pick], unsafe && !atDepth ? 'unsafe' : 'decision depth'));
  }
  return observed(st);
}

function commit(st: RunReadState, a: Agent, sim: PlaySim, answer: Answer, entry: Vec2, why: RunReadState['why']): RunReadState {
  st.answer = answer; st.entry = entry; st.why = why; st.committedAt = sim.t;
  a.tags.add(`read-${answer}`);
  return st;
}

/** The cutback: the safest crease between surface bodies backside of the
 * frontside answers, as he sees them now. */
function bendEntry(a: Agent, sim: PlaySim, f: Frame, inside: number): Vec2 | null {
  const surface = sim.offense.filter((o) => SURFACE.has(o.slot) || sim.offAlign.spots[o.slot]?.inline)
    .map((o) => ({ s: sim.see(a, o), r: o.profile.radius })).sort((p, q) => f.lat(p.s.pos) - f.lat(q.s.pos));
  let best: Vec2 | null = null, cost = Infinity;
  for (let i = 1; i < surface.length; i++) {
    const l = surface[i - 1], r = surface[i];
    const width = f.lat(r.s.pos) - r.r - f.lat(l.s.pos) - l.r;
    const mid = (f.lat(l.s.pos) + f.lat(r.s.pos)) / 2;
    if (width < a.profile.radius * 1.4 || mid > inside) continue;
    const p = f.at(mid, .5), risk = entryRisk(a, sim, p);
    if (risk < cost) { cost = risk; best = p; }
  }
  return best;
}
