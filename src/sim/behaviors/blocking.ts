/**
 * Blocking.
 *
 * Pass protection: a coordinator matches available blockers to rushers each
 * tick (inside-out zone responsibility for linemen, backs and tight ends pick
 * up free rushers); spare linemen double. Protectors kick-slide to a set point
 * and fit between the rusher and the QB.
 *
 * Run blocking: assignments are computed at the snap from the defensive
 * alignment using real rules — zone (covered/uncovered, reach, combo to the
 * second level, backside cutoff) and gap (down blocks, pullers kicking out the
 * end man on the line or leading through the hole, trap), plus fullback lead
 * and receivers stalking defensive backs.
 */
import { FIELD_WIDTH } from '../../core/field.js';
import { clamp, norm, sub, type Vec2 } from '../../core/vec.js';
import type { MoveCommand } from '../../physics/kinematics.js';
import type { RunConcept } from '../../playbook/types.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import { traits } from '../engagement.js';
import { goTo, runThrough, stand, track } from './common.js';

const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
export const isOL = (a: Agent): boolean => OL.has(a.slot);

// ------------------------------------------------------------- protection

export class ProtectionCoordinator {
  private lastT = -1;
  private readonly sticky = new Map<Agent, Agent>();
  readonly assigned = new Map<Agent, Agent | null>();
  readonly protectors: Agent[] = [];
  readonly homeY = new Map<Agent, number>();

  add(a: Agent): void {
    this.protectors.push(a);
    this.homeY.set(a, a.pos.y);
  }

  private isRusher(sim: PlaySim, d: Agent): boolean {
    const k = d.behavior.kind;
    if (k === 'rush' || k === 'blitz') {
      // Blitzers from depth are identified after a recognition delay.
      if (k === 'blitz' && sim.t < 0.2 + 0.3 * (1 - 0.5)) return d.pos.x < sim.los + 2.5;
      return true;
    }
    return d.pos.x < sim.los + 1.5 && d.vel.x < -0.5;
  }

  update(sim: PlaySim): void {
    if (this.lastT === sim.t) return;
    this.lastT = sim.t;
    const rushers = sim.defense.filter((d) => !d.isDown(sim.t) && this.isRusher(sim, d));
    const free = this.protectors.filter((b) => !b.engagement && !b.isDown(sim.t) && b.behavior instanceof PassProtector && !(b.behavior as PassProtector).released);
    this.assigned.clear();
    const taken = new Set<Agent>();
    for (const b of this.protectors) if (b.engagement) taken.add(b.engagement.defender);
    const unblocked = rushers.filter((r) => !r.engagement && !taken.has(r));
    const usedB = new Set<Agent>();
    const usedR = new Set<Agent>();
    const zoneOf = (b: Agent) => (isOL(b) ? (b.slot === 'LT' || b.slot === 'RT' ? 5.5 : 2.6) : 8);
    // Assignments hold once made: a blocker keeps his man unless someone else
    // has picked him up, he's down, or he has left this blocker's area (a game
    // or twist — then he's passed off).
    for (const [b, r] of [...this.sticky]) {
      const home = this.homeY.get(b)!;
      if (!free.includes(b) || r.isDown(sim.t) || r.engagement || taken.has(r) || Math.abs(r.pos.y - home) > zoneOf(b) + 1.5) {
        this.sticky.delete(b);
        continue;
      }
      usedB.add(b);
      usedR.add(r);
      this.assigned.set(b, r);
    }
    const pairs: Array<{ b: Agent; r: Agent; cost: number }> = [];
    for (const b of free) {
      if (usedB.has(b)) continue;
      const home = this.homeY.get(b)!;
      const isT = b.slot === 'LT' || b.slot === 'RT';
      const zone = zoneOf(b);
      for (const r of unblocked) {
        if (usedR.has(r)) continue;
        if (Math.abs(r.pos.y - home) > zone) continue;
        // Don't chase rushers who are already past.
        if (r.pos.x < b.pos.x - 1.5 && isOL(b)) continue;
        let cost = Math.abs(r.pos.y - b.pos.y) + 0.35 * Math.max(0, r.pos.x - b.pos.x);
        if (!isOL(b)) cost += 0.8; // backs/TEs pick up leftovers
        // Interior first: centers and guards take A/B gap threats.
        if (isOL(b) && Math.abs(r.pos.y - sim.ballY) < 2.5 && !isT) cost -= 0.4;
        pairs.push({ b, r, cost });
      }
    }
    pairs.sort((p, q) => p.cost - q.cost);
    for (const { b, r } of pairs) {
      if (usedB.has(b) || usedR.has(r)) continue;
      usedB.add(b);
      usedR.add(r);
      this.assigned.set(b, r);
      this.sticky.set(b, r);
    }
    // Spare protectors help: double the nearest engaged rusher.
    for (const b of free) {
      if (usedB.has(b)) continue;
      let best: Agent | null = null;
      let bd = isOL(b) ? 2.8 : 0;
      for (const o of this.protectors) {
        const e = o.engagement;
        if (!e || e.helpers.length > 0) continue;
        const dd = Math.abs(e.defender.pos.y - b.pos.y);
        if (dd < bd) {
          bd = dd;
          best = e.defender;
        }
      }
      this.assigned.set(b, best);
    }
  }
}

export class PassProtector implements Behavior {
  readonly kind = 'pass-pro';
  released = false;
  /** Per-rep tendency to over-set (random, scaled by footwork). */
  private oversetBias = -1;
  constructor(
    private readonly coord: ProtectionCoordinator,
    /** For backs/TEs: release into a route after this time if nobody comes. */
    private readonly releaseTo: (() => Behavior) | null = null,
    private readonly releaseAfter = 1.1,
  ) {}

  update(a: Agent, sim: PlaySim): MoveCommand {
    // Play action: everyone shows a low, aggressive pad level at first.
    a.stance = isOL(a) && sim.t < 0.35 && sim.offCall.kind === 'pass' && sim.offCall.pass?.fake ? 'low' : 'high';
    if (a.engagement) return stand();
    if (sim.carrier !== sim.qb || !sim.isPass) {
      return stand();
    }
    this.coord.update(sim);
    const r = this.coord.assigned.get(a) ?? null;
    if (!r && this.releaseTo && sim.t > this.releaseAfter) {
      this.released = true;
      a.behavior = this.releaseTo();
      return a.behavior.update(a, sim);
    }
    const qb = sim.qb;
    const home = this.coord.homeY.get(a) ?? a.pos.y;
    if (!r) {
      // Set: tackles kick, interior sets short; backs hold near the QB.
      const isT = a.slot === 'LT' || a.slot === 'RT';
      const out = Math.sign(home - sim.ballY);
      const depth = isOL(a) ? (isT ? 2.2 : 1.1) * Math.min(1, sim.t / 0.8) : 0;
      // A back steps up beside the QB's launch point, not toward the line:
      // from under center the QB starts at the line and drops away.
      let set = isOL(a) ? { x: sim.los - 0.6 - depth, y: home + (isT ? out * 0.8 : 0) } : { x: Math.min(qb.pos.x + 1.2, sim.snapX[a.idx] + 1.5), y: qb.pos.y + Math.sign(home - qb.pos.y || 1) * 1.4 };
      if (runLook(a, sim)) set = { x: sim.los - 0.2, y: set.y };
      return goTo(a, set, { speed: 0.7, facing: 0 });
    }
    // Pass set: stay on the line between the rusher and the QB, giving ground
    // under control. Poor footwork over-sets against speed (opening the
    // inside counter).
    const toQB = norm(sub(qb.pos, r.pos));
    const arm = a.player.measurables.armIn / 36;
    // Punching range: bodies plus most of an arm's length.
    const contact = a.profile.radius + r.profile.radius + 0.1 + arm * 0.55;
    const out = Math.sign(r.pos.y - sim.ballY) || 1;
    const edgeRusher = Math.abs(r.pos.y - sim.ballY) > 3;
    const fear = edgeRusher ? clamp((r.speed - 4) / 5, 0, 1) : 0.2;
    if (this.oversetBias < 0) this.oversetBias = sim.rng.range(0.2, 1.4);
    const overset = (1 - traits(a).feet) * 0.9 * fear * this.oversetBias;
    // Kick-slide: gain depth (tackles more than interior), staying on the
    // rusher's line to the QB at punching distance. Make the rusher come to you.
    const isT = a.slot === 'LT' || a.slot === 'RT';
    const width = clamp(Math.abs(r.pos.y - home) / 2.5, 0, 1.5);
    const setDepth = (isT ? 1.0 + (2.4 + width) * clamp(sim.t / 0.9, 0, 1) : 0.8 + 1.2 * clamp(sim.t / 0.7, 0, 1)) * (edgeRusher ? 1 : 0.8);
    // Anticipate the rusher's path a beat ahead (better feet read it sooner).
    const lead = 0.15 + 0.2 * traits(a).feet;
    const rp = { x: r.pos.x + r.vel.x * lead, y: r.pos.y + r.vel.y * lead };
    const toQBp = norm(sub(qb.pos, rp));
    let along = contact * 0.85;
    if (toQBp.x < -0.2) along = Math.max(along, (sim.los - setDepth - rp.x) / toQBp.x);
    let set = { x: rp.x + toQBp.x * along, y: rp.y + toQBp.y * along + out * overset };
    if (runLook(a, sim)) set = { x: Math.max(set.x, sim.los - 0.3), y: set.y };
    const dd = Math.hypot(r.pos.x - a.pos.x, r.pos.y - a.pos.y);
    // A tackle late to the spot can still get a punch on a speed rusher's near
    // shoulder as he goes by; the rep then starts from a losing angle.
    const passing = r.speed > 4.5 && r.pos.x < a.pos.x + 0.6;
    const reachOut = edgeRusher && passing ? 0.15 + 0.3 * traits(a).feet : 0;
    if (dd < contact + 0.15 + reachOut) {
      sim.engage(a, r, 'pass');
      return stand();
    }
    const facing = Math.atan2(r.pos.y - a.pos.y, r.pos.x - a.pos.x);
    const quick = 0.85 + 0.3 * traits(a).feet;
    return track(a, set, { x: r.vel.x * 0.7, y: r.vel.y }, { facing, cutSkill: quick, gain: 2.5 });
  }
}

/**
 * Play-action protection: the interior shows run for the first moments (fire
 * out low instead of setting), the cue that holds linebackers; the tackles
 * still kick to protect the edges.
 */
function runLook(a: Agent, sim: PlaySim): boolean {
  const interior = a.slot === 'LG' || a.slot === 'C' || a.slot === 'RG';
  return interior && sim.t < 0.35 && sim.offCall.kind === 'pass' && !!sim.offCall.pass?.fake;
}

// ------------------------------------------------------------- run blocking

export type RunBlockKind = 'drive' | 'reach' | 'down' | 'combo' | 'climb' | 'pull' | 'cutoff' | 'lead' | 'stalk' | 'draw';

export interface Combination {
  members: [Agent, Agent];
  defender: Agent;
  backer: Agent | null;
  released: boolean;
  secureSince: number;
  nextRead: number;
}

export interface RunBlockPlan {
  kind: RunBlockKind;
  target: Agent | null;
  climbTo?: Agent | null;
  drive: Vec2;
  pullPath?: Vec2[];
  /** Pullers: 'kick' the end man or 'lead' to a linebacker. */
  pullRole?: 'kick' | 'lead' | 'trap';
  combination?: Combination;
}

function classify(sim: PlaySim): { dl: Agent[]; lb: Agent[]; db: Agent[] } {
  const dl: Agent[] = [];
  const lb: Agent[] = [];
  const db: Agent[] = [];
  for (const d of sim.defense) {
    const dx = d.pos.x - sim.los;
    const dy = Math.abs(d.pos.y - sim.ballY);
    if (dx < 2.0 && dy < 9) dl.push(d);
    else if (dx < 7.5 && dy < 8) lb.push(d);
    else db.push(d);
  }
  return { dl, lb, db };
}

export function playSideSign(sim: PlaySim, concept: RunConcept): number {
  return concept.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
}

/** Maximize accounted-for down threats before minimizing lateral travel.
 * At most seven inline blockers: a small mask search avoids a greedy tackle
 * stealing a shaded guard's man and leaving the wide end without an owner.
 */
function zoneOwnership(line: Agent[], down: Agent[]): Map<Agent, Agent> {
  type Choice = { missed: number; distance: number; targets: Map<Agent, Agent> };
  let choices = new Map<number, Choice>([[0, { missed: 0, distance: 0, targets: new Map() }]]);
  const better = (a: Choice, b?: Choice) => !b || a.missed < b.missed || (a.missed === b.missed && a.distance < b.distance);
  for (const d of down) {
    const next = new Map<number, Choice>();
    const keep = (mask: number, choice: Choice) => { if (better(choice, next.get(mask))) next.set(mask, choice); };
    for (const [mask, choice] of choices) {
      keep(mask, { ...choice, missed: choice.missed + 1 });
      for (let i = 0; i < line.length; i++) {
        if (mask & (1 << i)) continue;
        const b = line[i];
        const distance = Math.abs(d.pos.y - b.pos.y);
        if (distance >= (i === 0 || i === line.length - 1 ? 4.5 : 2.2)) continue;
        const targets = new Map(choice.targets);
        targets.set(b, d);
        keep(mask | (1 << i), { missed: choice.missed, distance: choice.distance + distance, targets });
      }
    }
    choices = next;
  }
  let best: Choice | undefined;
  for (const choice of choices.values()) if (better(choice, best)) best = choice;
  return best?.targets ?? new Map();
}

export function planRunBlocking(sim: PlaySim, concept: RunConcept): Map<Agent, RunBlockPlan> {
  const plans = new Map<Agent, RunBlockPlan>();
  const ps = playSideSign(sim, concept);
  const { dl, lb, db } = classify(sim);
  const by = sim.ballY;
  const rel = (a: Agent) => (a.pos.y - by) * ps; // + = playside
  const line = sim.offense.filter((a) => isOL(a) || (sim.offAlign.spots[a.slot]?.inline ?? false));
  line.sort((p, q) => rel(q) - rel(p));
  const claimedDL = new Set<Agent>();
  const claimedLB = new Set<Agent>();
  const lbNear = (y: number, preferBackside = false): Agent | null => {
    let best: Agent | null = null;
    let bd = Infinity;
    for (const l of lb) {
      if (claimedLB.has(l)) continue;
      let d = Math.abs(l.pos.y - y);
      if (preferBackside && (l.pos.y - y) * ps > 0) d += 1.5;
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    if (best) claimedLB.add(best);
    return best;
  };
  const up = (lat: number) => norm({ x: 1, y: lat });
  const combo = (b: Agent, partner: Agent, target: Agent, backer: Agent | null, drive: Vec2) => {
    const combination: Combination = { members: [partner, b], defender: target, backer, released: false, secureSince: -1, nextRead: 0 };
    plans.get(partner)!.combination = combination;
    plans.set(b, { kind: 'combo', target, climbTo: backer, drive, combination });
  };

  const scheme = concept.scheme;
  const zoneLike = scheme === 'insideZone' || scheme === 'outsideZone' || scheme === 'duo' || scheme === 'toss' || scheme === 'draw' || scheme === 'qbDraw';

  if (zoneLike) {
    // Covered/uncovered ownership includes either shade and accounts for the
    // whole front before an uncovered blocker is available to help or climb.
    for (const [b, d] of zoneOwnership(line, dl)) {
      claimedDL.add(d);
      const reach = scheme === 'outsideZone' || scheme === 'toss';
      plans.set(b, { kind: reach ? 'reach' : 'drive', target: d, drive: up(ps * (reach ? 1.1 : 0.6)) });
    }
    const pending = line.filter((b) => !plans.has(b));
    for (const b of pending) {
      if (plans.has(b)) continue;
      const i = line.indexOf(b);
      const neighbor = line[i - 1];
      const np = neighbor ? plans.get(neighbor) : undefined;
      if (np?.target && !np.combination && (np.kind === 'drive' || np.kind === 'reach')) {
        combo(b, neighbor, np.target, lbNear(b.pos.y + ps * 1.5, scheme === 'insideZone'), up(ps * 0.5));
      } else {
        plans.set(b, { kind: 'climb', target: lbNear(b.pos.y + ps * 1.0), drive: up(ps * 0.4) });
      }
    }
    // Backside end of the line walls off (cutoff).
    const last = line[line.length - 1];
    const lp = plans.get(last);
    if (lp && (lp.kind === 'drive' || lp.kind === 'reach')) lp.kind = 'cutoff';
    if (scheme === 'draw' || scheme === 'qbDraw') for (const p of plans.values()) p.kind = p.kind === 'combo' || p.kind === 'climb' ? p.kind : 'draw';
  } else {
    // Gap schemes.
    const guards = line.filter((a) => a.slot === 'LG' || a.slot === 'RG');
    const tackles = line.filter((a) => a.slot === 'LT' || a.slot === 'RT');
    const bsg = guards.find((g) => rel(g) < 0) ?? null;
    const bst = tackles.find((t) => rel(t) < 0) ?? null;
    const pullers = new Set<Agent>();
    if (concept.pullers.includes('BSG') && bsg) pullers.add(bsg);
    if (concept.pullers.includes('BST') && bst) pullers.add(bst);

    // Reserve precisely the intentionally unblocked trap/kick defender.
    // The old trap rule left every playside lineman for one trapper.
    const trapReserved = scheme === 'trap' ? dl.filter((d) => rel(d) > 0).sort((p, q) => rel(p) - rel(q))[0] ?? null : null;
    const kickReserved = scheme !== 'trap' && pullers.size ? dl.filter((d) => rel(d) > 0).sort((p, q) => rel(q) - rel(p))[0] ?? null : null;

    // Account for immediate inside threats first. Outside-in assignment can
    // send the tackle across a guard's covered man and expose the mesh.
    const gapLine = line.filter((b) => !pullers.has(b)).sort((a, b) => Math.abs(rel(a)) - Math.abs(rel(b)));
    const gapPending: Agent[] = [];
    for (const b of gapLine) {
      if (pullers.has(b)) continue;
      const r = rel(b);
      if (r >= -0.2) {
        const coverPull = b.slot === 'C' && bsg && pullers.has(bsg)
          ? dl.filter((d) => !claimedDL.has(d) && d !== trapReserved && d !== kickReserved && Math.abs(d.pos.y - bsg.pos.y) < 1.4)
            .sort((p, q) => Math.abs(p.pos.y - b.pos.y) - Math.abs(q.pos.y - b.pos.y))[0]
          : undefined;
        const cand = dl
          .filter((d) => !claimedDL.has(d) && d !== trapReserved && d !== kickReserved)
          .filter((d) => {
            const off = (d.pos.y - b.pos.y) * ps;
            return off > -2.0 && off < 0.6;
          })
          .sort((p, q) => rel(p) - rel(q));
        // Trap: leave the first DL past the center on the playside for the trapper.
        const d = coverPull ?? cand[cand.length - 1] ?? cand[0];
        if (d) {
          claimedDL.add(d);
          plans.set(b, { kind: 'down', target: d, drive: up(-ps * 1.0) });
        } else {
          gapPending.push(b);
        }
      } else {
        // Backside: hinge/cutoff.
        const cand = dl.filter((d) => !claimedDL.has(d) && d !== trapReserved && d !== kickReserved).sort((p, q) => Math.abs(p.pos.y - b.pos.y) - Math.abs(q.pos.y - b.pos.y));
        const d = cand[0] && Math.abs(cand[0].pos.y - b.pos.y) < 2.5 ? cand[0] : null;
        if (d) claimedDL.add(d);
        if (d) plans.set(b, { kind: 'cutoff', target: d, drive: up(ps * 0.8) });
        else gapPending.push(b);
      }
    }
    for (const b of gapPending) {
      const partners = gapLine.filter((p) => p !== b && plans.get(p)?.target && !plans.get(p)?.combination && Math.abs(p.pos.y - b.pos.y) < 2.0)
        .sort((p, q) => Math.abs(plans.get(p)!.target!.pos.y - b.pos.y) - Math.abs(plans.get(q)!.target!.pos.y - b.pos.y));
      const partner = partners[0];
      const target = partner ? plans.get(partner)!.target : null;
      if (partner && target && Math.abs(target.pos.y - b.pos.y) < 2.5) {
        combo(b, partner, target, lbNear(b.pos.y - ps * 0.5, true), plans.get(partner)!.drive);
      } else plans.set(b, { kind: 'climb', target: lbNear(b.pos.y - ps * 1.0, true), drive: up(-ps * 0.5) });
    }
    // End man on the line on the playside (kick-out target).
    const emlos = kickReserved ?? dl.filter((d) => !claimedDL.has(d) && rel(d) > 0).sort((p, q) => rel(q) - rel(p))[0] ?? null;
    const trapTarget = trapReserved;
    const hole = by + ps * (concept.aim === 'A' ? 0.65 : concept.aim === 'B' ? 1.95 : 3.6);
    const fb = sim.slot('F');
    const fbIsBack = fb && sim.offAlign.spots.F?.backfield;
    const pullPath = (b: Agent): Vec2[] => [
      { x: sim.los - 1.6, y: b.pos.y },
      { x: sim.los - 1.4, y: hole - ps * 0.5 },
      { x: sim.los + 0.5, y: hole },
    ];
    for (const p of pullers) {
      let role: 'kick' | 'lead' | 'trap';
      if (scheme === 'trap') role = 'trap';
      else if (scheme === 'counter') role = p === bsg ? 'kick' : 'lead';
      else role = fbIsBack ? 'lead' : 'kick';
      const target = role === 'trap' ? trapTarget : role === 'kick' ? emlos : lbNear(hole);
      if (target && role !== 'lead') claimedDL.add(target);
      const path = target && role !== 'lead' ? [
        { x: sim.los - (role === 'trap' ? 1.05 : 1.6), y: p.pos.y },
        { x: sim.los - (role === 'trap' ? 0.85 : 1.25), y: target.pos.y - ps * 0.65 },
        { x: sim.los - 0.1, y: target.pos.y - ps * 0.45 },
      ] : pullPath(p);
      plans.set(p, { kind: 'pull', pullRole: role, target, drive: role === 'kick' ? norm({ x: 0.3, y: ps }) : role === 'trap' ? norm({ x: 0.4, y: ps }) : up(0), pullPath: path });
    }
    if (fb && fbIsBack && concept.scheme === 'power' && emlos && !claimedDL.has(emlos)) {
      plans.set(fb, { kind: 'lead', target: emlos, drive: norm({ x: 0.3, y: ps }) });
      claimedDL.add(emlos);
    }
  }

  // Fullback lead (zone/iso) and receivers stalking.
  const fb = sim.slot('F');
  if (fb && sim.offAlign.spots.F?.backfield && !plans.has(fb)) {
    plans.set(fb, { kind: 'lead', target: lbNear(by + ps * 1.5), drive: up(0) });
  }
  for (const a of sim.offense) {
    if (plans.has(a) || a === sim.qb || a.slot === 'RB') continue;
    if (a.slot === 'F' && sim.offAlign.spots.F?.backfield) continue;
    // Stalk the defensive back over him.
    let best: Agent | null = null;
    let bd = Infinity;
    for (const d of [...db, ...lb]) {
      const dd = Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y);
      const score = dd;
      if (score < bd) {
        bd = score;
        best = d;
      }
    }
    plans.set(a, { kind: 'stalk', target: best, drive: norm(sub(best?.pos ?? a.pos, { x: a.pos.x - 1, y: a.pos.y })) });
  }
  return plans;
}

export class RunBlocker implements Behavior {
  readonly kind = 'run-block';
  private pullIdx = 0;
  private retarget = 0;
  private homeY: number | null = null;
  constructor(public plan: RunBlockPlan) {}

  get target(): Agent | null {
    return this.plan.target;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const plan = this.plan;
    const t = sim.t;
    this.homeY ??= a.pos.y;
    // Draw blockers show pass first; everyone else fires out low.
    a.stance = plan.kind === 'draw' && t < 1.0 ? 'high' : 'low';
    if (t < a.mind.snapDelay) return stand();
    if (plan.combination) readCombination(a, sim, plan.combination);
    if (a.engagement) {
      return stand();
    }
    // Sell pass until just before the handoff.
    if (plan.kind === 'draw' && t < 1.0) {
      return goTo(a, { x: sim.los - 1.2, y: a.pos.y }, { speed: 0.6, facing: 0 });
    }

    let target = plan.target;
    if (!target || target.isDown(t) || (target.engagement && target.engagement.blocker !== a && !target.engagement.helpers.includes(a) && plan.kind !== 'combo')) {
      if (t >= this.retarget) {
        this.retarget = t + a.mind.decisionInterval;
        plan.target = target = this.findWork(a, sim);
      }
    }
    if (plan.kind === 'pull' && plan.pullPath && this.pullIdx < plan.pullPath.length) {
      const wp = plan.pullPath[this.pullIdx];
      if (Math.hypot(wp.x - a.pos.x, wp.y - a.pos.y) < 0.65) this.pullIdx++;
      else {
        // Engage early if the target crosses the path.
        if (this.pullIdx > 0 && target && Math.hypot(target.pos.x - a.pos.x, target.pos.y - a.pos.y) < 1.2) return this.attack(a, sim, target);
        // Clear the line before turning up; approach the corner under control
        // so a heavy puller doesn't run through the waypoint and circle back.
        let path = wp;
        if (this.pullIdx === 1 && sim.offense.some((o) => o !== a && isOL(o) && Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y) < 1.2 && o.pos.x > a.pos.x)) {
          path = { x: Math.min(wp.x, a.pos.x - 0.35), y: wp.y };
        }
        return goTo(a, path, { speed: 0.95, through: a.profile.vmax * 0.65 });
      }
    }
    if (!target) {
      const c = sim.carrier;
      return goTo(a, { x: (c?.pos.x ?? sim.los) + 3, y: a.pos.y }, { speed: 0.5 });
    }
    if (plan.kind === 'stalk') {
      // Stay square on the DB until the run comes; engage when he closes.
      const dd = Math.hypot(target.pos.x - a.pos.x, target.pos.y - a.pos.y);
      if (dd < a.profile.radius + target.profile.radius + 0.3) {
        sim.engage(a, target, 'run', plan.drive);
        return stand();
      }
      const fit = { x: Math.max(target.pos.x - 1.2, a.pos.x), y: target.pos.y };
      return goTo(a, fit, { speed: 0.85, through: 1 });
    }
    return this.attack(a, sim, target);
  }

  private attack(a: Agent, sim: PlaySim, target: Agent): MoveCommand {
    const plan = this.plan;
    const dd = Math.hypot(target.pos.x - a.pos.x, target.pos.y - a.pos.y);
    // A run block starts with the strike, before torsos meet. Keep functional
    // extension shorter than a pass-pro punch; long arms can catch a slant.
    const contact = a.profile.radius + target.profile.radius + 0.1 + (a.player.measurables.armIn / 36) * 0.45;
    if (dd < contact) {
      sim.engage(a, target, 'run', plan.drive);
      return stand();
    }
    // Aiming point: reach blocks work to the playside shoulder.
    const seen = sim.see(a, target);
    let aim = seen.pos;
    if (plan.kind === 'combo' && plan.combination) {
      const partner = plan.combination.members.find((b) => b !== a)!;
      const side = Math.sign(a.pos.y - partner.pos.y) || 1;
      aim = { x: seen.pos.x - 0.35, y: seen.pos.y + side * 0.55 };
    } else if (plan.kind === 'reach' || plan.kind === 'cutoff') aim = { x: seen.pos.x - 0.3, y: seen.pos.y + plan.drive.y * 0.6 };
    else if (plan.kind === 'down') aim = { x: seen.pos.x - 0.2, y: seen.pos.y - plan.drive.y * 0.4 };
    else if (plan.kind === 'climb' || plan.kind === 'lead') {
      aim = a.mind.aim('block-fit', { x: seen.pos.x + seen.vel.x * 0.25, y: seen.pos.y + seen.vel.y * 0.25 }, sim.t);
    }
    aim = { x: aim.x, y: clamp(aim.y + a.mind.placementError * (1 - 0.5 * a.r('runBlock')), 0.5, FIELD_WIDTH - 0.5) };
    return runThrough(a, aim, { speed: 1 });
  }

  private findWork(a: Agent, sim: PlaySim): Agent | null {
    const c = sim.carrier;
    const ref = c && c.team === a.team ? c.pos : { x: sim.los, y: sim.ballY };
    let best: Agent | null = null;
    let bs = Infinity;
    for (const d of sim.defense) {
      if (d.engagement || d.isDown(sim.t)) continue;
      const seen = sim.see(a, d);
      // Find work within this responsibility, not the omniscient nearest man
      // to the ball anywhere on the field. Pullers/lead blockers own the exit.
      const laneY = this.plan.pullPath?.at(-1)?.y ?? (this.plan.kind === 'lead' ? ref.y : this.homeY ?? a.pos.y);
      if (Math.abs(seen.pos.y - laneY) > 3.0 || seen.pos.x < a.pos.x - 1.0) continue;
      const toMe = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y);
      if (toMe > 6) continue;
      const toBall = Math.hypot(seen.pos.x - ref.x, seen.pos.y - ref.y);
      const s = toMe + 0.5 * toBall;
      if (s < bs) {
        bs = s;
        best = d;
      }
    }
    return best;
  }
}

/** A double team releases from leverage and the filling backer, never a mesh timer. */
export function readCombination(observer: Agent, sim: PlaySim, combo: Combination): void {
  if (combo.released || sim.t < combo.nextRead || !combo.backer || combo.backer.isDown(sim.t)) return;
  combo.nextRead = sim.t + observer.mind.decisionInterval;
  const e = combo.defender.engagement;
  if (!e || !combo.members.includes(e.blocker) || !combo.members.every((b) => b.engagement === e)) {
    combo.secureSince = -1;
    return;
  }
  const secure = e.control > -0.12 + 0.12 * (0.5 - observer.mind.urgency) && e.baseB > 0.60 && Math.abs(e.phi) < 0.55;
  if (!secure) {
    combo.secureSince = -1;
    observer.tags.add('combo-held');
    return;
  }
  if (combo.secureSince < 0) combo.secureSince = sim.t;
  if (sim.t - combo.secureSince < 0.15) return;
  const backer = sim.see(observer, combo.backer);
  const filling = Math.hypot(backer.pos.x - observer.pos.x, backer.pos.y - observer.pos.y) < 4.2;
  const runner = sim.slot('RB');
  const arriving = runner && sim.see(observer, runner).pos.x > sim.los - 2.8;
  if (!filling && !arriving) return;

  // The defender's slant can change who stays and who climbs. Require the
  // remaining blocker to have his body on the drive side before transferring.
  const drive = e.drive ?? { x: 1, y: 0 };
  const axis = { x: -drive.x, y: -drive.y };
  const lat = { x: -axis.y, y: axis.x };
  const candidates = combo.members.map((climber) => {
    const keeper = combo.members.find((b) => b !== climber)!;
    const bd = norm(sub(keeper.pos, combo.defender.pos));
    const phi = Math.atan2(-(bd.x * lat.x + bd.y * lat.y), bd.x * axis.x + bd.y * axis.y) / (Math.PI / 2);
    const cost = Math.hypot(backer.pos.x - climber.pos.x, backer.pos.y - climber.pos.y) + (climber === e.blocker ? 0.30 : 0);
    return { climber, keeper, phi, cost };
  }).filter((c) => Math.abs(c.phi) < 0.65 && !c.keeper.isDown(sim.t));
  candidates.sort((a, b) => a.cost - b.cost);
  const choice = candidates[0];
  if (!choice) return;
  const { climber, keeper, phi } = choice;
  if (!(climber.behavior instanceof RunBlocker)) return;
  e.blocker = keeper;
  e.helpers = e.helpers.filter((b) => b !== climber && b !== keeper);
  e.phi = phi;
  climber.engagement = null;
  climber.behavior.plan.kind = 'climb';
  climber.behavior.plan.target = combo.backer;
  combo.released = true;
  climber.tags.add('combo-climb');
  keeper.tags.add('combo-stay');
  sim.event('block_climb', climber, combo.backer, `secured ${combo.defender.slot}; ${keeper.slot} stays`);
}
