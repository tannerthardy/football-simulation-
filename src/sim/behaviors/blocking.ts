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
      const set = isOL(a) ? { x: sim.los - 0.6 - depth, y: home + (isT ? out * 0.8 : 0) } : { x: qb.pos.x + 1.2, y: qb.pos.y + Math.sign(home - qb.pos.y || 1) * 1.4 };
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
    const setDepth = (isT ? 0.8 + (2.0 + width) * clamp(sim.t / 0.9, 0, 1) : 0.6 + 0.7 * clamp(sim.t / 0.6, 0, 1)) * (edgeRusher ? 1 : 0.7);
    // Anticipate the rusher's path a beat ahead (better feet read it sooner).
    const lead = 0.15 + 0.2 * traits(a).feet;
    const rp = { x: r.pos.x + r.vel.x * lead, y: r.pos.y + r.vel.y * lead };
    const toQBp = norm(sub(qb.pos, rp));
    let along = contact * 0.85;
    if (toQBp.x < -0.2) along = Math.max(along, (sim.los - setDepth - rp.x) / toQBp.x);
    let set = { x: rp.x + toQBp.x * along, y: rp.y + toQBp.y * along + out * overset };
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

// ------------------------------------------------------------- run blocking

export type RunBlockKind = 'drive' | 'reach' | 'down' | 'combo' | 'climb' | 'pull' | 'cutoff' | 'lead' | 'stalk' | 'draw';

export interface RunBlockPlan {
  kind: RunBlockKind;
  target: Agent | null;
  climbTo?: Agent | null;
  drive: Vec2;
  releaseAt?: number;
  pullPath?: Vec2[];
  /** Pullers: 'kick' the end man or 'lead' to a linebacker. */
  pullRole?: 'kick' | 'lead' | 'trap';
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

  const scheme = concept.scheme;
  const zoneLike = scheme === 'insideZone' || scheme === 'outsideZone' || scheme === 'duo' || scheme === 'toss' || scheme === 'draw' || scheme === 'qbDraw';

  if (zoneLike) {
    const pending: Agent[] = [];
    for (const b of line) {
      const cand = dl
        .filter((d) => !claimedDL.has(d))
        .filter((d) => {
          // Covered: a defender head-up or shaded to my playside.
          const off = (d.pos.y - b.pos.y) * ps;
          return off > -0.35 && off < 1.5;
        })
        .sort((p, q) => rel(p) - rel(q));
      const d = cand[0];
      if (d) {
        claimedDL.add(d);
        const reach = scheme === 'outsideZone' || scheme === 'toss';
        plans.set(b, { kind: reach ? 'reach' : 'drive', target: d, drive: up(ps * (reach ? 1.1 : 0.6)) });
      } else pending.push(b);
    }
    for (const b of pending) {
      const i = line.indexOf(b);
      const neighbor = line[i - 1];
      const np = neighbor ? plans.get(neighbor) : undefined;
      if (np?.target && (np.kind === 'drive' || np.kind === 'reach')) {
        plans.set(b, {
          kind: 'combo',
          target: np.target,
          climbTo: lbNear(b.pos.y + ps * 1.5, scheme === 'insideZone'),
          drive: up(ps * 0.5),
          releaseAt: scheme === 'duo' ? 1.05 : 0.75,
        });
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

    // Playside and center: gap-down-backer.
    for (const b of line) {
      if (pullers.has(b)) continue;
      const r = rel(b);
      if (r >= -0.2) {
        const cand = dl
          .filter((d) => !claimedDL.has(d))
          .filter((d) => {
            const off = (d.pos.y - b.pos.y) * ps;
            return off > -2.0 && off < 0.6;
          })
          .sort((p, q) => rel(p) - rel(q));
        // Trap: leave the first DL past the center on the playside for the trapper.
        const d = scheme === 'trap' && b.slot !== 'C' && r > 0 ? undefined : cand[cand.length - 1] ?? cand[0];
        if (d) {
          claimedDL.add(d);
          plans.set(b, { kind: 'down', target: d, drive: up(-ps * 1.0) });
        } else {
          plans.set(b, { kind: 'climb', target: lbNear(b.pos.y - ps * 1.0, true), drive: up(-ps * 0.5) });
        }
      } else {
        // Backside: hinge/cutoff.
        const cand = dl.filter((d) => !claimedDL.has(d)).sort((p, q) => Math.abs(p.pos.y - b.pos.y) - Math.abs(q.pos.y - b.pos.y));
        const d = cand[0] && Math.abs(cand[0].pos.y - b.pos.y) < 2.5 ? cand[0] : null;
        if (d) claimedDL.add(d);
        plans.set(b, { kind: 'cutoff', target: d, drive: up(ps * 0.8) });
      }
    }
    // End man on the line on the playside (kick-out target).
    const emlos = dl.filter((d) => !claimedDL.has(d) && rel(d) > 0).sort((p, q) => rel(q) - rel(p))[0] ?? null;
    const trapTarget = dl.filter((d) => !claimedDL.has(d) && rel(d) > 0).sort((p, q) => rel(p) - rel(q))[0] ?? null;
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
      plans.set(p, { kind: 'pull', pullRole: role, target, drive: role === 'kick' ? norm({ x: 0.3, y: ps }) : role === 'trap' ? norm({ x: 0.4, y: ps }) : up(0), pullPath: pullPath(p) });
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
      const manT = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]?.manTarget === a.slot;
      const score = dd - (manT ? 5 : 0);
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
  private climbed = false;
  private retarget = 0;
  constructor(public plan: RunBlockPlan) {}

  get target(): Agent | null {
    return this.plan.target;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const plan = this.plan;
    const t = sim.t;
    if (a.engagement) {
      // Combo: come off the double team to the linebacker.
      if (plan.kind === 'combo' && !this.climbed && plan.climbTo) {
        const lb = plan.climbTo;
        const lbClose = Math.hypot(lb.pos.x - a.pos.x, lb.pos.y - a.pos.y) < 3.2;
        if ((t >= (plan.releaseAt ?? 0.8) || lbClose) && a.engagement.blocker !== a) {
          const e = a.engagement;
          e.helpers = e.helpers.filter((h) => h !== a);
          a.engagement = null;
          this.climbed = true;
          plan.target = lb;
          plan.kind = 'climb';
        }
      }
      return stand();
    }
    if (plan.kind === 'draw' && t < 0.75) {
      return goTo(a, { x: sim.los - 1.2, y: a.pos.y }, { speed: 0.6, facing: 0 });
    }

    let target = plan.target;
    if (!target || target.isDown(t) || (target.engagement && target.engagement.blocker !== a && !target.engagement.helpers.includes(a) && plan.kind !== 'combo')) {
      if (t >= this.retarget) {
        this.retarget = t + 0.25;
        plan.target = target = this.findWork(a, sim);
      }
    }
    if (plan.kind === 'pull' && plan.pullPath && this.pullIdx < plan.pullPath.length) {
      const wp = plan.pullPath[this.pullIdx];
      if (Math.hypot(wp.x - a.pos.x, wp.y - a.pos.y) < 1.0) this.pullIdx++;
      else {
        // Engage early if the target crosses the path.
        if (target && Math.hypot(target.pos.x - a.pos.x, target.pos.y - a.pos.y) < 1.4) return this.attack(a, sim, target);
        return runThrough(a, wp, { speed: 0.95 });
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
    const contact = a.profile.radius + target.profile.radius + 0.25;
    if (dd < contact) {
      sim.engage(a, target, 'run', plan.drive);
      return stand();
    }
    // Aiming point: reach blocks work to the playside shoulder.
    let aim = target.pos;
    if (plan.kind === 'reach' || plan.kind === 'cutoff') aim = { x: target.pos.x - 0.3, y: target.pos.y + plan.drive.y * 0.6 };
    else if (plan.kind === 'down') aim = { x: target.pos.x - 0.2, y: target.pos.y - plan.drive.y * 0.4 };
    else if (plan.kind === 'climb' || plan.kind === 'lead') {
      const v = target.vel;
      aim = { x: target.pos.x + v.x * 0.35, y: target.pos.y + v.y * 0.35 };
    }
    aim = { x: aim.x, y: clamp(aim.y, 0.5, FIELD_WIDTH - 0.5) };
    return runThrough(a, aim, { speed: 1 });
  }

  private findWork(a: Agent, sim: PlaySim): Agent | null {
    const c = sim.carrier;
    const ref = c && c.team === a.team ? c.pos : { x: sim.los, y: sim.ballY };
    let best: Agent | null = null;
    let bs = Infinity;
    for (const d of sim.defense) {
      if (d.engagement || d.isDown(sim.t)) continue;
      const toMe = Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y);
      if (toMe > 6) continue;
      const toBall = Math.hypot(d.pos.x - ref.x, d.pos.y - ref.y);
      const s = toMe + 0.5 * toBall;
      if (s < bs) {
        bs = s;
        best = d;
      }
    }
    return best;
  }
}
