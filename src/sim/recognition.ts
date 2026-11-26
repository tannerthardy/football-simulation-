/**
 * Game sense for defenders: is it run or pass?
 *
 * Nobody is told the play. Each defender brings an expectation into the snap
 * — the situation, the personnel and formation, and what this offense has
 * shown so far — and weighs it by his game sense. After the snap he reads the
 * cues his position keys: linemen firing out or setting back, a guard
 * pulling, the quarterback dropping or meshing, the back's path, receivers
 * releasing or blocking, and finally the handoff or the throw. He commits when
 * he's convinced and changes his mind only on strong evidence, so play action
 * and draws work by giving the wrong cues, and an expectation can make a
 * defender quicker (anticipation) or wrong.
 */
import { seenBack } from './seen-back.js';
import { clamp } from '../core/vec.js';
import { OL_SLOTS, type PersonnelId, type QBAlignment } from '../playbook/types.js';
import { r01, type Player } from '../players/types.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { showsBlock } from './coverage-cues.js';
import { sawThrow } from './behaviors/defense.js';
/** CORNER_DROP (see behaviors/defense.ts); read here to keep the import graph as it is. */
const CORNER_DROP_RECOG = process.env.CORNER_DROP !== '0';

// ------------------------------------------------------------ expectations

/** What a defense knows before the snap. */
export interface SnapContext {
  down: number;
  distance: number;
  /** Yards from the offense's own goal line. */
  yardline: number;
  personnel: PersonnelId;
  qb: QBAlignment;
  /** No back in the backfield. */
  empty: boolean;
  /** Two-minute / catch-up tempo. */
  hurry: boolean;
}

/**
 * NFL pass rate by situation, 2022 weeks 1–9 (Big Data Bowl 2025 labels,
 * `data/bdb2025-summary.json` → labels.situations). Scrambles count as passes.
 */
const SITUATION_PASS: Record<string, number> = {
  'goal-to-go': 0.48,
  'red-zone': 0.588,
  '1st': 0.52,
  '2nd-short': 0.379,
  '2nd-medium': 0.503,
  '2nd-long': 0.722,
  'late-short': 0.444,
  'late-medium': 0.883,
  'late-long': 0.927,
};

export function situationBucket(c: Pick<SnapContext, 'down' | 'distance' | 'yardline'>): string {
  const toGoal = 100 - c.yardline;
  if (toGoal <= 5) return 'goal-to-go';
  if (toGoal <= 20) return 'red-zone';
  if (c.down <= 1) return '1st';
  const len = c.distance >= 7 ? 'long' : c.distance >= 3 ? 'medium' : 'short';
  return c.down === 2 ? `2nd-${len}` : `late-${len}`;
}

/** League knowledge of personnel and alignment, in log-odds of a pass. 20
 * personnel is passed as often as 21 (2022 weeks 1-9: 45.5% of 99 snaps
 * against 44.8% of 1,379), so it carries 21's shift. */
const PERSONNEL_SHIFT: Record<PersonnelId, number> = { '10': 0.9, '11': 0.3, '12': -0.25, '13': -0.9, '20': -0.45, '21': -0.45, '22': -1.0 };
const QB_SHIFT: Record<QBAlignment, number> = { gun: 0.3, pistol: -0.1, under: -0.6 };

const logit = (p: number) => Math.log(p / (1 - p));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/** The league-wide expectation of a pass in this context, as log-odds. */
export function leaguePassLogOdds(c: SnapContext): number {
  let l = logit(SITUATION_PASS[situationBucket(c)] ?? 0.58);
  l += PERSONNEL_SHIFT[c.personnel] ?? 0;
  l += QB_SHIFT[c.qb] ?? 0;
  if (c.empty) l += 1.4;
  if (c.hurry) l += 1.0;
  return clamp(l, -3.5, 3.5);
}

const formationKey = (c: SnapContext) => `${c.personnel}/${c.empty ? 'empty' : c.qb}`;

/**
 * A defense's in-game scouting of one offense: how its run/pass mix in each
 * situation and formation differs from what the league would do. Shrunk
 * toward the league expectation, so a few plays don't reveal a tendency.
 */
export class ScoutingReport {
  private readonly cells = new Map<string, { n: number; passes: number; expected: number }>();
  /** Pseudo-plays of league behavior each tendency starts from. */
  constructor(private readonly strength = 10) {}

  observe(c: SnapContext, pass: boolean): void {
    const p = sigmoid(leaguePassLogOdds(c));
    for (const key of [`s:${situationBucket(c)}`, `f:${formationKey(c)}`]) {
      const cell = this.cells.get(key) ?? { n: 0, passes: 0, expected: 0 };
      cell.n++;
      cell.passes += pass ? 1 : 0;
      cell.expected += p;
      this.cells.set(key, cell);
    }
  }

  /** Learned shift (log-odds) for this context. */
  private shift(key: string): number {
    const cell = this.cells.get(key);
    if (!cell) return 0;
    const m = this.strength;
    const base = cell.expected / cell.n;
    const est = (cell.passes + m * base) / (cell.n + m);
    return logit(clamp(est, 0.03, 0.97)) - logit(clamp(base, 0.03, 0.97));
  }

  /** Expected log-odds of a pass from this offense in this context. */
  passLogOdds(c: SnapContext): number {
    // The two views mostly see the same snaps: average them, don't add them.
    const s = 0.5 * (this.shift(`s:${situationBucket(c)}`) + this.shift(`f:${formationKey(c)}`));
    return clamp(leaguePassLogOdds(c) + clamp(s, -2, 2), -4, 4);
  }

  plays(): number {
    let n = 0;
    for (const [k, v] of this.cells) if (k.startsWith('s:')) n += v.n;
    return n;
  }
}

/**
 * Game sense: recognition, awareness and years of seeing it. How much a
 * player trusts what the situation and the opponent's tendencies tell him.
 */
export function gameSense(p: Player): number {
  return clamp(0.45 * r01(p.ratings.playRecognition) + 0.35 * r01(p.ratings.awareness) + 0.2 * Math.min(1, p.experience / 8), 0, 1);
}

// ------------------------------------------------------------ cues

/** DEF_STANCE: how much later a hand-down lineman sees the backfield (delay scale; see assign.ts). */
const DOWN_BACKFIELD_DELAY = 1.6;
/** DRAW_READ: the expectation commits a defender early; what he then sees
 * decides. A line that showed pass and turns to run blocking (the draw, a
 * delayed handoff) defeats a committed pass read on the same visual evidence
 * that would commit run from unsure, without the situation's prior holding
 * him in his drop. NFL box linebackers are coming downhill at the draw
 * handoff (+1.1 yd/s); a pass read held until the give kept ours dropping.
 * DRAW_READ=0 restores the posterior-only change of mind. */
const DRAW_READ = process.env.DRAW_READ !== '0';
/** RUN_CONFIRM (experimental, off; needs DRAW_READ's coherent change of mind):
 * an unsure defender commits run on what he sees, with the situation's pass
 * expectation raising how clear the run picture must be rather than holding
 * the commit until the ball shows. NFL box backers on runs trigger downhill
 * at a median 0.4 s on every down (3rd and 7+: +0.50 yd by 1.0 s vs +0.61 on
 * 1st, BDB 2025 with plays.csv downs); ours read run at 1.05 s on 3rd down.
 * RUN_CONFIRM_PRIOR scales the required run cue per unit of pass prior: at 0.1
 * a 3rd-down backer reads run at a median 0.50 s against 0.45 on 1st (0 gave
 * no situation effect; 0.2 held 3rd down to 0.60 and a strong pass prior to
 * 0.70; NFL 3rd and 7+ trails 1st down by about 0.1 yd at 1.0 s). */
const RUN_CONFIRM = process.env.RUN_CONFIRM !== '0';
const RUN_CONFIRM_PRIOR = 0.1;
export function drawReadEnabled(): boolean {
  return DRAW_READ;
}

/** Has `a` had time to see the first movement after the snap? */
function t0(sim: PlaySim, a: Agent): boolean {
  return sim.t >= 0.1 + a.profile.reactionTime * 0.5;
}

export type Read = 'unsure' | 'run' | 'pass';
type Group = 'DL' | 'LB' | 'S' | 'CB';

/** How much each position keys each cue. */
const KEYS: Record<Group, { ol: number; pull: number; qb: number; rb: number; wr: number }> = {
  // Linemen feel the block in front of them (handled separately) and see the backfield late.
  DL: { ol: 0.8, pull: 0.3, qb: 0.4, rb: 0.4, wr: 0 },
  // Linebackers read guards to backs.
  LB: { ol: 1.0, pull: 1.0, qb: 0.8, rb: 1.0, wr: 0 },
  // Safeties read through the tackle and the #2 receiver.
  S: { ol: 0.8, pull: 0.4, qb: 0.6, rb: 0.4, wr: 0.7 },
  // Corners read their receiver.
  CB: { ol: 0.2, pull: 0, qb: 0.3, rb: 0.2, wr: 1.4 },
};

function groupOf(slot: string): Group {
  const k = slot.split('_')[0];
  if (k === 'DE' || k === 'DT' || k === 'NT') return 'DL';
  if (k === 'LB') return 'LB';
  if (k === 'FS' || k === 'SS') return 'S';
  return 'CB';
}

/**
 * One defender's run/pass belief through a play. Updated every tick from
 * what he perceives (with his perception delay); behaviors ask `read`.
 */
export class Recognition {
  read: Read = 'unsure';
  /** When he committed to his current read (−1 = not yet). */
  readAt = -1;
  /** Current belief, log-odds of a pass. */
  logOdds: number;
  /** He committed to run and it's a pass (or the reverse). */
  changedMind = false;
  /** He has seen this play's throw; the ball cue stays once acquired. */
  private sawPass = false;
  /** He has seen the ball given to a runner; held unless a throw follows. */
  private sawGive = false;
  /** DRAW_READ: his run read came from what he saw against the situation's
   * expectation; changing back to pass then needs the same picture to show it. */
  private priorDefeated = false;
  private evidence = 0;
  private readonly prior: number;
  private readonly gain: number;
  private readonly tau: number;
  private readonly bias: number;
  private readonly group: Group;

  constructor(
    a: Agent,
    sim: PlaySim,
    /** The defense's expectation for this snap (log-odds of a pass). */
    expected: number,
  ) {
    const sense = gameSense(a.player);
    const rec = a.r('playRecognition');
    this.group = groupOf(a.slot);
    // Anticipation: smart players lean on the situation and the scouting
    // report; others play every snap closer to fifty-fifty.
    this.prior = expected * (0.3 + 0.7 * sense);
    this.logOdds = this.prior;
    this.gain = 1.4 + 2.2 * rec;
    this.tau = 0.1 + 0.3 * (1 - rec);
    // A per-play lean (eyes in the wrong place), coherent through the play.
    this.bias = sim.rng.fork(`recognition:${a.slot}`).normal(0, 0.55 * (1 - rec));
  }

  pPass(): number {
    return sigmoid(this.logOdds);
  }

  /** READ_LEAN: how his current picture leans, -1 (pass) .. +1 (run): the
   * probability his commit reads from his picture alone (gain on the filtered
   * evidence and his own lean, no situation prior), as 1 - 2 p(pass). */
  lean(): number {
    return 1 - 2 * sigmoid(this.gain * this.evidence + this.bias);
  }

  /** He has seen the ball given or thrown (a definitive cue). */
  sawBall(): boolean {
    return this.sawGive || this.sawPass;
  }

  update(a: Agent, sim: PlaySim): void {
    const t = sim.t;
    const delay = a.mind.observationDelay(a.profile.reactionTime);
    // Definitive cues, each from his own pictures: the throw once he has seen
    // it, a back he sees holding the ball (linemen at the mesh see it
    // sooner), or the QB he sees carrying it past the line.
    if (!this.sawPass && sawThrow(a, sim, null)) this.sawPass = true;
    let ball = 0;
    if (!this.sawPass && !this.sawGive && this.seesGive(a, sim)) this.sawGive = true;
    if (this.sawPass) ball = 4;
    else if (this.sawGive) ball = -3;
    else {
      const qb = sim.see(a, sim.qb, 1, 'recog');
      if (qb.carrying === true && qb.pos.x > sim.los + 0.5) ball = -3;
    }

    let visual = 0;
    if (t >= delay * 0.6) visual = this.cues(a, sim);
    const tau = this.tau + 0.12 * (1 - a.mind.focus);
    this.evidence += (visual - this.evidence) * (1 - Math.exp(-sim.dt / tau));
    this.logOdds = this.prior + this.gain * (0.8 + 0.2 * a.mind.focus) * this.evidence + this.bias + ball;

    const p = this.pPass();
    if (t < delay) return;
    // Commit with hysteresis: changing your mind takes stronger evidence.
    // Expectation alone doesn't commit him: he needs a cue that agrees,
    // unless the situation is overwhelming.
    const cue = this.evidence + ball;
    const urgency = a.mind.urgency - 0.5;
    // DRAW_READ: his picture alone, without the situation's prior.
    const seen = sigmoid(this.gain * (0.8 + 0.2 * a.mind.focus) * this.evidence + this.bias + ball);
    const commit = (r: Read) => {
      this.commit(r, t);
      sim.event('read', a, null, `${r}; pPass=${p.toFixed(2)} focus=${a.mind.focus.toFixed(2)} urgency=${a.mind.urgency.toFixed(2)}`);
    };
    if (this.read === 'unsure') {
      if (p < 0.3 + 0.10 * urgency && (cue < -0.1 || p < 0.1)) commit('run');
      else if (RUN_CONFIRM && cue < -0.1 - RUN_CONFIRM_PRIOR * Math.max(0, this.prior) && seen < 0.3 + 0.10 * urgency) {
        // RUN_CONFIRM (below): the expectation asks for a clearer run picture;
        // it does not hold his feet. A commit against it is the picture's.
        this.priorDefeated = true;
        commit('run');
      } else if (p > 0.72 - 0.08 * urgency && (cue > 0.1 || p > 0.92)) commit('pass');
    } else if (this.read === 'run' && (this.priorDefeated ? seen : p) > 0.8 + 0.06 * urgency) {
      // Once what he saw has defeated the expectation, the expectation does
      // not bring the pass back on its own: the same picture, without the
      // prior, must show pass again (a pass set, or the throw he sees).
      commit('pass');
      this.changedMind = true;
      this.priorDefeated = false;
    } else if (this.read === 'pass' && (p < 0.16 || (DRAW_READ && cue < -0.1 && seen < 0.3 + 0.10 * urgency))) {
      // DRAW_READ (above): what he now sees decides, not the expectation.
      if (p >= 0.16) this.priorDefeated = true;
      commit('run');
      this.changedMind = true;
    }
  }

  /** A backfield player holding the ball behind the line in his picture:
   * the exchange, a pitch or a direct snap. A fake shows an empty-handed
   * back. Linemen at the mesh see it sooner. Only the backfield is watched
   * for this; a give to a receiver comes through the QB's empty hands. */
  private seesGive(a: Agent, sim: PlaySim): boolean {
    const scale = this.group === 'DL' ? 0.6 : 1;
    for (const o of sim.offense) {
      if (o === sim.qb || !sim.offAlign.spots[o.slot]?.backfield) continue;
      const seen = sim.see(a, o, scale, 'recog');
      if (seen.carrying === true && seen.pos.x <= sim.los + 1) return true;
    }
    return false;
  }

  private commit(r: Read, t: number): void {
    this.read = r;
    this.readAt = t;
  }

  /**
   * Visual evidence, roughly −1.5 (run) … +1.5 (pass). Cues add up — a
   * decisive one (the whole line standing up in pass sets) carries the read
   * on its own, and a cue that says nothing doesn't dilute the others.
   */
  private cues(a: Agent, sim: PlaySim): number {
    // CORNER_DROP: a deep-third corner in a zone call keys as taught, a near-line key through to the QB with his
    // receiver in his vision (Bleacher Report, NFL 101: Cover 3: he clears the tight end, then bails). The weights
    // are the safety's (line 0.8, QB 0.6, receiver 0.7): a stated choice for that key, not a fit.
    const zone = (a.behavior as { zone?: string } | undefined)?.zone;
    const dropCorner = CORNER_DROP_RECOG && this.group === 'CB' && !!zone && zone.startsWith('deep_third_') && !sim.defCall.coverage.man;
    const w = dropCorner ? KEYS.S : KEYS[this.group];
    let sum = 0;
    const add = (v: number, weight: number) => {
      sum += v * weight;
    };

    // The line: pad level (up in a pass set, low firing out), whether they're
    // giving ground or moving people, and a pulling guard.
    let back = 0;
    let hat = 0;
    let n = 0;
    let pull = 0;
    const seenAfter = t0(sim, a);
    for (const slot of OL_SLOTS) {
      const o = sim.slot(slot);
      if (!o) continue;
      const s = sim.see(a, o, 1, 'recog');
      back += (sim.snapX[o.idx] - s.pos.x) * 1.1 - s.vel.x * 0.3;
      if (seenAfter && s.stance) hat += s.stance === 'high' ? 1 : -1;
      if (Math.abs(s.vel.y) > 3 && s.pos.x < sim.los - 0.2 && s.vel.x < 1.5) pull++;
      n++;
    }
    if (n) add(clamp((0.8 * hat) / n + 0.6 * clamp(back / n, -1.5, 1.5), -1.5, 1.5), w.ol * a.mind.keyAttention(sim.t));
    if (pull) add(-1.2, w.pull * a.mind.keyAttention(sim.t));

    // A lineman feels the block in front of him: a blocker firing out low
    // (run, or play action's run look) or one sitting back in a pass set.
    if (this.group === 'DL' && a.engagement) {
      const st = a.engagement.blocker.stance;
      if (st) add(st === 'low' ? -1.2 : 1.2, 1.5);
    }

    // The quarterback: dropping past the mesh depth is a pass; riding a mesh
    // with the back is a run look. Standing at the snap says nothing.
    // DEF_STANCE: a hand-down lineman's eyes are on the man in front; the
    // backfield reaches him later than a man standing up.
    const bf = a.setStance === 'down' ? DOWN_BACKFIELD_DELAY : 1;
    const qb = sim.see(a, sim.qb, bf, 'recog');
    const meshDepth = sim.offCall.formation.qb === 'under' ? 3.6 : sim.offCall.formation.qb === 'pistol' ? 4.6 : 5.2;
    const depth = sim.los - qb.pos.x;
    const rbAgent = seenBack(sim, a);
    const rb = rbAgent ? sim.see(a, rbAgent, bf, 'recog') : null;
    let qbCue = depth > meshDepth + 0.4 ? clamp((depth - meshDepth - 0.4) / 1.0, 0, 1.2) : 0;
    // Bailing straight back from under center is a dropback.
    if (qb.vel.x < -1.5 && Math.abs(qb.vel.y) < 0.6 * -qb.vel.x) qbCue = Math.max(qbCue, 0.6);
    const moved = Math.hypot(qb.vel.x, qb.vel.y) > 1 || Math.abs(sim.los - sim.snapX[sim.qb.idx] - depth) > 0.5;
    if (rb && moved && Math.hypot(rb.pos.x - qb.pos.x, rb.pos.y - qb.pos.y) < 1.6 && depth < meshDepth + 0.8) qbCue = -0.7;
    add(qbCue, w.qb);

    // The back: a downhill burst is run; setting up to block or releasing
    // wide is pass. Stepping up beside the QB says little.
    if (rb) {
      const wide = Math.abs(rb.vel.y) > 3 && Math.abs(rb.pos.y - sim.ballY) > 4;
      const settled = sim.t > 0.6 && Math.hypot(rb.vel.x, rb.vel.y) < 1.2;
      add(wide ? 0.6 : rb.vel.x > 3 ? -1 : rb.vel.x > 2 ? -0.3 : settled ? 0.5 : 0, w.rb);
    }

    // Receivers: releasing hard is pass; closing down on a defender to block is run.
    if (w.wr > 0) {
      // A man player keys the receiver he was assigned, including a back.
      // Crossing/stacked receivers do not silently replace that known job.
      // Zone players retain their existing local key; this is not a global
      // attention budget or access to another defender's private read.
      const man = a.behavior.kind === 'man'
        ? (a.behavior as typeof a.behavior & { target?: Agent | null }).target : null;
      let best: Agent | null = man?.team !== a.team && man !== sim.qb ? man ?? null : null;
      let bd = Infinity;
      if (!best) for (const o of sim.offense) {
        if (o === sim.qb || o === rbAgent || OL_SLOTS.includes(o.slot as (typeof OL_SLOTS)[number])) continue;
        const seen = sim.see(a, o, 1, 'recog');
        const d = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
      if (best) {
        const s = sim.see(a, best, 1, 'recog');
        // A slow release or a stopped route is not a block declaration.
        // Use the same acquired pad/contact evidence as coverage technique;
        // never infer the receiver's intent from his private assignment.
        // Own contact needs no remote teammate positions. General teammate
        // perception remains a separate migration; do not expand its use here.
        const stalk = sim.t > 0.6 && showsBlock(a, sim, best, s, [a]);
        if (stalk) add(-1, w.wr);
        // CORNER_DROP: to a deep-third corner a receiver releasing vertically off the line is pass evidence at any
        // pace (his stem in his picture), not only once seen above 3.5 yd/s.
        else if (dropCorner && s.vel.x > 1) add(clamp(s.vel.x / 3.5, 0, 1), w.wr);
        else if (s.vel.x > 3.5) add(clamp((s.vel.x - 3.5) / 3, 0, 1), w.wr);
        else if (sim.t > 0.6) add(0, w.wr * 0.5);
      }
    }
    // Deep players read the line less clearly than those on top of it.
    const clarity = 1 / (1 + Math.max(0, a.pos.x - sim.los - 5) / 10);
    return clamp((sum / 2) * clarity, -1.5, 1.5);
  }
}
