/**
 * The film weirdness detectors. Each is a pure rule over one WFrame; the
 * tracker (tracker.ts) merges ticks into events. A rule says where to look,
 * never what number is right: thresholds here are not tuned to a target count.
 *
 * To add one: write a Detector below, append it to DETECTORS, add one positive
 * and one negative WFrame to test/scorecard-weird.test.ts and list its metrics
 * in probe.ts (docs/VALIDATION.md has the recipe).
 */
import type { Detector, Hit, History, WAgent, WFrame } from './types.js';

const DEG = 180 / Math.PI;
const NONE: Hit[] = [];
/** Seconds a posture must be held before it counts. A chosen constant, not sourced. */
const HOLD = 0.25;

const wrap = (a: number) => {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a <= -Math.PI) a += 2 * Math.PI;
  return a;
};
const angDiff = (a: number, b: number) => Math.abs(wrap(a - b));
const deg = (r: number) => Math.round(r * DEG);
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);

/** 1. Two offensive bodies touch before the snap. */
const presnap: Detector = {
  id: 'presnap',
  label: 'Pre-snap teammate contact',
  minHold: 0,
  hit(f) {
    if (f.phase !== 'pre' || !f.contacts?.length) return NONE;
    const out: Hit[] = [];
    for (const c of f.contacts) {
      const a = f.agents[c.i], b = f.agents[c.j];
      if (!a || !b || a.team !== 'O' || b.team !== 'O') continue;
      out.push({
        key: `${Math.min(c.i, c.j)}-${Math.max(c.i, c.j)}`,
        players: [c.i, c.j],
        sev: c.closing,
        data: { closing: r2(c.closing), impulse: Math.round(c.impulse), motion: f.motion ? `${f.motion.kind} ${f.motion.slot}` : 'none' },
      });
    }
    return out;
  },
  describe(p, _dur, slots) {
    const [a, b] = p.players;
    const m = p.data.motion === 'none' ? 'no motion called' : `${p.data.motion} motion`;
    return `${slots[a]} and ${slots[b]} touched before the snap (${m}), closing ${p.data.closing} yd/s`;
  },
  score: (p) => p.sev,
};

/** 2. A defender with his back to a nearby runner. */
const turned: Detector = {
  id: 'turned',
  label: 'Defender turned away from a nearby runner',
  minHold: HOLD,
  hit(f) {
    if (f.phase !== 'live' || f.runner < 0) return NONE;
    const r = f.agents[f.runner];
    let out: Hit[] | undefined;
    for (const a of f.agents) {
      if (a.team !== 'D' || a.engaged || a.down || a.inBond) continue;
      const dx = r.x - a.x, dy = r.y - a.y, dist = Math.hypot(dx, dy);
      if (dist >= 5) continue;
      const bearing = Math.atan2(dy, dx);
      const off = angDiff(a.facing, bearing);
      if (off <= 120 / DEG) continue;
      const asked = a.rfacing ?? (Math.hypot(a.rvx, a.rvy) > 0.1 ? Math.atan2(a.rvy, a.rvx) : null);
      (out ??= []).push({
        key: String(a.idx),
        players: [a.idx, f.runner],
        sev: 5 - dist,
        data: { dist: r1(dist), off: deg(off), runner: r.slot },
        intent: { facingOff: asked === null ? 'none' : deg(angDiff(asked, bearing)), source: a.rfacing === null ? 'travel' : 'asked' },
        achieved: { facingOff: deg(off) },
      });
    }
    return out ?? NONE;
  },
  describe(p, dur, slots) {
    const asked = p.intent?.facingOff;
    return `${slots[p.players[0]]} facing ${p.data.off}° from the runner (${p.data.runner}) at ${p.data.dist} yd for ${dur.toFixed(2)} s`
      + (typeof asked === 'number' ? `; asked for ${asked}°` : '');
  },
  score: (p, dur) => dur + p.sev * 0.001,
};

/** The nearest free defender within 3.5 yd of the runner: not down, not engaged, no teammate of the runner within 1 yd. */
function freeNear(f: WFrame, r: WAgent): WAgent | null {
  let best: WAgent | null = null, bd = 3.5;
  for (const d of f.agents) {
    if (d.team !== 'D' || d.down || d.engaged) continue;
    const dist = Math.hypot(d.x - r.x, d.y - r.y);
    if (dist >= bd) continue;
    let blocked = false;
    for (const o of f.agents) {
      if (o.team === 'O' && o.idx !== r.idx && Math.hypot(o.x - d.x, o.y - d.y) < 1) { blocked = true; break; }
    }
    if (!blocked) { best = d; bd = dist; }
  }
  return best;
}

/** 3. A blocker on a man who is out of the play, while a free defender is on the runner (RUN-12). */
const stuck: Detector = {
  id: 'stuck',
  label: 'Blocker on a man who is out of the play',
  minHold: HOLD,
  hit(f) {
    if (f.phase !== 'live' || f.isPass || f.runner < 0) return NONE;
    const r = f.agents[f.runner];
    let free: WAgent | null | undefined;
    let out: Hit[] | undefined;
    for (const b of f.agents) {
      if (b.team !== 'O' || b.idx === f.runner || b.blocks < 0 || b.down) continue;
      const d = f.agents[b.blocks];
      if (!d || d.team !== 'D') continue;
      const dx = d.x - r.x, dy = d.y - r.y, dist = Math.hypot(dx, dy);
      if (dist <= 5) continue;
      const away = (d.vx * dx + d.vy * dy) / dist;
      if (away <= 0.5) continue;
      if (free === undefined) free = freeNear(f, r);
      if (!free) return NONE;
      (out ??= []).push({
        key: `${b.idx}>${d.idx}`,
        players: [b.idx, d.idx, f.runner],
        sev: dist,
        data: { dist: r1(dist), away: r1(away), job: b.job, free: free.slot, freeDist: r1(Math.hypot(free.x - r.x, free.y - r.y)) },
        intent: { vx: r1(b.rvx), vy: r1(b.rvy) },
        achieved: { vx: r1(b.vx), vy: r1(b.vy) },
      });
    }
    return out ?? NONE;
  },
  describe(p, dur, slots) {
    return `${slots[p.players[0]]} (${p.data.job}) on ${slots[p.players[1]]}, ${p.data.dist} yd from the runner and moving away at ${p.data.away} yd/s, while ${p.data.free} is free ${p.data.freeDist} yd from the runner, for ${dur.toFixed(2)} s`;
  },
  score: (p, dur) => dur + p.sev * 0.001,
};

/** 4. An unengaged lineman moving backward while facing his own backfield. */
const backpedal: Detector = {
  id: 'backpedal',
  label: 'Lineman backpedaling while facing his own backfield',
  minHold: HOLD,
  hit(f) {
    if (f.phase !== 'live' || !f.offense) return NONE;
    let out: Hit[] | undefined;
    for (const a of f.agents) {
      if (a.team !== 'O' || !OL.has(a.slot) || a.engaged || a.down) continue;
      if (Math.cos(a.facing) >= Math.cos(120 / DEG) || a.vx >= -1) continue;
      (out ??= []).push({
        key: String(a.idx),
        players: [a.idx],
        sev: -a.vx,
        data: { vx: r1(a.vx), facing: deg(angDiff(a.facing, 0)), play: f.isPass ? 'pass' : 'run' },
        intent: { vx: r1(a.rvx), facing: a.rfacing === null ? 'travel' : deg(angDiff(a.rfacing, 0)) },
        achieved: { vx: r1(a.vx), facing: deg(angDiff(a.facing, 0)) },
      });
    }
    return out ?? NONE;
  },
  describe(p, dur, slots) {
    return `${slots[p.players[0]]} facing ${p.data.facing}° from downfield, moving back at ${Math.abs(Number(p.data.vx))} yd/s for ${dur.toFixed(2)} s (${p.data.play} play)`;
  },
  score: (p, dur) => dur + p.sev * 0.001,
};

/**
 * NFL tracking: the 90th percentile, across players, of a player's median speed
 * retention through a 60°+ turn, by game role. Trajectory-weighted over the 2023-2025
 * pass-play windows in data/reviews/physics-world/nfl-movement/bdb2027-movement.json
 * (roles with at least 90 turn trajectories). test/scorecard-weird.test.ts recomputes
 * this table from that file. It is a retention distribution, not a plant criterion.
 */
export const RETENTION_P90: Record<string, number> = {
  CB: 0.89, HIGH_SAFETY: 0.85, SLOT_CB: 0.85, OLB: 0.8, MLB: 0.81, EDGE: 0.73, INTERIOR_LINE: 0.77,
  C: 0.73, G: 0.85, T: 0.79, WR: 0.81, SLOT_WR: 0.76, TE: 0.82,
};
/** Slots with no tracking role (QB, RB, FB) use this; it is not sourced. */
export const RETENTION_FALLBACK = 0.9;

const ROLE: Record<string, string> = {
  CB_S: 'CB', CB_W: 'CB', DB: 'CB', FS: 'HIGH_SAFETY', SS: 'HIGH_SAFETY', NB: 'SLOT_CB',
  LB_S: 'OLB', LB_W: 'OLB', LB_M: 'MLB', DE_S: 'EDGE', DE_W: 'EDGE', DT_S: 'INTERIOR_LINE', DT_W: 'INTERIOR_LINE', NT: 'INTERIOR_LINE',
  C: 'C', LG: 'G', RG: 'G', LT: 'T', RT: 'T', X: 'WR', Z: 'WR', H: 'SLOT_WR', Y: 'TE',
};
export const roleOf = (slot: string): string | undefined => ROLE[slot];
export const retentionThreshold = (slot: string): number => RETENTION_P90[ROLE[slot]] ?? RETENTION_FALLBACK;

interface Turn { angle: number; retention: number; entry: number; exit: number; t0: number; reqAngle: number | null; reqRatio: number | null }

/**
 * The BDB 2027 turn operator on a 10 Hz path: velocity by a 0.2 s central
 * difference, a turn is 60°+ over 0.5 s with entry speed at least 1.5 and exit
 * at least 1 yd/s (scripts/data/bdb2027_movement.py). Windows that touch a block,
 * a fall or a tackle are skipped.
 */
function turnAt(h: History, i: number, minEntry = 1.5): Turn | null {
  if (!h.sampled || h.n < 8) return null;
  for (let b = 0; b <= 7; b++) if (!h.free(i, b)) return null;
  const vx = (m: number) => (h.px(i, m - 1) - h.px(i, m + 1)) / 0.2;
  const vy = (m: number) => (h.py(i, m - 1) - h.py(i, m + 1)) / 0.2;
  const entry = Math.hypot(vx(6), vy(6)), exit = Math.hypot(vx(1), vy(1));
  if (entry < minEntry || exit < 1) return null;
  const cos = (vx(6) * vx(1) + vy(6) * vy(1)) / (entry * exit);
  const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
  if (angle < 60 / DEG) return null;
  let min = entry;
  for (let m = 5; m >= 1; m--) min = Math.min(min, Math.hypot(vx(m), vy(m)));
  const a0 = Math.hypot(h.rx(i, 6), h.ry(i, 6)), a1 = Math.hypot(h.rx(i, 1), h.ry(i, 1));
  const reqAngle = a0 > 0.1 && a1 > 0.1
    ? Math.acos(Math.max(-1, Math.min(1, (h.rx(i, 6) * h.rx(i, 1) + h.ry(i, 6) * h.ry(i, 1)) / (a0 * a1)))) : null;
  return { angle, retention: min / entry, entry, exit, t0: h.tAt(6), reqAngle, reqRatio: a0 > 0.1 ? a1 / a0 : null };
}

/**
 * Entry speed a turn needs to count for the slide rule, yd/s. The NFL operator
 * (1.5) admits shuffles: the tracked turns in the movement file have a median
 * entry speed of about 1.9 yd/s, and a jog that keeps its speed is not on ice.
 * A plant matters at a run, so this is a chosen floor (3.0), not sourced.
 */
export const SLIDE_MIN_ENTRY = 3;

/**
 * 5. A player turns sharply without losing speed, as if he were on ice.
 * Candidate: no plant threshold is sourced. A cut spans several overlapping
 * windows, so the episode is judged by its worst window: a slide is a turn in
 * which no window shows him slowing. Every sharp-turn episode entered at a run
 * is counted in `slide.episodes`, the denominator for "share of sharp turns with
 * no speed loss".
 */
const slide: Detector = {
  id: 'slide',
  label: 'Sliding through a cut',
  candidate: true,
  minHold: 0,
  episodeMin: true,
  accept: (h) => Number(h.data.retention) >= Number(h.data.thr),
  hit(f, h) {
    if (f.phase !== 'live' || !h.sampled) return NONE;
    let out: Hit[] | undefined;
    for (const a of f.agents) {
      const t = turnAt(h, a.idx, SLIDE_MIN_ENTRY);
      if (!t) continue;
      (out ??= []).push({
        key: String(a.idx),
        players: [a.idx],
        sev: t.retention,
        at: t.t0,
        data: { angle: deg(t.angle), entry: r1(t.entry), exit: r1(t.exit), retention: r2(t.retention), thr: retentionThreshold(a.slot) },
        intent: { turn: t.reqAngle === null ? 'none' : deg(t.reqAngle), speedRatio: t.reqRatio === null ? 'none' : r2(t.reqRatio) },
        achieved: { turn: deg(t.angle), speedRatio: r2(t.retention) },
      });
    }
    return out ?? NONE;
  },
  describe(p, _dur, slots) {
    const asked = p.intent?.turn;
    return `${slots[p.players[0]]} turned ${p.data.angle}° from ${p.data.entry} yd/s keeping ${Math.round(Number(p.data.retention) * 100)}% of his speed through the whole cut (NFL p90 for the role ${Math.round(Number(p.data.thr) * 100)}%)`
      + (typeof asked === 'number' ? `; asked for a ${asked}° turn` : '');
  },
  // Rank by the speed he carried through the cut, so the fastest glides come first.
  score: (p) => Number(p.data.entry) * Number(p.data.retention),
};

/** All new cutoffs are chosen review heuristics, not tracking calibrations. */
const CLIMB = new Set(['climb', 'lead']);

/** 6. A free second-level OL asks to stop. This can be lawful braking. */
const frozen: Detector = {
  id: 'frozen', label: 'Free climber requesting near-zero movement', candidate: true, minHold: .4,
  hit(f) {
    if (f.phase !== 'live' || f.isPass || !f.offense) return NONE;
    const quiet = (s: WFrame, idx: number) => {
      const a = s.agents[idx];
      return !s.isPass && s.offense && a?.team === 'O' && OL.has(a.slot)
        && CLIMB.has(a.job) && !a.engaged && !a.down && !a.inBond && Math.hypot(a.rvx, a.rvy) < .3;
    };
    const out: Hit[] = [];
    for (const a of f.agents) {
      if (!quiet(f, a.idx)) continue;
      // Require eight consecutive 20 Hz requests; a bridged tracker episode
      // must not turn two short stops into a qualifying .4-second stop.
      let at = f.t, last = f.t;
      for (const s of [...(f.recent ?? [])].reverse()) {
        if (last - s.t > .050001 || !quiet(s, a.idx)) break;
        at = s.t; last = s.t;
      }
      if (f.t - at < .35 - 1e-9) continue;
      out.push({ key: String(a.idx), players: [a.idx], at, sev: f.t - at,
        data: { job: a.job }, intent: { speed: r2(Math.hypot(a.rvx, a.rvy)) },
        achieved: { speed: r2(Math.hypot(a.vx, a.vy)) } });
    }
    return out;
  },
  describe: (p, dur, slots) => `${slots[p.players[0]]} (${p.data.job}) free, requesting under 0.3 yd/s for ${dur.toFixed(2)} s; achieved ${p.achieved?.speed} yd/s (review braking/traffic)`,
};

/** 7. A QB goes down with no nearby defender in the preceding half second. */
const downalone: Detector = {
  id: 'downalone', label: 'QB goes down without a nearby defender', candidate: true, minHold: 0,
  hit(f) {
    if (f.phase !== 'live' || !f.offense || !(f.isPass || f.scrambled) || f.qb === undefined) return NONE;
    const q = f.agents[f.qb], prior = f.recent ?? [];
    const prev = prior.at(-1);
    if (!q?.down || q.engaged || q.inBond || !prev || prev.agents[q.idx]?.down || f.t - prev.t > .050001) return NONE;
    const window = prior.filter(s => s.t >= f.t - .5 - 1e-9);
    // Missing onset/history means unknown, never "nobody near".
    if (!window.length || window[0].t > f.t - .5 + 1e-9) return NONE;
    let nearest = Infinity, last = window[0].t;
    for (const s of [...window, f]) {
      if (s.t - last > .050001 || !s.agents[q.idx]) return NONE;
      last = s.t;
      const qb = s.agents[q.idx], defenders = s.agents.filter(a => a.team === 'D');
      if (!defenders.length || qb.engaged || qb.inBond) return NONE;
      for (const d of defenders) nearest = Math.min(nearest, Math.hypot(d.x - qb.x, d.y - qb.y));
    }
    if (nearest <= 2) return NONE;
    return [{ key: String(q.idx), players: [q.idx], sev: nearest,
      data: { nearest: r2(nearest) }, achieved: { down: 'onset', nearestDefender: r2(nearest), priorSeconds: .5 } }];
  },
  describe: (p, _dur, slots) => `${slots[p.players[0]]} went down; nearest defender ${p.data.nearest} yd over the preceding 0.5 s and onset (positions/contact need review)`,
};

/** 8. Whole-flight body-facing proxy. It does not measure gaze/recognition. */
const blindball: Detector = {
  id: 'blindball', label: 'Trailing man defender stays turned from the ball', candidate: true, minHold: 0,
  hit(f) {
    const flight = f.flight ?? [], first = flight[0], last = flight.at(-1), ball = first?.ball;
    if (f.phase !== 'live' || !f.offense || (f.ball?.kind === 'air' && !f.ended) || !first || !last
      || ball?.kind !== 'air' || ball.target === undefined || ball.target < 0 || ball.releaseT === undefined
      || first.t - ball.releaseT > .050001 || first.t < ball.releaseT - .050001) return NONE;
    const out: Hit[] = [];
    for (const d of first.agents) {
      if (d.team !== 'D' || d.manTarget !== ball.target) continue;
      let turn = 0, previousFacing = d.facing, previousT = first.t, maxDist = 0, minOff = Math.PI, valid = true;
      for (const s of flight) {
        const a = s.agents[d.idx], r = s.agents[ball.target], b = s.ball;
        if (!a || !r || b?.x === undefined || b.y === undefined || b.vx === undefined || b.vy === undefined
          || b.releaseT !== ball.releaseT || b.target !== ball.target || b.throwaway || b.deflected
          || s.t - previousT > .050001 || a.manTarget !== ball.target || a.down || a.engaged || a.inBond) { valid = false; break; }
        previousT = s.t;
        const dist = Math.hypot(a.x - r.x, a.y - r.y), speed = Math.hypot(b.vx, b.vy);
        const behind = (r.x - a.x) * b.vx + (r.y - a.y) * b.vy;
        const off = angDiff(a.facing, Math.atan2(b.y - a.y, b.x - a.x));
        turn += angDiff(a.facing, previousFacing); previousFacing = a.facing;
        if (dist > 2 || speed < .1 || behind <= 0 || off <= 120 / DEG || turn > 30 / DEG) { valid = false; break; }
        maxDist = Math.max(maxDist, dist); minOff = Math.min(minOff, off);
      }
      if (!valid || flight.length < 2) continue;
      const a = last.agents[d.idx], b = last.ball!;
      const side = wrap(Math.atan2(b.y! - a.y, b.x! - a.x) - a.facing);
      const shoulder = side > 0 ? 'left-rear' : 'right-rear';
      out.push({ key: `${d.idx}:${ball.releaseT}`, players: [d.idx, ball.target], at: first.t,
        sev: last.t - first.t, data: { distance: r2(maxDist), off: deg(minOff), shoulder, side: Math.round(side * DEG), turn: deg(turn) },
        intent: { facing: a.rfacing === null ? 'none' : Math.round(a.rfacing * DEG) },
        achieved: { minimumBallOffset: deg(minOff), facingTravel: deg(turn), arrivalSide: shoulder, arrivalAngle: Math.round(side * DEG) } });
    }
    return out;
  },
  describe: (p, _dur, slots) => `${slots[p.players[0]]} trailing ${slots[p.players[1]]} within ${p.data.distance} yd through the recorded flight, body >${p.data.off}° from ball; arrival ${p.data.shoulder} (${p.data.side}°), turned ${p.data.turn}° (not gaze evidence)`,
};

/** 9. Geometric nomination, NOT proof a lane is closed or a cut was wrong. */
const phantomlane: Detector = {
  id: 'phantomlane', label: 'Runner leaves installed aim toward a nearby defender', candidate: true, minHold: 0,
  hit(f) {
    if (f.phase !== 'live' || f.isPass || !f.offense || f.runner < 0 || !f.runAim) return NONE;
    const r = f.agents[f.runner];
    if (!r || r.down || r.inBond || Math.hypot(r.vx, r.vy) < .3 || f.runAim.x <= r.x) return NONE;
    const heading = Math.atan2(r.vy, r.vx), designed = Math.atan2(f.runAim.y - r.y, f.runAim.x - r.x);
    if (angDiff(heading, designed) < 30 / DEG) return NONE;
    const ux = Math.cos(heading), uy = Math.sin(heading);
    let near: WAgent | undefined, along = 3, lateral = 0;
    for (const d of f.agents) {
      if (d.team !== 'D' || d.down) continue;
      const dx = d.x - r.x, dy = d.y - r.y, ahead = dx * ux + dy * uy, off = Math.abs(dx * uy - dy * ux);
      if (ahead > 0 && ahead <= along && off <= 1.5) { near = d; along = ahead; lateral = off; }
    }
    if (!near) return NONE;
    return [{ key: String(r.idx), players: [r.idx, near.idx], sev: 3 - along,
      data: { heading: Math.round(heading * DEG), designed: Math.round(designed * DEG), along: r2(along), lateral: r2(lateral), engaged: String(near.engaged) },
      intent: { heading: Math.hypot(r.rvx, r.rvy) < .1 ? 'none' : Math.round(Math.atan2(r.rvy, r.rvx) * DEG), installedAimHeading: Math.round(designed * DEG) },
      achieved: { heading: Math.round(heading * DEG), defenderAhead: r2(along), defenderLateral: r2(lateral), defenderEngaged: String(near.engaged) } }];
  },
  describe: (p, _dur, slots) => `${slots[p.players[0]]} travel ${p.data.heading}° vs installed-aim bearing ${p.data.designed}°; ${slots[p.players[1]]} ${p.data.along} yd ahead, ${p.data.lateral} yd off heading (engaged ${p.data.engaged}; geometry only)`,
};

export const DETECTORS: Detector[] = [presnap, turned, stuck, backpedal, slide, frozen, downalone, blindball, phantomlane];
