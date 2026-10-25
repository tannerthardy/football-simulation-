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

export const DETECTORS: Detector[] = [presnap, turned, stuck, backpedal, slide];
