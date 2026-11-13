/**
 * Turns per-tick hits into events: merges consecutive ticks of the same
 * (detector, key) into one event with a start, an end and the worst tick, and
 * keeps the short history the windowed rules (sliding through a cut) read.
 */
import type { Detector, DetectorId, Hit, History, PlayWeird, WFrame } from './types.js';

/** Ticks apart that still count as the same episode: one skipped tick at DT = 0.05. */
const BRIDGE = 0.11;
const TICK = 0.05;
const RING = 8;
const AGENTS = 22;

export class Ring implements History {
  n = 0;
  sampled = false;
  private t = new Float64Array(RING);
  private x = new Float64Array(AGENTS * RING);
  private y = new Float64Array(AGENTS * RING);
  private rx_ = new Float64Array(AGENTS * RING);
  private ry_ = new Float64Array(AGENTS * RING);
  private ok = new Uint8Array(AGENTS * RING);

  /** Add this frame's sample, at 10 Hz while the play is live. */
  push(f: WFrame): void {
    this.sampled = false;
    if (f.phase !== 'live' || Math.round(f.t * 20) % 2 !== 0) return;
    const s = this.n % RING;
    this.t[s] = f.t;
    for (const a of f.agents) {
      const k = a.idx * RING + s;
      this.x[k] = a.x;
      this.y[k] = a.y;
      this.rx_[k] = a.rvx;
      this.ry_[k] = a.rvy;
      this.ok[k] = a.engaged || a.down || a.inBond ? 0 : 1;
    }
    this.n++;
    this.sampled = true;
  }

  private slot(back: number): number {
    return (((this.n - 1 - back) % RING) + RING) % RING;
  }
  has(back: number): boolean {
    return back >= 0 && back < RING && this.n - 1 - back >= 0;
  }
  tAt(back: number): number {
    return this.has(back) ? this.t[this.slot(back)] : NaN;
  }
  px(idx: number, back: number): number {
    return this.has(back) ? this.x[idx * RING + this.slot(back)] : NaN;
  }
  py(idx: number, back: number): number {
    return this.has(back) ? this.y[idx * RING + this.slot(back)] : NaN;
  }
  rx(idx: number, back: number): number {
    return this.has(back) ? this.rx_[idx * RING + this.slot(back)] : NaN;
  }
  ry(idx: number, back: number): number {
    return this.has(back) ? this.ry_[idx * RING + this.slot(back)] : NaN;
  }
  free(idx: number, back: number): boolean {
    return this.has(back) && this.ok[idx * RING + this.slot(back)] === 1;
  }
}

interface Open {
  det: Detector;
  t0: number;
  last: number;
  /** The worst tick (highest sev), or the lowest for an `episodeMin` detector. */
  peak: Hit;
  peakT: number;
}

export class Tracker {
  readonly counts: Record<string, number> = {};
  readonly events: PlayWeird['events'] = [];
  readonly history = new Ring();
  private open = new Map<string, Open>();

  constructor(private readonly detectors: Detector[], private readonly slots: string[]) {
    for (const d of detectors) {
      this.counts[`${d.id}.events`] = 0;
      this.counts[`${d.id}.frames`] = 0;
      if (d.episodeMin) this.counts[`${d.id}.episodes`] = 0;
    }
  }

  count(name: string, by = 1): void {
    this.counts[name] = (this.counts[name] ?? 0) + by;
  }

  feed(f: WFrame): void {
    this.history.push(f);
    const seen = new Set<string>();
    for (const det of this.detectors) {
      const hits = det.hit(f, this.history);
      for (const h of hits) {
        this.counts[`${det.id}.frames`]++;
        const key = `${det.id}|${h.key}`;
        seen.add(key);
        const cur = this.open.get(key);
        if (cur && f.t - cur.last <= BRIDGE) {
          cur.last = f.t;
          cur.t0 = Math.min(cur.t0, h.at ?? f.t);
          if (det.episodeMin ? h.sev < cur.peak.sev : h.sev > cur.peak.sev) {
            cur.peak = h;
            cur.peakT = f.t;
          }
        } else {
          if (cur) this.finish(cur);
          this.open.set(key, { det, t0: h.at ?? f.t, last: f.t, peak: h, peakT: f.t });
        }
      }
    }
    for (const [key, o] of this.open) {
      if (!seen.has(key) && f.t - o.last > BRIDGE) {
        this.finish(o);
        this.open.delete(key);
      }
    }
  }

  /** Close everything still open (end of the play). */
  close(): void {
    for (const o of this.open.values()) this.finish(o);
    this.open.clear();
  }

  private finish(o: Open): void {
    const dur = Math.round((o.last - o.t0 + TICK) * 100) / 100;
    const d = o.det;
    if (dur < d.minHold - 1e-9) return;
    if (d.episodeMin) {
      this.counts[`${d.id}.episodes`]++;
      if (d.accept && !d.accept(o.peak)) return;
    }
    this.counts[`${d.id}.events`]++;
    const e: PlayWeird['events'][number] = {
      detector: d.id as DetectorId,
      t0: Math.round(o.t0 * 100) / 100,
      t1: Math.round(o.last * 100) / 100,
      representativeT: Math.round(o.peakT * 100) / 100,
      players: o.peak.players.map((i) => this.slots[i] ?? String(i)),
      text: d.describe(o.peak, dur, this.slots),
      severity: Math.round((d.score ? d.score(o.peak, dur) : dur) * 1000) / 1000,
    };
    if (d.candidate) e.candidate = true;
    if (o.peak.intent) e.intent = o.peak.intent;
    if (o.peak.achieved) e.achieved = o.peak.achieved;
    this.events.push(e);
  }
}
