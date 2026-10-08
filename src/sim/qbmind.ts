/**
 * The quarterback's mind: what he believes the defense is doing, what he can
 * actually see, and the pre-snap checks he makes from it.
 *
 * Coverage belief. Before the snap the QB reads the picture: how many
 * safeties are deep and how wide, whether the middle of the field is open or
 * closed, corner depth, press, box count. He compares it with how each
 * coverage in his head normally looks against this formation (the canonical
 * alignment for that coverage) and forms a probability belief, not a
 * certainty. His perception of depths and widths is noisy in proportion to
 * his recognition (play recognition plus years in the league), so a
 * disguised shell, or a sloppy read of a clean one, leaves him believing the
 * wrong thing.
 *
 * Post-snap confirmation. After a processing delay he re-reads the
 * rotation: who is heading deep, is the middle closed, are defenders running
 * with receivers (man) or opening to the QB (zone). The evidence updates the
 * belief; low-recognition QBs weight it less and stay anchored to their
 * pre-snap guess.
 *
 * Limited vision. The QB only sees defenders near where he's looking (a
 * clear cone plus a delayed periphery, both wider with awareness). Everyone
 * else is a memory dead-reckoned from his last look and drifting toward where
 * his coverage belief says they should be. A robber he never looked at, or a
 * rotated safety he thinks is still deep, is where his belief puts him, not
 * where he is. That's where most bad decisions come from.
 *
 * Pre-snap checks. QBs with authority count the box against their blockers:
 * flip a run to the light side, check out of a run into a quick pass against
 * a loaded box, or check to a run against a light two-high box. Box counts
 * are as noisy as the rest of his picture.
 */
import { angleDiff, clamp, logistic, type Vec2 } from '../core/vec.js';
import { alignDefense, zoneLandmark, type DefenseAlignment } from '../playbook/alignment.js';
import { PASS_BY_ID, RUN_BY_ID } from '../playbook/concepts.js';
import { COVERAGES, PRESSURE_BY_ID } from '../playbook/defense.js';
import type { Coverage, DefSlot, DefensivePlayCall, OffensivePlayCall, PassConcept } from '../playbook/types.js';
import { r01 } from '../players/types.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

/** Rough league frequencies — the prior a QB brings from film study. */
const PRIOR: Record<string, number> = {
  cover3: 0.28, cover1: 0.18, cover4: 0.15, cover2: 0.1, cover6: 0.08, tampa2: 0.06, cover2man: 0.06, cover0: 0.04,
};

/**
 * What an offense learns about a defense during the game from the sideline
 * pictures and film: how often it plays each coverage and how often the
 * shell it shows isn't the one it plays. Shrunk toward league habits, so a
 * few snaps don't give a defense away.
 */
export class CoverageScouting {
  private readonly counts: Record<string, number> = {};
  private n = 0;
  private disguised = 0;
  constructor(private readonly strength = 12) {}

  observe(call: DefensivePlayCall): void {
    this.counts[call.coverage.id] = (this.counts[call.coverage.id] ?? 0) + 1;
    this.n++;
    if (call.shown && call.shown.id !== call.coverage.id) this.disguised++;
  }

  /** Expected coverage frequencies for this defense. */
  frequencies(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const c of COVERAGES) out[c.id] = ((this.counts[c.id] ?? 0) + this.strength * (PRIOR[c.id] ?? 0.05)) / (this.n + this.strength);
    return out;
  }

  /** How often this defense disguises its shell. */
  disguiseRate(): number {
    return (this.disguised + this.strength * DISGUISE_RATE) / (this.n + this.strength);
  }

  snaps(): number {
    return this.n;
  }
}

/**
 * How each coverage looks after the snap, measured from the simulation (see
 * scripts/diag/post-sig.ts): [defenders heading deep, middle of the field
 * closed, coverage players turned and running] at 0.5, 0.8 and 1.2 s.
 */
const POST_SIG: Record<string, [number[], number[], number[]]> = {
  cover0: [[0.1, 0.02, 0], [0.05, 0.01, 0.05], [0.2, 0.05, 0.6]],
  cover1: [[1.1, 1, 0], [1.6, 1, 0.05], [1.9, 0.8, 0.53]],
  cover2: [[2.2, 0.08, 0], [2.95, 0.52, 0], [2.9, 0.37, 0]],
  tampa2: [[2.2, 0.09, 0], [3.0, 0.59, 0], [3.4, 0.89, 0.1]],
  cover2man: [[2.0, 0.07, 0], [2.0, 0.04, 0.05], [2.2, 0.11, 0.53]],
  cover3: [[2.25, 1, 0], [3.6, 1, 0], [3.45, 0.79, 0.08]],
  cover4: [[2.4, 0.24, 0], [4.0, 0.56, 0], [4.3, 0.62, 0.11]],
  cover6: [[2.3, 0.24, 0], [3.5, 0.56, 0], [3.8, 0.39, 0.03]],
};
const SIG_T = [0.5, 0.8, 1.2];

/** How often a QB expects the shown shell to be a disguise. */
const DISGUISE_RATE = 0.22;

export interface QBReadReport {
  /** Coverage the QB believed pre-snap. */
  pre: string;
  /** Coverage he settled on after the post-snap read (if he got there). */
  post?: string;
  actual: string;
  shown?: string;
  /** Pre-snap check, e.g. "flip run", "check to Slant-Flat". */
  audible?: string;
}

interface Memory {
  pos: Vec2;
  vel: Vec2;
  t: number;
}

type Features = number[];

const PRE_SIGMA = [0.3, 0.25, 0.3, 0.13, 0.35, 0.7];
const POST_SIG_SIGMA = [0.6, 0.3, 0.18];

export class QBMind {
  /** Coverage recognition 0–1 (play recognition + experience). */
  readonly rec: number;
  /** Field vision 0–1 (awareness). */
  readonly vision: number;
  belief: Record<string, number> = {};
  readonly report: QBReadReport;
  blitzExpected = false;
  identified = false;
  private confirmed = false;
  /** Set for one tick when the post-snap read completes. */
  justIdentified = false;
  readonly identifyAt: number;
  private readonly canon = new Map<string, DefenseAlignment>();
  private readonly memory = new Map<Agent, Memory>();
  private readonly clearHalf: number;
  /** Coverage frequencies he expects from this defense, and its disguise rate. */
  private readonly prior: Record<string, number> = {};
  private readonly disguiseRate: number;
  private readonly periphHalf: number;

  constructor(
    private readonly sim: PlaySim,
    private readonly qb: Agent,
  ) {
    const p = qb.player;
    this.rec = clamp(0.7 * r01(p.ratings.playRecognition) + 0.3 * Math.min(1, p.experience / 8), 0, 1);
    this.vision = r01(p.ratings.awareness);
    this.clearHalf = 0.33 + 0.22 * this.vision;
    this.periphHalf = this.clearHalf + 0.45 + 0.2 * this.vision;
    this.identifyAt = 0.45 + 0.4 * (1 - this.rec) + Math.abs(sim.rng.normal(0, 0.08));
    // What he expects from this defense: league habits, adjusted by what
    // he's seen of them today (the sharper QB uses more of it).
    const scout = sim.coverageScouting;
    const learned = scout?.frequencies();
    for (const c of COVERAGES) {
      const base = PRIOR[c.id] ?? 0.05;
      this.prior[c.id] = learned ? base + (learned[c.id] - base) * (0.3 + 0.7 * this.rec) : base;
    }
    this.disguiseRate = scout ? DISGUISE_RATE + (scout.disguiseRate() - DISGUISE_RATE) * (0.3 + 0.7 * this.rec) : DISGUISE_RATE;

    // Canonical looks: how each coverage would align against this formation.
    const slots = sim.defense.map((d) => d.slot as DefSlot);
    for (const c of COVERAGES) {
      const pressure = c.id === 'cover0' ? PRESSURE_BY_ID.zero_6 : null;
      const ok = !pressure || Object.keys(pressure.blitzers).every((s) => slots.includes(s as DefSlot));
      this.canon.set(c.id, alignDefense({ ...sim.defCall, coverage: c, pressure: ok ? pressure : null, shown: undefined }, sim.offAlign, slots));
    }
    // Everyone is visible before the snap.
    for (const d of sim.defense) this.memory.set(d, { pos: { ...d.pos }, vel: { x: 0, y: 0 }, t: 0 });
    this.preSnapRead();
    this.report = {
      pre: this.top(),
      actual: sim.defCall.coverage.id,
      shown: sim.defCall.shown?.id,
    };
  }

  // ------------------------------------------------------------ belief

  top(): string {
    let best = 'cover3';
    let bp = -1;
    for (const [k, v] of Object.entries(this.belief)) if (v > bp) {
      bp = v;
      best = k;
    }
    return best;
  }

  /** Belief mass on man coverages. */
  pMan(): number {
    let s = 0;
    for (const c of COVERAGES) if (c.man) s += this.belief[c.id] ?? 0;
    return s;
  }

  /** Belief mass on a single-high (middle closed) look. */
  pSingleHigh(): number {
    let s = 0;
    for (const c of COVERAGES) if (c.shell === 'one-high') s += this.belief[c.id] ?? 0;
    return s;
  }

  private noiseScale(): number {
    return 0.6 + 1.4 * (1 - this.rec);
  }

  private preSnapRead(): void {
    const sim = this.sim;
    const sigPos = 0.3 + 1.0 * (1 - this.rec);
    const seen = new Map<DefSlot, Vec2>();
    for (const d of sim.defense) {
      seen.set(d.slot as DefSlot, { x: d.pos.x + sim.rng.normal(0, sigPos), y: d.pos.y + sim.rng.normal(0, sigPos * 0.7) });
    }
    const obs = this.preFeatures(seen);
    const ns = this.noiseScale();
    const logp: Record<string, number> = {};
    for (const c of COVERAGES) {
      const ca = this.canon.get(c.id)!;
      const pos = new Map<DefSlot, Vec2>();
      for (const [slot, sp] of Object.entries(ca.spots) as Array<[DefSlot, NonNullable<DefenseAlignment['spots'][DefSlot]>]>) pos.set(slot, sp.pos);
      const f = this.preFeatures(pos);
      let ll = 0;
      for (let k = 0; k < f.length; k++) ll -= ((obs[k] - f[k]) / (PRE_SIGMA[k] * ns)) ** 2 / 2;
      logp[c.id] = Math.log(this.prior[c.id] ?? 0.05) + ll;
    }
    // That's a belief about what's *shown*. Smart QBs know a shown shell is
    // sometimes a disguise: spread some belief to the other shell's coverages.
    const shown = normalize(logp);
    const aware = this.disguiseRate * (0.4 + 0.6 * this.rec);
    const belief: Record<string, number> = {};
    for (const c of COVERAGES) belief[c.id] = 0;
    for (const sc of COVERAGES) {
      const ps = shown[sc.id];
      const others = COVERAGES.filter((c) => c.shell !== sc.shell || (sc.id === 'cover0') !== (c.id === 'cover0'));
      const z = others.reduce((t, c) => t + (this.prior[c.id] ?? 0.05), 0);
      belief[sc.id] += ps * (1 - aware);
      for (const c of others) belief[c.id] += (ps * aware * (this.prior[c.id] ?? 0.05)) / z;
    }
    this.belief = belief;

    // Pressure look: more potential rushers in the box than he has blockers.
    const blockers = 5 + sim.offense.filter((o) => sim.offAlign.spots[o.slot]?.inline).length;
    const box = Math.round(obs[5]);
    this.blitzExpected = (this.belief.cover0 ?? 0) > 0.3 || (box >= blockers + 2 && this.pMan() > 0.5);
  }

  /**
   * Pre-snap picture: [deep count, middle-of-field closed, deep pair width,
   * corner depth, press count, box count].
   */
  private preFeatures(pos: Map<DefSlot, Vec2>): Features {
    const sim = this.sim;
    const los = sim.los;
    const by = sim.ballY;
    let deep = 0;
    let mof = 0;
    let box = 0;
    const depths: Array<{ d: number; y: number }> = [];
    for (const [, p] of pos) {
      const depth = p.x - los;
      const dk = logistic((depth - 9.5) / 0.9);
      deep += dk;
      mof = Math.max(mof, dk * Math.exp(-(((p.y - by) / 6) ** 2)));
      box += logistic((7.5 - depth) / 0.6) * logistic((6 - Math.abs(p.y - by)) / 0.6);
      depths.push({ d: depth, y: p.y });
    }
    depths.sort((a, b) => b.d - a.d);
    const width = depths.length >= 2 ? Math.abs(depths[0].y - depths[1].y) / 10 : 0;
    const cbs = ['CB_S', 'CB_W'].map((s) => pos.get(s as DefSlot)).filter((p): p is Vec2 => !!p);
    const cbDepth = cbs.length ? cbs.reduce((s, p) => s + (p.x - los), 0) / cbs.length / 7 : 0.8;
    let press = 0;
    for (const o of sim.offense) {
      const sp = sim.offAlign.spots[o.slot];
      if (!sp || sp.backfield || sp.inline || o === sim.qb) continue;
      if (o.slot === 'LT' || o.slot === 'LG' || o.slot === 'C' || o.slot === 'RG' || o.slot === 'RT') continue;
      for (const [, p] of pos) {
        if (p.x - los < 2.5 && Math.abs(p.y - sp.pos.y) < 1.8) {
          press++;
          break;
        }
      }
    }
    return [deep, mof, width, cbDepth, press / 2, box];
  }

  /**
   * Post-snap picture: [defenders heading deep, middle closed, fraction of
   * coverage players running with receivers].
   */
  postFeaturesObserved(): Features {
    const sim = this.sim;
    const qb = this.qb;
    const los = sim.los;
    const by = sim.ballY;
    let deep = 0;
    let mof = 0;
    let turned = 0;
    let cov = 0;
    for (const d of sim.defense) {
      const s = sim.see(qb, d, 1.2);
      const depth = s.pos.x - los;
      const proj = depth + Math.max(-1, s.vel.x) * 0.8;
      const projY = s.pos.y + s.vel.y * 0.8;
      const dk = logistic((proj - 9.5) / 1.0);
      deep += dk;
      mof = Math.max(mof, dk * Math.exp(-(((projY - by) / 6) ** 2)));
      // Rushers (coming at the QB) aren't part of the coverage picture.
      if (depth < 2 && s.vel.x < 0) continue;
      cov++;
      // Eyes and hips: man defenders turn and run with their receiver; zone
      // defenders keep their eyes on the quarterback.
      const sp = Math.hypot(s.vel.x, s.vel.y);
      const toQB = Math.atan2(qb.pos.y - d.pos.y, qb.pos.x - d.pos.x);
      if (sp > 2 && Math.cos(d.body.facing - toQB) < -0.2) turned++;
    }
    return [deep, mof, cov ? turned / cov : 0];
  }

  private postFeaturesCanon(c: Coverage, t: number): Features {
    const sig = POST_SIG[c.id];
    if (!sig) return [2.5, 0.5, 0.1];
    if (t <= SIG_T[0]) return sig[0];
    if (t >= SIG_T[2]) return sig[2];
    const k = t < SIG_T[1] ? 0 : 1;
    const f = (t - SIG_T[k]) / (SIG_T[k + 1] - SIG_T[k]);
    return sig[k].map((v, j) => v + (sig[k + 1][j] - v) * f);
  }

  private postSnapRead(weight: number): void {
    const obs = this.postFeaturesObserved();
    const ns = this.noiseScale();
    // Low-recognition QBs trust what they see after the snap less.
    const w = weight * (0.35 + 0.65 * this.rec);
    const logp: Record<string, number> = {};
    for (const c of COVERAGES) {
      const f = this.postFeaturesCanon(c, this.sim.t);
      let ll = 0;
      for (let k = 0; k < f.length; k++) ll -= ((obs[k] - f[k]) / (POST_SIG_SIGMA[k] * ns)) ** 2 / 2;
      logp[c.id] = Math.log(Math.max(1e-6, this.belief[c.id] ?? 0)) + w * ll;
    }
    this.belief = normalize(logp);
    this.report.post = this.top();
  }

  // ------------------------------------------------------------ vision

  /** Call every tick with where the QB is looking. */
  observe(gaze: Vec2): void {
    const sim = this.sim;
    const qb = this.qb;
    this.justIdentified = false;
    // First look: the middle of the field during the drop. Second look, half a
    // second later: the rotation has finished and the DBs' hips show man or zone.
    if (!this.identified && sim.t >= this.identifyAt) {
      this.identified = true;
      this.justIdentified = true;
      this.postSnapRead(0.6);
    } else if (this.identified && !this.confirmed && sim.t >= this.identifyAt + 0.5) {
      this.confirmed = true;
      this.justIdentified = true;
      this.postSnapRead(1);
    }
    const dir = Math.atan2(gaze.y - qb.pos.y, gaze.x - qb.pos.x);
    for (const d of sim.defense) {
      const dx = d.pos.x - qb.pos.x;
      const dy = d.pos.y - qb.pos.y;
      const dist = Math.hypot(dx, dy);
      const ang = Math.abs(angleDiff(Math.atan2(dy, dx), dir));
      // Bodies right around him are felt, not seen; pocket presence handles them.
      if (ang < this.clearHalf || dist < 3) {
        const s = sim.see(qb, d);
        this.memory.set(d, { pos: s.pos, vel: s.vel, t: sim.t });
      } else if (ang < this.periphHalf) {
        const s = sim.see(qb, d, 1.7);
        this.memory.set(d, { pos: s.pos, vel: s.vel, t: sim.t - 0.1 });
      }
    }
  }

  /** Where the QB thinks a defender is (and how he's moving). */
  estimate(d: Agent): { pos: Vec2; vel: Vec2 } {
    const sim = this.sim;
    const m = this.memory.get(d);
    if (!m) return sim.see(this.qb, d);
    const age = sim.t - m.t;
    if (age < 0.12) return { pos: m.pos, vel: m.vel };
    const k = Math.min(age, 0.5);
    const dr = { x: m.pos.x + m.vel.x * k, y: m.pos.y + m.vel.y * k };
    const exp = this.expectedPos(d);
    const w = clamp((age - 0.2) / 1.0, 0, 1);
    return {
      pos: { x: dr.x + (exp.x - dr.x) * w, y: dr.y + (exp.y - dr.y) * w },
      vel: { x: m.vel.x * (1 - w), y: m.vel.y * (1 - w) },
    };
  }

  /** Belief-weighted position this defender "should" be at right now. */
  private expectedPos(d: Agent): Vec2 {
    const sim = this.sim;
    let x = 0;
    let y = 0;
    let wsum = 0;
    for (const c of COVERAGES) {
      const b = this.belief[c.id] ?? 0;
      if (b < 0.03) continue;
      const sp = this.canon.get(c.id)!.spots[d.slot as DefSlot];
      if (!sp) continue;
      let p: Vec2;
      const r = sp.role;
      if (r.kind === 'zone') {
        const lm = zoneLandmark(r.zone, sim.offAlign);
        // Partway there early in the play.
        const f = clamp(sim.t / 1.6, 0, 1);
        p = { x: sp.pos.x + (lm.x - sp.pos.x) * f, y: sp.pos.y + (lm.y - sp.pos.y) * f };
      } else if (r.kind === 'man' && sp.manTarget) {
        const t = sim.slot(sp.manTarget);
        p = t ? { x: t.pos.x + 1, y: t.pos.y + (Math.sign(sim.ballY - t.pos.y) || 1) * 0.6 } : sp.pos;
      } else {
        p = { x: sim.qb.pos.x + 3, y: sp.pos.y };
      }
      x += b * p.x;
      y += b * p.y;
      wsum += b;
    }
    if (wsum < 1e-6) return d.pos;
    return { x: x / wsum, y: y / wsum };
  }

  // ------------------------------------------------------------ pre-snap checks

  /**
   * Count the box and maybe change the play. Returns the (possibly new)
   * call; the change is recorded in the report.
   */
  preSnapCheck(call: OffensivePlayCall, opts: { hurry: boolean; down: number; distance: number }): OffensivePlayCall {
    const sim = this.sim;
    const p = this.qb.player;
    // How much freedom the staff gives him: veterans with good awareness get the keys.
    const authority = clamp(0.1 + 0.5 * this.vision + 0.035 * p.experience, 0, 0.85);
    if (opts.hurry || !sim.rng.chance(authority)) return call;

    const los = sim.los;
    const by = sim.ballY;
    const sigPos = 0.3 + 1.0 * (1 - this.rec);
    let boxL = 0;
    let boxR = 0;
    for (const d of sim.defense) {
      const x = d.pos.x + sim.rng.normal(0, sigPos) - los;
      const y = d.pos.y + sim.rng.normal(0, sigPos * 0.7);
      if (x < 7.5 && Math.abs(y - by) < 6.5) {
        if (y >= by) boxL++;
        else boxR++;
      }
    }
    const box = boxL + boxR;
    const blockersOn = (sign: number) =>
      sim.offense.filter((o) => {
        const sp = sim.offAlign.spots[o.slot];
        if (!sp || o === sim.qb) return false;
        if (['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot)) return Math.sign(sp.pos.y - by) === sign || o.slot === 'C';
        return (sp.inline || o.slot === 'FB') && Math.sign(sp.pos.y - by) === sign;
      }).length;
    const blkL = blockersOn(1) - 0.5; // the center counts half to each side
    const blkR = blockersOn(-1) - 0.5;
    const blockers = blkL + blkR;

    if (call.kind === 'run' && call.run) {
      const run = call.run;
      const strongSign = sim.offAlign.strongSign;
      const playSign = run.direction === 'strong' ? strongSign : -strongSign;
      const edge = (sign: number) => (sign > 0 ? boxL - blkL : boxR - blkR);
      // Loaded box: get out of the run.
      if (box - blockers >= 2.5 && this.pSingleHigh() > 0.5) {
        const quick = this.quickCheck();
        if (quick) {
          this.report.audible = `check to ${quick.name}`;
          return { ...call, kind: 'pass', pass: quick, run: undefined, label: `${call.formation.name} — ${quick.name} (audible)` };
        }
      }
      // Numbers to the other side: flip it.
      if (run.scheme !== 'draw' && edge(playSign) - edge(-playSign) >= 2) {
        const flipped = { ...run, direction: run.direction === 'strong' ? ('weak' as const) : ('strong' as const), name: `${run.name} (flipped)` };
        this.report.audible = 'flip run';
        return { ...call, run: flipped, label: `${call.label} (flipped)` };
      }
      return call;
    }

    if (call.kind === 'pass' && call.pass && call.pass.family !== 'playaction') {
      // Light box against two-high on a running down: run it.
      const runDown = opts.down <= 2 && opts.distance <= 7;
      if (runDown && box <= blockers - 1 && this.pSingleHigh() < 0.35 && sim.slot('RB') && sim.rng.chance(0.5)) {
        const run = RUN_BY_ID[boxL <= boxR ? (sim.offAlign.strongSign > 0 ? 'iz_strong' : 'iz_weak') : sim.offAlign.strongSign > 0 ? 'iz_weak' : 'iz_strong'];
        this.report.audible = `check to ${run.name}`;
        return { ...call, kind: 'run', run, pass: undefined, label: `${call.formation.name} — ${run.name} (audible)` };
      }
    }
    return call;
  }

  /** Quick-game answer to the look: hitches vs. off corners, slants vs. press. */
  private quickCheck(): PassConcept | null {
    const sim = this.sim;
    const cbs = sim.defense.filter((d) => d.slot === 'CB_S' || d.slot === 'CB_W');
    const depth = cbs.length ? cbs.reduce((s, d) => s + d.pos.x - sim.los, 0) / cbs.length : 6;
    const id = depth > 5 ? 'hitches' : depth < 2.5 ? 'slant_flat' : 'quick_outs';
    return PASS_BY_ID[id] ?? null;
  }
}

function normalize(logp: Record<string, number>): Record<string, number> {
  const m = Math.max(...Object.values(logp));
  const out: Record<string, number> = {};
  let s = 0;
  for (const [k, v] of Object.entries(logp)) {
    out[k] = Math.exp(v - m);
    s += out[k];
  }
  for (const k of Object.keys(out)) out[k] /= s;
  return out;
}

