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
import { isDbBody, isDbSlot, personnelSeen, QB_LOOK_SEEN } from './qbv2/roles.js'; // QB_CANON_SEEN / QB_LOOK_SEEN: one defensive-back rule with QB_V2
import { angleDiff, clamp, logistic, type Vec2 } from '../core/vec.js';
import type { ReceiverPicture } from './receiver-forecast.js';
import { UNDERNEATH_MOVE, type RouteKeyPicture } from './route-read.js';
import { alignDefense, zoneLandmark, type DefenseAlignment } from '../playbook/alignment.js';
import { PASS_BY_ID, RUN_BY_ID } from '../playbook/concepts.js';
import { FRONTS, PRESSURE_BY_ID } from '../playbook/defense.js';
import { COVERAGE_BY_ID, FAMILY_REPRESENTATIVE, familyOf } from '../playbook/coverages.js';
import { DEF_PERSONNEL, type Coverage, type DefPersonnelId, type DefSlot, type DefensivePlayCall, type OffensivePlayCall, type PassConcept } from '../playbook/types.js';
import { r01 } from '../players/types.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { screenSpot } from './screen-spot.js';
import { isOL } from './behaviors/blocking.js';

/** SCREEN_QB (experimental, off; behaviors/qb.ts): the bubble's numbers kill. */
const SCREEN_QB = process.env.SCREEN_QB === '1';
/** QB_SEEN_MAN (experimental, off; QB_SEEN_MAN=1; information rule): three places where his picture of the defense
 * read the field as it truly is.
 * - A man defender he is not looking at is remembered on his receiver. Off, "his receiver" is the receiver's TRUE
 *   position now; on, it is where the quarterback's own forecast has that receiver (the installed route run from his
 *   last picture of him), or the defender's own canonical spot when he has no forecast of that man.
 * - With no belief to place a defender, off falls back to the defender's true position; on, to his last picture.
 * - The check at the line reads corner depth exactly; on, with his alignment noise like the rest of his pre-snap
 *   picture.
 * The canonical looks themselves (how each coverage would line up against this formation) are built from the call's
 * front, personnel and alignment tags, all of which are what the alignment in front of him shows; only the coverage
 * and pressure are swapped, and a disguised shell still fools him. Not changed. */
const QB_SEEN_MAN = process.env.QB_SEEN_MAN !== '0';
/** QB_SCAN (on, a leak removal; QB_SCAN=0 restores; QB decision plan §1.6, 2026-11-24): what his pre-snap scan can
 * honestly see. Before the snap he has time to survey the whole field, so every defender is in his picture (a full scan is
 * fair); exactness is not. Each defender is placed with one error of his own, drawn once per play at the recognition-scaled
 * size the reads already used (0.3 + 1.0 x (1 - recognition) yd deep, 0.7 of that across), and that one picture feeds
 * everything he reads before the snap: his memory at the snap, the coverage features, the box count for his checks, the
 * screen look and the quick check. Off: the memory was seeded with each defender's exact position, and each of the four
 * reads drew fresh noise around the true positions, so he held four different pictures and an exact one. */
const QB_SCAN = process.env.QB_SCAN !== '0';
/** SCOUT_SEEN (leak removal, on; `=0` restores): the offense's in-game coverage scouting learns from its passer's belief
 * (CoverageScouting.observeSeen), not the defense's call. */
export const SCOUT_SEEN = process.env.SCOUT_SEEN !== '0';
/** QB_CANON_SEEN (on, a leak removal; QB_CANON_SEEN=0 restores; QB decision plan §1.6): the looks he compares against are
 * built only from what he can see. The defense's personnel (who is on the field) and its front's alignment (the front, the
 * end men's edge, its strength, a mug or a Sam walked onto the line) are visible; the slot labels of the actual call and
 * its other parts are not. The canonical looks use the personnel's slots and those visible fields only, and the corners in
 * his features and his quick check are found where he sees them (on each side the widest defensive back, by the
 * personnel group he sees, within 12 yd of the line and 4+ yd off the ball), not by their slot labels. Off: the corners were the defenders labelled CB_S / CB_W. */
const QB_CANON_SEEN = process.env.QB_CANON_SEEN !== '0';
/** CLOUD_KILL (experimental, off; screens, 2026-11-14): "never throw a now screen against press or cloud". The now
 * screen's installed kill (and the screen RPO's read) also takes a defender he sees squatting over the screen receiver,
 * whoever he is (a corner, a safety rolled down, an apex walked out; QB lane review, 2026-11-14):
 * 2.2-5 yd off the line, from 0.5 yd inside him to 3 yd outside (outside leverage), with the same alignment noise as the
 * press look, at the alignment after motion. Off, only press killed it; on the now screen against Cover 2 the squat
 * corner made every tackle (screen-defense.mts). */
const CLOUD_KILL = process.env.CLOUD_KILL !== '0';

/**
 * The coverages a quarterback distinguishes: one canonical picture per family
 * (Cover 3, quarters, ...). He doesn't identify Rip/Liz from Sky before the
 * ball is out; he identifies the structure, and the variant shows up in how
 * defenders move.
 */
const COVERAGES: Coverage[] = Object.values(FAMILY_REPRESENTATIVE).map((id) => COVERAGE_BY_ID[id]);
const repOf = (c: Coverage): string => FAMILY_REPRESENTATIVE[familyOf(c)] ?? c.id;

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

  /**
   * SCOUT_SEEN (leak removal, on; Flex, 2026-11-24; an outside review's leak, confirmed by Integration): what the offense
   * learns of a defense's coverage on a pass play is what its passer came to believe, not the call. His belief at the end of
   * the play is counted, weighted by how settled it was (his top coverage's share): a passer sacked at 1.8 s on a muddled
   * picture teaches the offense little. A disguise is counted when the shell he read before the snap is not the shell he
   * believed after it. The booth (coaches upstairs naming the coverage between plays) is a second, real channel, left for
   * the information-flow work; it is not assumed here.
   */
  observeSeen(belief: Record<string, number>, preTop: string): void {
    let top = '', best = -1;
    for (const [id, p] of Object.entries(belief)) if (p > best) { best = p; top = id; }
    if (best <= 0) return;
    for (const [id, p] of Object.entries(belief)) {
      const rep = repOf(COVERAGE_BY_ID[id] ?? COVERAGES[0]);
      this.counts[rep] = (this.counts[rep] ?? 0) + best * p;
    }
    this.n += best;
    const shell = (id: string) => COVERAGE_BY_ID[id]?.shell;
    if (shell(preTop) && shell(top) && shell(preTop) !== shell(top)) this.disguised += best;
  }

  observe(call: DefensivePlayCall): void {
    const rep = repOf(call.coverage);
    this.counts[rep] = (this.counts[rep] ?? 0) + 1;
    this.n++;
    if (call.shown && call.shown.shell !== (call.coverage.look ?? call.coverage.shell)) this.disguised++;
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
  facing: number;
  /** UNDERNEATH_MOVE: his seen head (rad), null where not shown. */
  head?: number | null;
  t: number;
  latency?: number;
  /** PERIPH_ACUITY: the look's position and velocity uncertainty (yd, yd/s), from its eccentricity. */
  sigP?: number;
  sigV?: number;
}

/** PERIPH_ACUITY (on: promoted 2026-11-23, engine-92; PERIPH_ACUITY=0 restores; QB lane, 2026-11-23, an information leak under the
 * user's standing rule: docs/reviews/2026-11-23-turned-down-open.md). A player seen off the passer's gaze is seen less
 * precisely: motion is detected, position and velocity precision are lost with eccentricity. Off, a receiver or defender
 * inside the peripheral cone (45-69 deg) was seen exactly, apart from 1.7 times the delay: a target 30-60 deg off his
 * head at the decision was priced from a picture 0.13 yd off (0.04 dead centre), and on 62-72% of decisions made 15 deg
 * or more off, the target had never been near his gaze. On:
 * - position: an angular error of PERIPH_POS_K x eccentricity, at the player's range (peripheral localization error
 *   grows about linearly with eccentricity, roughly 5-10% of it: Levi, Klein & Aitsebaomo 1985);
 * - velocity: speed discrimination's Weber fraction rising about 0.1 per 40 deg off the fovea (McKee & Nakayama 1984), as
 *   a velocity error of PERIPH_VEL_K x speed x eccentricity (rad);
 * - both scaled by his vision rating (1.3 - 0.6 x vision), each player's error a stable draw of his (a coherent misjudgment
 *   of where that man is, not jitter);
 * - the clear cone for reading separation narrowed to the useful field for detail, 10-15 deg half-angle by vision (Ball
 *   et al. 1988, useful field of view); the peripheral cone, where motion is still picked up, keeps its extent.
 * His own confidence in a picture carries the look's error and its growth with age (the window, qb.ts). Nothing forbids
 * a throw off a peripheral picture: he prices it with its error. */
export const PERIPH_ACUITY = process.env.PERIPH_ACUITY !== '0';
/** QB_TRACK_LOOK (on; `=0` restores; Flex, 2026-11-25, Integration's ruling on the QB lane's proj-err): the perception
 * channels' QB step (playsim.ts PERCEIVE_TRACK: an attended, continuous read is a correcting loop at TRACK_LATENCY with no
 * acceleration term; Brenner and Smeets 1997, Brouwer et al. 2002). A defender or receiver in his clear cone is a man he is
 * watching: his picture comes through the tracking channel, not the choice-reaction picture. Peripheral and unseen men stay
 * on `see()` (the delay, and 1.7 times it off his gaze). Before, his watched defenders' velocity was the truth one
 * choice-reaction delay ago (lag = delay x acceleration, about 1.25 yd/s at 5 yd/s2); now about 0.12 s x acceleration. */
export const QB_TRACK_LOOK = process.env.QB_TRACK_LOOK !== '0';
const PERIPH_POS_K = 0.06;
const PERIPH_VEL_K = 0.14;

type Features = number[];

const PRE_SIGMA = [0.3, 0.25, 0.3, 0.13, 0.35, 0.7];
const POST_SIG_SIGMA = [0.6, 0.3, 0.18];

/** His estimate of an unseen defender (QBMind.estimate): dead reckoning from the sighting up to this horizon (s), and a
 * blend toward his belief of the man's job (the expected spot) from EST_BLEND_START over EST_BLEND_SPAN (s). */
export const EST_DR_HORIZON = 0.5, EST_BLEND_START = 0.2, EST_BLEND_SPAN = 1.0;

export class QBMind {
  /** Coverage recognition 0–1 (play recognition + experience). */
  readonly rec: number;
  /** Field vision 0–1 (awareness). */
  readonly vision: number;
  belief: Record<string, number> = {};
  readonly report: QBReadReport;
  blitzExpected = false;
  /** Diagnostic: the inputs of blitzExpected at his last pre-snap update. */
  blitzInputs: { box: number; boxSoft: number; blockers: number; cover0: number; pMan: number } | null = null;
  identified = false;
  private confirmed = false;
  /** Set for one tick when the post-snap read completes. */
  justIdentified = false;
  readonly identifyAt: number;
  private readonly canon = new Map<string, DefenseAlignment>();
  private readonly memory = new Map<Agent, Memory>();
  /** QB_SCAN: each defender's error in his pre-snap picture (drawn once per play). */
  private readonly scanErr = new Map<Agent, Vec2>();
  /** QB_SEEN_MAN: where the quarterback's own forecast has a receiver now (set by QBPass); null when he has none. */
  receiverAt: ((r: Agent) => Vec2 | null) | null = null;
  /** Pictures already represented in the prior or a post-snap likelihood. */
  private readonly classifiedAt = new Map<Agent, number>();
  readonly clearHalf: number;
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
    const legacyClear = 0.33 + 0.22 * this.vision;
    this.clearHalf = PERIPH_ACUITY ? 0.17 + 0.09 * this.vision : legacyClear;
    this.periphHalf = legacyClear + 0.45 + 0.2 * this.vision;
    this.identifyAt = 0.45 + 0.4 * (1 - this.rec) + Math.abs(sim.dice('qb-mind').normal(0, 0.08));
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
    const dc = sim.defCall;
    if (QB_LOOK_SEEN) this.seenLooks(); else {
    // QB_CANON_SEEN: the personnel he sees (its slots) and the front's visible alignment, not the call itself.
    const slots = QB_CANON_SEEN ? Object.keys(DEF_PERSONNEL[dc.personnel] ?? {}) as DefSlot[] : sim.defense.map((d) => d.slot as DefSlot);
    const visible: DefensivePlayCall = QB_CANON_SEEN
      ? { label: '', personnel: dc.personnel, front: dc.front, coverage: dc.coverage, pressure: null, edge: dc.edge, strength: dc.strength, mug: dc.mug, samOn: dc.samOn }
      : dc;
    for (const c of COVERAGES) {
      const pressure = c.id === 'cover0' ? PRESSURE_BY_ID.zero_6 : null;
      const ok = !pressure || Object.keys(pressure.blitzers).every((s) => slots.includes(s as DefSlot));
      this.canon.set(c.id, alignDefense({ ...visible, coverage: c, pressure: ok ? pressure : null, shown: undefined }, sim.offAlign, slots));
    }
    }
    // Everyone is visible before the snap. QB_SCAN: where his scan put each of them; off, exactly where they stood.
    for (const d of sim.defense) this.memory.set(d, { pos: QB_SCAN ? this.scanned(d) : { ...this.standing(d) }, vel: { x: 0, y: 0 }, facing: d.body.facing, t: 0 });
    this.preSnapRead();
    for (const [d, m] of this.memory) this.classifiedAt.set(d, m.t);
    this.report = {
      pre: this.top(),
      actual: repOf(sim.defCall.coverage),
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

  /** Where defender d stands before the snap: the one place his pre-snap reads take a defender's position from; the scan
   * (QB_SCAN) or the read's own noise applies his error to it. Pre-snap only (the field is still: a full scan sees it). */
  /** QB_LOOK_SEEN: the personnel the looks are built on (from the bodies he sees); off, the call's. */
  private canonPersonnel: DefPersonnelId | null = null;
  /** QB_LOOK_SEEN diagnostic (no behaviour reads it): the personnel and front his looks were built on. */
  lookSeen: { personnel: DefPersonnelId; front: string } | null = null;
  /** QB_LOOK_SEEN: the canonical looks from what he sees. The personnel is the package the bodies on the field make; the
   * front seven stand where his scan has them at the snap (each template front spot takes the nearest unused seen
   * front body); the coverage's own men (the defensive backs) are the template's. The front whose template fits the
   * seen front seven best supplies the front men's roles. No field of the defense's call is read. */
  private seenLooks(): void {
    const sim = this.sim;
    // His scan of every defender, in the defense's order (the same draws his memory takes below).
    const scan = new Map(sim.defense.map((d) => [d, QB_SCAN ? this.scanned(d) : { ...this.standing(d) }] as const));
    const pers = personnelSeen(sim.defense);
    this.canonPersonnel = pers;
    const slots = Object.keys(DEF_PERSONNEL[pers] ?? {}) as DefSlot[];
    const front7 = sim.defense.filter((d) => !isDbBody(d)).map((d) => scan.get(d)!);
    const frontSlots = slots.filter((sl) => !isDbSlot(pers, sl));
    /** Pairs template front spots with seen front bodies, closest pair first; returns the total distance and the pairs. */
    const pair = (al: DefenseAlignment) => {
      const t = frontSlots.flatMap((sl) => al.spots[sl] ? [{ sl, p: al.spots[sl]!.pos }] : []);
      const used = new Set<number>(), done = new Set<DefSlot>(), out = new Map<DefSlot, Vec2>();
      let cost = 0;
      for (let k = 0; k < Math.min(t.length, front7.length); k++) {
        let bi = -1, bj = -1, bd = Infinity;
        for (let i = 0; i < t.length; i++) if (!done.has(t[i].sl)) for (let j = 0; j < front7.length; j++) if (!used.has(j)) {
          const dd = Math.hypot(t[i].p.x - front7[j].x, t[i].p.y - front7[j].y);
          if (dd < bd) { bd = dd; bi = i; bj = j; }
        }
        done.add(t[bi].sl); used.add(bj); out.set(t[bi].sl, front7[bj]); cost += bd;
      }
      return { cost: cost + 3 * Math.abs(t.length - front7.length), out };
    };
    const call = (front: (typeof FRONTS)[number], c: Coverage, pressure: DefensivePlayCall['pressure']): DefensivePlayCall =>
      ({ label: '', personnel: pers, front, coverage: c, pressure });
    const fits = FRONTS.filter((f) => f.personnel.includes(pers));
    let front = fits[0] ?? FRONTS[0], best = Infinity;
    for (const f of fits) {
      const { cost } = pair(alignDefense(call(f, COVERAGE_BY_ID.cover3 ?? COVERAGES[0], null), sim.offAlign, slots));
      if (cost < best) { best = cost; front = f; }
    }
    this.lookSeen = { personnel: pers, front: front.id };
    for (const c of COVERAGES) {
      const pressure = c.id === 'cover0' ? PRESSURE_BY_ID.zero_6 : null;
      const ok = !pressure || Object.keys(pressure.blitzers).every((sl) => slots.includes(sl as DefSlot));
      const al = alignDefense(call(front, c, ok ? pressure : null), sim.offAlign, slots);
      for (const [sl, p] of pair(al).out) al.spots[sl] = { ...al.spots[sl]!, pos: { ...p } };
      this.canon.set(c.id, al);
    }
  }

  private standing(d: Agent): Vec2 {
    return d.pos;
  }

  /** QB_SCAN: where his pre-snap scan puts defender d: where d stands, off by d's own error, drawn once per play. */
  private scanned(d: Agent): Vec2 {
    let e = this.scanErr.get(d);
    if (!e) {
      const sigPos = 0.3 + 1.0 * (1 - this.rec);
      e = { x: this.sim.dice('qb-scan').normal(0, sigPos), y: this.sim.dice('qb-scan').normal(0, sigPos * 0.7) };
      this.scanErr.set(d, e);
    }
    const p = this.standing(d);
    return { x: p.x + e.x, y: p.y + e.y };
  }

  private preSnapRead(): void {
    const sim = this.sim;
    const sigPos = 0.3 + 1.0 * (1 - this.rec);
    const seen = new Map<DefSlot, Vec2>();
    for (const d of sim.defense) {
      seen.set(d.slot as DefSlot, QB_SCAN ? this.scanned(d) : { x: this.standing(d).x + sim.dice('qb-mind').normal(0, sigPos), y: this.standing(d).y + sim.dice('qb-mind').normal(0, sigPos * 0.7) });
    }
    // Who is a defensive back among the bodies he sees (QB_LOOK_SEEN: by the man's own position), and in a template (the
    // personnel the looks were built on).
    const bySlot = new Map(sim.defense.map((d) => [d.slot as DefSlot, d] as const));
    const obs = this.preFeatures(seen, (sl) => { const d = bySlot.get(sl); return !!d && (QB_LOOK_SEEN ? isDbBody(d) : isDbSlot(sim.defCall.personnel, d.slot)); });
    const tplDb = (sl: DefSlot) => isDbSlot(this.canonPersonnel ?? sim.defCall.personnel, sl);
    const ns = this.noiseScale();
    const logp: Record<string, number> = {};
    for (const c of COVERAGES) {
      const ca = this.canon.get(c.id)!;
      const pos = new Map<DefSlot, Vec2>();
      for (const [slot, sp] of Object.entries(ca.spots) as Array<[DefSlot, NonNullable<DefenseAlignment['spots'][DefSlot]>]>) pos.set(slot, sp.pos);
      const f = this.preFeatures(pos, tplDb);
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
    // Diagnostic only (scripts/diag/eyes/blitz-read.ts): the inputs of his blitz expectation.
    this.blitzInputs = { box, boxSoft: +obs[5].toFixed(2), blockers, cover0: +(this.belief.cover0 ?? 0).toFixed(3), pMan: +this.pMan().toFixed(3) };
  }

  /**
   * Pre-snap picture: [deep count, middle-of-field closed, deep pair width,
   * corner depth, press count, box count].
   */
  private preFeatures(pos: Map<DefSlot, Vec2>, db: (slot: DefSlot) => boolean): Features {
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
    const cbs = QB_CANON_SEEN ? cornersSeen([...pos].map(([slot, p]) => ({ p, db: db(slot) })), los, by) : ['CB_S', 'CB_W'].map((s) => pos.get(s as DefSlot)).filter((p): p is Vec2 => !!p);
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
   * Post-snap picture from acquired memory: [defenders heading deep, middle
   * closed, fraction of coverage players running with receivers]. Recognition
   * cannot refresh defenders outside the current look. Do not use estimate()
   * here: its coverage-prior drift would create circular confirmation.
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
      const m = this.memory.get(d);
      if (!m) continue;
      const coast = Math.min(0.5, Math.max(0, sim.t - m.t));
      const s = { pos: { x: m.pos.x + m.vel.x * coast, y: m.pos.y + m.vel.y * coast },
        vel: m.vel, facing: m.facing };
      const depth = s.pos.x - los;
      const proj = depth + Math.max(-1, s.vel.x) * 0.8;
      const projY = s.pos.y + s.vel.y * 0.8;
      const dk = logistic((proj - 9.5) / 1.0);
      deep += dk;
      mof = Math.max(mof, dk * Math.exp(-(((projY - by) / 6) ** 2)));
      // Rushers (coming at the QB) aren't part of the coverage picture.
      if (depth < 2 && s.vel.x < 0) continue;
      cov++;
      // Body direction is a coarse man/zone cue, not measured eye direction.
      const sp = Math.hypot(s.vel.x, s.vel.y);
      const toQB = Math.atan2(qb.pos.y - s.pos.y, qb.pos.x - s.pos.x);
      if (sp > 2 && Math.cos(s.facing - toQB) < -0.2) turned++;
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

  private postSnapRead(weight: number): boolean {
    // Processing time cannot make an unchanged held picture into new evidence.
    // The pre-snap likelihood already used the initial memory. A real new look
    // permits another update, even if the observed motion itself is unchanged.
    if (![...this.memory].some(([d, m]) => m.t > (this.classifiedAt.get(d) ?? 0))) return false;
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
    for (const [d, m] of this.memory) this.classifiedAt.set(d, m.t);
    return true;
  }

  // ------------------------------------------------------------ vision

  /** Call every tick with where the QB is looking. */
  observe(gaze: Vec2): void {
    const sim = this.sim;
    const qb = this.qb;
    this.justIdentified = false;
    const dir = Math.atan2(gaze.y - qb.pos.y, gaze.x - qb.pos.x);
    const mind = qb.mind; // his own
    for (const d of sim.defense) {
      // Sector membership uses the same delayed picture as the clear look.
      // Current hidden position cannot decide whether that picture is acquired.
      const clear = sim.see(qb, d);
      const dx = clear.pos.x - qb.pos.x;
      const dy = clear.pos.y - qb.pos.y;
      const dist = Math.hypot(dx, dy);
      const ang = Math.abs(angleDiff(Math.atan2(dy, dx), dir));
      // Bodies right around him are felt, not seen; pocket presence handles them.
      if (ang < this.clearHalf * (0.65 + 0.35 * mind.focus) || dist < 3) {
        // QB_TRACK_LOOK: membership by the choice-reaction picture (as before); the picture he keeps is the tracked one.
        const watched = QB_TRACK_LOOK ? sim.track(qb, d, 1, true) : clear;
        const e = PERIPH_ACUITY && dist >= 3 ? this.periphSeen(mind, d.player.id, watched, ang, dist) : null;
        this.memory.set(d, { pos: e ? e.pos : watched.pos, vel: e ? e.vel : watched.vel, facing: watched.facing, ...(UNDERNEATH_MOVE ? { head: watched.head ?? clear.head ?? null } : {}), t: sim.t, latency: watched.age ?? 0, sigP: e?.sigP, sigV: e?.sigV });
      } else if (ang < this.periphHalf * (0.85 + 0.15 * mind.focus)) {
        const s = sim.see(qb, d, 1.7);
        const e = PERIPH_ACUITY ? this.periphSeen(mind, d.player.id, s, ang, dist) : null;
        this.memory.set(d, { pos: e ? e.pos : s.pos, vel: e ? e.vel : s.vel, facing: s.facing, ...(UNDERNEATH_MOVE ? { head: s.head ?? null } : {}), t: sim.t - 0.1, latency: s.age ?? 0, sigP: e?.sigP, sigV: e?.sigV });
      }
    }
    // Existing recognition milestones summarize this acquired look and its
    // memories. Elapsed time permits processing; it does not reveal a rotation.
    if (!this.identified && sim.t >= this.identifyAt) {
      this.justIdentified = this.postSnapRead(0.6);
      this.identified = this.justIdentified;
    } else if (this.identified && !this.confirmed && sim.t >= this.identifyAt + 0.5) {
      this.justIdentified = this.postSnapRead(1);
      this.confirmed = this.justIdentified;
    }
  }

  /** Separate receiver acquisition; ordinary teammate see() is not a QB look.
   * Reuses the existing visual sectors/latency without touching defender gates.
   * No near-pocket automatic acquisition: that exception is defender feel. */
  receiverLook(target: Agent, gaze: Vec2): ReceiverPicture | null {
    const sim = this.sim, qb = this.qb;
    const delay = (scale: number) => qb.mind.observationDelay(qb.profile.reactionTime * scale);
    const clear = sim.perception.perceive(target.idx, delay(1));
    const dir = Math.atan2(gaze.y - qb.pos.y, gaze.x - qb.pos.x);
    const rx = clear.pos.x - qb.pos.x, ry = clear.pos.y - qb.pos.y;
    const ang = Math.abs(angleDiff(Math.atan2(ry, rx), dir));
    const seen = ang < this.clearHalf * (0.65 + 0.35 * qb.mind.focus) ? (QB_TRACK_LOOK ? sim.trackedPicture(target) : clear)
      : ang < this.periphHalf * (0.85 + 0.15 * qb.mind.focus) ? sim.perception.perceive(target.idx, delay(1.7)) : null;
    if (!seen) return null;
    sim.trace.observe(qb, target, seen, sim.t);
    const age = seen.age ?? 0;
    // PERIPH_ACUITY: off his gaze he sees the receiver less precisely (motion yes, position and velocity less so).
    const e = PERIPH_ACUITY ? this.periphSeen(qb.mind, target.player.id, seen, ang, Math.hypot(rx, ry)) : null;
    const sp = e ? e.pos : seen.pos, sv = e ? e.vel : seen.vel;
    return { pos: { x: sp.x - sv.x * age, y: sp.y - sv.y * age },
      vel: { ...sv }, facing: seen.facing, sampledAt: sim.t - age, acquiredAt: sim.t, ...(e ? { sigP: e.sigP, sigV: e.sigV } : {}) };
  }

  /** Acquired route keys, with memory age plus the original sensing latency. */
  routeKeyPictures(): RouteKeyPicture[] {
    // Read-only view of observe()'s memory: querying this cannot see another
    // defender, improve a picture, or consume a decision/random draw. Do not
    // use estimate()'s expected-position fallback as acquired route evidence.
    return [...this.memory].map(([d, m]) => {
      const age = Math.max(0, this.sim.t - m.t), dt = Math.min(.5, age);
      return { id: d.player.id, pos: { x: m.pos.x + m.vel.x * dt, y: m.pos.y + m.vel.y * dt },
        vel: { ...m.vel }, age: age + (m.latency ?? 0), ...(UNDERNEATH_MOVE ? { look: m.head ?? m.facing } : {}) };
    });
  }

  /** PERIPH_ACUITY: a player seen `ecc` rad off his gaze at `range` yd: the look's position and velocity uncertainty and
   * the picture he takes, offset by his stable misjudgment of that player (unit normals, scaled by the uncertainty). */
  private periphSeen(mind: { judgment(key: string): number }, id: string, seen: { pos: Vec2; vel: Vec2 }, ecc: number, range: number): { pos: Vec2; vel: Vec2; sigP: number; sigV: number } {
    const v = 1.3 - 0.6 * this.vision, speed = Math.hypot(seen.vel.x, seen.vel.y);
    const sigP = range * PERIPH_POS_K * ecc * v, sigV = speed * PERIPH_VEL_K * ecc * v;
    const j = (k: string) => mind.judgment(`periph:${id}:${k}`);
    return { pos: { x: seen.pos.x + sigP * j('px'), y: seen.pos.y + sigP * j('py') },
      vel: { x: seen.vel.x + sigV * j('vx'), y: seen.vel.y + sigV * j('vy') }, sigP, sigV };
  }

  /** PERIPH_ACUITY: his uncertainty about a defender's position now (yd): the look's position error and its velocity error
   * grown over the picture's age (dead reckoning). 0 without the flag or a picture. */
  pictureSpread(d: Agent): number {
    const m = this.memory.get(d);
    if (!PERIPH_ACUITY || !m) return 0;
    const age = Math.max(0, this.sim.t - m.t) + (m.latency ?? 0);
    return Math.hypot(m.sigP ?? 0, (m.sigV ?? 0) * age);
  }

  /** QB_V2 (card spec §1, Integration 2026-11-25): how long he has had no new observation of a defender (s): the time
   * since his last sighting, clear or peripheral, without the sensing delay (a man he watches is 0). 0 with no memory. */
  unseenFor(d: Agent): number {
    const m = this.memory.get(d);
    return m ? Math.max(0, this.sim.t - m.t) : 0;
  }

  /** QB_V2 (card spec §1, Integration's ruling 2026-11-25): how far his estimate of a defender has moved from the
   * sighting to his belief of the man's job (the expected spot): the estimate's own blend weight, 0-1. 0 with no memory. */
  jobWeight(d: Agent): number {
    const m = this.memory.get(d);
    return m ? clamp((this.sim.t - m.t - EST_BLEND_START) / EST_BLEND_SPAN, 0, 1) : 0;
  }

  /** QB_V2: his uncertainty about a defender from the look itself (yd): the look's position error and its velocity error
   * over the sensing delay only, not grown with unseen time (that is the judge's one-way advance). 0 without the flag. */
  seenSpread(d: Agent): number {
    const m = this.memory.get(d);
    if (!PERIPH_ACUITY || !m) return 0;
    return Math.hypot(m.sigP ?? 0, (m.sigV ?? 0) * (m.latency ?? 0));
  }

  /** Age of his picture of a defender: memory age plus its sensing latency.
   * Zero when he has no memory of him (the estimate is then a fresh look). */
  pictureAge(d: Agent): number {
    const m = this.memory.get(d);
    return m ? Math.max(0, this.sim.t - m.t) + (m.latency ?? 0) : 0;
  }

  /** Where the QB thinks a defender is (and how he's moving). */
  estimate(d: Agent): { pos: Vec2; vel: Vec2; facing: number } {
    const sim = this.sim;
    const m = this.memory.get(d);
    if (!m) return sim.see(this.qb, d);
    const age = sim.t - m.t;
    if (age < 0.12) return this.recordEstimate(d, { pos: m.pos, vel: m.vel, facing: m.facing }, age);
    const k = Math.min(age, EST_DR_HORIZON);
    const dr = { x: m.pos.x + m.vel.x * k, y: m.pos.y + m.vel.y * k };
    const exp = this.expectedPos(d);
    const w = clamp((age - EST_BLEND_START) / EST_BLEND_SPAN, 0, 1);
    return this.recordEstimate(d, {
      pos: { x: dr.x + (exp.x - dr.x) * w, y: dr.y + (exp.y - dr.y) * w },
      vel: { x: m.vel.x * (1 - w), y: m.vel.y * (1 - w) },
      facing: m.facing,
    }, age);
  }

  /** Capture the estimate actually returned, without advancing vision. Age is
   * the age of QB memory, not total visual latency including PlaySim.see. */
  private recordEstimate(d: Agent, p: { pos: Vec2; vel: Vec2; facing: number }, age: number): typeof p {
    this.sim.trace.observe(this.qb, d, { ...p, stance: null, age }, this.sim.t, 'qb');
    return p;
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
        // QB_SEEN_MAN: the receiver where his own forecast has him, not where he truly is.
        const tp = t ? (QB_SEEN_MAN ? this.receiverAt?.(t) ?? null : t.pos) : null;
        p = tp ? { x: tp.x + 1, y: tp.y + (Math.sign(sim.ballY - tp.y) || 1) * 0.6 } : sp.pos;
      } else {
        p = { x: sim.qb.pos.x + 3, y: sp.pos.y };
      }
      x += b * p.x;
      y += b * p.y;
      wsum += b;
    }
    if (wsum < 1e-6) return QB_SEEN_MAN ? this.memory.get(d)?.pos ?? d.pos : d.pos;
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
    if (opts.hurry || !sim.dice('qb-mind').chance(authority)) return call;

    const los = sim.los;
    const by = sim.ballY;
    const sigPos = 0.3 + 1.0 * (1 - this.rec);
    let boxL = 0;
    let boxR = 0;
    for (const d of sim.defense) {
      const sp = QB_SCAN ? this.scanned(d) : null;
      const x = (sp ? sp.x : this.standing(d).x + sim.dice('qb-mind').normal(0, sigPos)) - los;
      const y = sp ? sp.y : this.standing(d).y + sim.dice('qb-mind').normal(0, sigPos * 0.7);
      if (x < 7.5 && Math.abs(y - by) < 6.5) {
        if (y >= by) boxL++;
        else boxR++;
      }
    }
    const box = boxL + boxR;
    const blockersOn = (sign: number) =>
      sim.offense.reduce((count, o) => {
        const sp = sim.offAlign.spots[o.slot];
        if (!sp || o === sim.qb) return count;
        const side = Math.sign(sp.pos.y - by);
        if (['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot)) return count + Number(side === sign || o.slot === 'C');
        // The second back (a fullback, or a split back). A centered lead
        // contributes half to either side, one total; his actual block still
        // has to work.
        if (o.slot === sim.offAlign.numbering.B2) return count + (side === 0 ? .5 : Number(side === sign));
        return count + Number(!!sp.inline && side === sign);
      }, 0);
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
      if (runDown && box <= blockers - 1 && this.pSingleHigh() < 0.35 && sim.slot('RB') && sim.dice('qb-mind').chance(0.5)) {
        const run = RUN_BY_ID[boxL <= boxR ? (sim.offAlign.strongSign > 0 ? 'iz_strong' : 'iz_weak') : sim.offAlign.strongSign > 0 ? 'iz_weak' : 'iz_strong'];
        this.report.audible = `check to ${run.name}`;
        return { ...call, kind: 'run', run, pass: undefined, label: `${call.formation.name} — ${run.name} (audible)` };
      }
    }
    return call;
  }

  /**
   * Checks built into the call, made by every QB whatever his freedom to
   * change plays: a screen's kill and a run-pass option's pre-snap read.
   */
  installedChecks(call: OffensivePlayCall): OffensivePlayCall {
    return this.rpoRead(call) ?? this.screenKill(call) ?? call;
  }

  /** What the QB sees outside on a screen: press over the receiver, and the
   * defenders and receivers outside the box to that side (defenders off the
   * line and within 9 yd of it), each defender seen with his alignment noise. */
  private screenLook(concept: PassConcept): { press: boolean; cloud: boolean; defenders: number; receivers: number } | null {
    const sim = this.sim;
    const designed = screenSpot(sim, concept);
    if (!designed) return null;
    const r = designed.receiver.pos, side = designed.side, by = sim.ballY;
    const sig = 0.3 + 1.0 * (1 - this.rec);
    let press = false, cloud = false, defenders = 0;
    for (const d of sim.defense) {
      const sp = QB_SCAN ? this.scanned(d) : null;
      const x = (sp ? sp.x : this.standing(d).x + sim.dice('qb-mind').normal(0, sig)) - sim.los;
      const y = sp ? sp.y : this.standing(d).y + sim.dice('qb-mind').normal(0, sig * 0.7);
      if (x < 2.2 && Math.abs(y - r.y) < 1.5) press = true;
      else if (x >= 2.2 && x <= 5 && (y - r.y) * side >= -0.5 && (y - r.y) * side <= 3) cloud = true;
      // Off the line (a man on the line is a box player), outside the box, short of the deep shell.
      if ((y - by) * side > 5 && x >= 1.5 && x < 9) defenders++;
    }
    const receivers = sim.offense.filter((o) => o !== sim.qb && !isOL(o) && !sim.offAlign.spots[o.slot]?.backfield
      && (o.pos.y - by) * side > 5).length;
    return { press, cloud, defenders, receivers };
  }

  /**
   * Run-pass option, read before the snap: throw the tagged screen unless the
   * receiver is pressed or the defense has more men outside than receivers
   * there; otherwise hand off. Thrown, the line still blocks the run.
   */
  private rpoRead(call: OffensivePlayCall): OffensivePlayCall | null {
    if (call.kind !== 'run' || !call.rpo || !call.run) return null;
    const look = this.screenLook(call.rpo);
    const throwIt = !!look && !look.press && !(CLOUD_KILL && look.cloud) && look.defenders <= look.receivers;
    this.report.audible = throwIt ? `rpo: ${call.rpo.name}` : `rpo: ${call.run.name}`;
    if (!throwIt) return { ...call, rpo: undefined };
    return { ...call, kind: 'pass', pass: call.rpo, rpo: undefined, label: `${call.formation.name} — ${call.run.name} / ${call.rpo.name} (thrown)` };
  }

  /**
   * A called quick screen with a press kill: if he sees a defender pressed
   * over the screen receiver (within ~2 yd of the line and over his
   * alignment), check to the quick game. Seen with the same alignment noise
   * as the box count.
   */
  private screenKill(call: OffensivePlayCall): OffensivePlayCall | null {
    const spec = call.kind === 'pass' && !call.run ? call.pass?.screen : undefined;
    if (!spec || !spec.kill) return null;
    const look = this.screenLook(call.pass!);
    if (spec.kill === 'press' && !look?.press && !(CLOUD_KILL && look?.cloud)) return null;
    // SCREEN_QB: a numbers kill (the bubble): more of them outside than us there.
    if (spec.kill === 'numbers' && (!SCREEN_QB || !look || look.defenders <= look.receivers)) return null;
    const quick = this.quickCheck();
    if (!quick) return null;
    this.report.audible = `kill to ${quick.name}`;
    return { ...call, pass: quick, label: `${call.formation.name} — ${quick.name} (kill)` };
  }

  /** Quick-game answer to the look: hitches vs. off corners, slants vs. press. */
  private quickCheck(): PassConcept | null {
    const sim = this.sim;
    let depth: number;
    if (QB_SCAN || QB_CANON_SEEN) {
      // QB_SCAN / QB_CANON_SEEN: the corners where his scan shows them (by where they stand, not their labels).
      const seenPos = sim.defense.map((d) => QB_SCAN ? this.scanned(d) : this.standing(d));
      const cbs = QB_CANON_SEEN ? cornersSeen(seenPos.map((p, i) => ({ p, db: (QB_LOOK_SEEN ? isDbBody(sim.defense[i]) : isDbSlot(sim.defCall.personnel, sim.defense[i].slot)) })), sim.los, sim.ballY)
        : sim.defense.filter((d) => d.slot === 'CB_S' || d.slot === 'CB_W').map((d) => QB_SCAN ? this.scanned(d) : this.standing(d));
      depth = cbs.length ? cbs.reduce((s, p) => s + p.x - sim.los, 0) / cbs.length : 6;
    } else {
      const cbs = sim.defense.filter((d) => d.slot === 'CB_S' || d.slot === 'CB_W');
      // QB_SEEN_MAN: corner depth as he sees it, with his alignment noise.
      const sig = QB_SEEN_MAN ? 0.3 + 1.0 * (1 - this.rec) : 0;
      depth = cbs.length ? cbs.reduce((s, d) => s + this.standing(d).x + (sig ? sim.dice('qb-mind').normal(0, sig) : 0) - sim.los, 0) / cbs.length : 6;
    }
    const id = depth > 5 ? 'hitches' : depth < 2.5 ? 'slant_flat' : 'quick_outs';
    return PASS_BY_ID[id] ?? null;
  }
}

/** QB_CANON_SEEN: the corners where he sees them. Per side of the ball, the widest defensive back (a group he sees in the
 * personnel, not which back is which) within 12 yd of the line and outside the tackle box (4+ yd off the ball); none on a
 * side with no such man. A condensed split or a corner over a nub end still counts; a rolled safety counts only when he
 * stands wider than the corner, which is then the man the passer reads as the corner. */
export function cornersSeen(pts: Array<{ p: Vec2; db: boolean }>, los: number, by: number): Vec2[] {
  const out: Vec2[] = [];
  for (const side of [1, -1]) {
    let best: Vec2 | null = null;
    for (const { p, db } of pts) if (db && p.x - los < 12 && (p.y - by) * side >= 4 && (!best || (p.y - by) * side > (best.y - by) * side)) best = p;
    if (best) out.push(best);
  }
  return out;
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

