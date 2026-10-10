/**
 * Ball-carrier vision.
 *
 * Every ~0.1 s the carrier samples candidate headings. For each heading he
 * projects his own sprint along it and asks, at each look-ahead step, whether
 * any defender he *perceives* (delayed, filtered by vision range) could get
 * there first (time-to-reach, with extra time for defenders tied up in
 * blocks). The heading that buys the most yards before contact — with a bonus
 * for clean open-field lanes and a cost for sharp cuts — wins. Vision rating
 * controls how far he sees, how much backside pursuit he notices, and how
 * noisy his evaluation is. Before the line, designed runs press the aiming
 * point for a patience-dependent window.
 */
import { FIELD_WIDTH, OPP_GOAL_X, OWN_GOAL_X } from '../../core/field.js';
import { angleDiff, angleOf, clamp, type Vec2 } from '../../core/vec.js';
import type { MoveCommand } from '../../physics/kinematics.js';
import { sprintTime, timeToReach } from '../../physics/reach.js';
import { squeezeForGap } from '../../physics/bodyshape.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import type { RunScheme } from '../../playbook/types.js';
import { RunBlocker } from './blocking.js';
import { contactCost } from '../contact-choice.js';

export interface CarrierOptions {
  /** Designed aiming point (run concept) and how long to honor it. */
  aim?: Vec2;
  aimUntil?: number;
  /** QB scramble: may slide. */
  qb?: boolean;
  /** Known lead/pull responsibilities on a designed run. */
  follow?: Agent[];
  run?: { scheme:RunScheme; side:number; readKey?:Agent; kick?:Agent };
}

/** Read the current surface, rather than a two-second forecast through it.
 * Entry points are between moving blockers, or outside a kick/log. */
export function runReadAim(a: Agent, sim: PlaySim, opts: CarrierOptions): Vec2 | null {
  if (!opts.run || !opts.aim) return null;
  const side=opts.run.side;
  const surface=sim.offense.filter((b)=>['LT','LG','C','RG','RT'].includes(b.slot)||sim.offAlign.spots[b.slot]?.inline)
    .map((b)=>({...sim.see(a,b),radius:b.profile.radius})).sort((p,q)=>p.pos.y-q.pos.y);
  if (surface.length<5) return null;
  let preferred=opts.aim.y;
  if (opts.run.scheme === 'duo' && opts.run.readKey) {
    const key=sim.see(a,opts.run.readKey);
    // Press the inside double. A declaring MIKE closes his insertion side;
    // the back bends to the other adjacent interior crease.
    if (key.pos.x<sim.los+2.5 && Math.abs(key.vel.y)>.7) preferred=sim.ballY-Math.sign(key.vel.y)*.8;
  }
  const kick=opts.run.kick;
  if (kick) {
    const s=sim.see(a,kick);
    if (s.pos.x>sim.los-1.5) preferred=s.pos.y+(kick.tags.has('block-log') ? side*.85 : -side*.85);
  }
  const candidates:Vec2[]=[];
  for(let i=1;i<surface.length;i++) {
    const l=surface[i-1],r=surface[i];
    const width=r.pos.y-r.radius-l.pos.y-l.radius;
    if(width>a.profile.radius*1.4) candidates.push({x:Math.max(sim.los+.5,(l.pos.x+r.pos.x)/2+.6),y:(l.pos.y+r.pos.y)/2});
  }
  for(const end of [surface[0],surface.at(-1)!]) candidates.push({x:Math.max(sim.los+.5,end.pos.x+.5),y:end.pos.y+Math.sign(end.pos.y-sim.ballY)*(end.radius+a.profile.radius+.4)});
  let best:Vec2|null=null,cost=Infinity;
  for(const p of candidates) {
    let risk=0;
    for(const d of sim.opponents(a)) {
      if(d.isDown(sim.t)) continue;
      const s=sim.see(a,d);
      if(Math.hypot(s.pos.x-p.x,s.pos.y-p.y)>6) continue;
      // Visible block posture buys time, not knowledge of a future block win.
      const tied=d.engagement ? .25 : 0;
      const reach=timeToReach({...s,profile:d.profile,speedScale:d.speedScale},p,d.profile.radius+a.profile.radius)+tied;
      const arrive=Math.hypot(p.x-a.pos.x,p.y-a.pos.y)/Math.max(2,a.speed);
      risk+=Math.max(0,arrive-reach)*3;
    }
    const score=Math.abs(p.y-preferred)*.65+Math.abs(p.y-a.pos.y)*.12+risk;
    if(score<cost) {cost=score;best=p;}
  }
  return best;
}

const SAMPLES = [0.25, 0.5, 0.75, 1.0, 1.3, 1.6, 2.0];

export class BallCarrier implements Behavior {
  readonly kind = 'carrier';
  private heading: number | null = null;
  private nextEval = 0;
  private visionNoise: number;
  private plannedExit = false;
  private boundaryRecovery = false;

  constructor(
    private readonly opts: CarrierOptions = {},
    a?: Agent,
  ) {
    this.visionNoise = a ? 1 - a.r('vision') : 0.5;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const dir = sim.attackDir(a.team);
    const cutSkill = 0.85 + 0.35 * a.r('elusiveness');

    // Designed phase: press the aiming point.
    if (this.opts.aim && this.opts.aimUntil !== undefined && sim.t < this.opts.aimUntil && (a.pos.x - sim.los) * dir < -0.8) {
      const aim = this.opts.aim;
      const h = angleOf({ x: aim.x - a.pos.x, y: aim.y - a.pos.y });
      this.heading = h;
      // Only abandon the design early if the aiming point is clearly closed.
      if (sim.t >= this.nextEval) {
        this.nextEval = sim.t + 0.1;
        const best = this.evaluate(a, sim, dir, true);
        if (best && best.aimBlocked && best.score > best.aimScore + 0.5 + 0.5 * a.r('patience')) this.opts.aimUntil = sim.t;
      }
      const lead = this.opts.follow?.filter((b) => !b.isDown(sim.t) && !b.engagement)
        .sort((p, q) => Math.hypot(p.pos.x - aim.x, p.pos.y - aim.y) - Math.hypot(q.pos.x - aim.x, q.pos.y - aim.y))[0];
      if (lead) {
        const seen = sim.see(a, lead);
        const dx = seen.pos.x - a.pos.x;
        const dy = seen.pos.y - a.pos.y;
        const ahead = dx * Math.cos(h) + dy * Math.sin(h);
        const across = -dx * Math.sin(h) + dy * Math.cos(h);
        const entering = seen.pos.x < sim.los && ahead > 0 && ahead < 2.5 && Math.abs(across) < 2.2;
        // Patience ends when an unblocked defender can close before the next
        // two reads. Waiting for a late puller must not become a mandatory stop.
        const closing = entering && sim.opponents(a).some((d) => {
          if (d.isDown(sim.t) || d.engagement) return false;
          const threat = sim.see(a, d);
          return timeToReach({ ...threat, profile: d.profile, speedScale: d.speedScale }, a.pos,
            a.profile.radius + d.profile.radius + d.profile.reach * 0.75) < 2 * a.mind.decisionInterval;
        });
        if (entering && !closing && sim.t < this.opts.aimUntil) {
          // Pace the lead block instead of outrunning a guard who is still
          // turning up through the hole. This only lasts through the read phase.
          a.tags.add('paced-lead');
          // Keep pressing the designed side. Following the guard's current
          // lateral position while he is flat-pulling sends the back into
          // the vacated backside gap.
          return this.command(a, sim, h, a.profile.vmax * (0.28 + 0.12 * (1 - a.r('patience'))), cutSkill);
        }
      }
      // Press the hole under control (patient backs more so), then burst.
      const press = a.profile.vmax * (0.62 + 0.18 * (1 - a.r('patience')));
      return this.command(a, sim, h, press, cutSkill);
    }

    // QB slide: past the sticks (or any gain) with a hit coming.
    if (this.opts.qb && sim.isPass && (a.pos.x - sim.los) * dir > 1) {
      const threat = Math.min(...sim.opponents(a).map((d) => (d.isDown(sim.t) ? 9 : timeToReach({ pos: d.pos, vel: d.vel, profile: d.profile, speedScale: d.speedScale }, a.pos, 1.0))));
      if (threat < 0.35 && !sim.bond) {
        sim.event('slide', a);
        sim.finishCarry('slide', a.pos);
        return { vel: { x: 0, y: 0 } };
      }
    }

    if (sim.t >= this.nextEval || this.heading === null) {
      this.nextEval = sim.t + 0.1;
      const entry = a.pos.x < sim.los+.3 && a.pos.x > sim.los-4 ? runReadAim(a,sim,this.opts) : null;
      const best = entry ? null : this.evaluate(a, sim, dir, false);
      if(entry) { this.heading=angleOf({x:entry.x-a.pos.x,y:entry.y-a.pos.y}); a.tags.add('run-crease-read'); }
      else if (best) { this.heading = best.heading; this.plannedExit = best.exits; }
      else if (this.heading === null) this.heading = dir > 0 ? 0 : Math.PI;
    }
    const h = this.heading!;
    return this.command(a, sim, h, a.profile.vmax, cutSkill);
  }

  private command(a: Agent, sim: PlaySim, h: number, speed: number, cutSkill: number): MoveCommand {
    const bodies = sim.agents.filter((o) => o !== a && !o.isDown(sim.t)).map((o) => ({ pos: sim.see(a, o).pos, radius: o.profile.radius }));
    const squeeze = sim.bond ? 0 : squeezeForGap(a.pos, h, a.profile.radius, bodies) * (0.65 + 0.35 * a.r('elusiveness'));
    if (squeeze > 0.3 && !a.tags.has('squeezed')) {
      a.tags.add('squeezed');
      sim.event('squeeze', a, null, 'turn shoulders through a narrow opening');
    }
    const vel = { x: Math.cos(h) * speed, y: Math.sin(h) * speed };
    if (this.plannedExit) this.boundaryRecovery = false;
    else {
      const inward = a.pos.y < FIELD_WIDTH / 2 ? 1 : -1;
      const distance = Math.min(a.pos.y, FIELD_WIDTH - a.pos.y);
      const outward = Math.max(0, -a.vel.y * inward);
      const stopping = outward * outward / (2 * a.profile.lateral * cutSkill * 0.7) + outward * sim.dt;
      // Lane hysteresis must not drift across the boundary while intending
      // to stay in bounds. Recover before lateral momentum consumes the room;
      // the integrator still decides whether he can physically save it.
      if (a.vel.y * inward >= 0) this.boundaryRecovery = false;
      if (distance < stopping + 0.35 && vel.y * inward < 1) this.boundaryRecovery = true;
      if (this.boundaryRecovery) {
        // Finish cancelling outward momentum before choosing a new lane. A
        // shrinking stopping estimate must not alternate braking and another
        // sprint toward the boundary. Asking for more downfield acceleration
        // at the same time also spends traction needed for this redirect.
        vel.x = a.vel.x;
        vel.y = inward * Math.max(1, outward);
      }
    }
    return { vel, cutSkill, squeeze };
  }

  private evaluate(a: Agent, sim: PlaySim, dir: number, designed: boolean): { heading: number; score: number; blocked: boolean; aimBlocked: boolean; aimScore: number; exits: boolean } | null {
    const vision = a.r('vision');
    const range = 7 + 22 * vision;
    const p = a.pos;
    const speed = a.speed;
    const cur = speed > 0.8 ? angleOf(a.vel) : dir > 0 ? 0 : Math.PI;
    const base = dir > 0 ? 0 : Math.PI;
    const goalX = dir > 0 ? OPP_GOAL_X : OWN_GOAL_X;
    const hurry = sim.hurry && a.team === 'O';

    // Perceived defenders (vision-filtered).
    const threats: Array<{ pos: Vec2; vel: Vec2; d: Agent; extra: number }> = [];
    const blockers = sim.teammates(a).filter((b) => b !== a && !b.isDown(sim.t) && Math.hypot(b.pos.x - p.x, b.pos.y - p.y) < 12).map((b) => ({ ...sim.see(a, b), radius: b.profile.radius }));
    for (const d of sim.opponents(a)) {
      const dd = Math.hypot(d.pos.x - p.x, d.pos.y - p.y);
      if (dd > range) continue;
      // Backside defenders behind the runner are easy to miss for poor-vision backs.
      const behind = (d.pos.x - p.x) * dir < -1.5;
      if (behind && a.mind.focus < 0.35 + 0.5 * (1 - vision)) continue;
      const seen = sim.see(a, d, 0.7);
      let extra = 0;
      if (d.isDown(sim.t)) extra += d.downUntil - sim.t + 0.2;
      if (d.engagement) extra += d.engagement.win > 0.6 ? 0.25 : 0.7;
      threats.push({ pos: seen.pos, vel: seen.vel, d, extra });
    }

    const cands: number[] = [];
    const spread = designed ? 0.9 : 1.55;
    for (let k = -8; k <= 8; k++) cands.push(base + (k / 8) * spread);
    cands.push(cur);
    const aimHeading = this.opts.aim ? angleOfPoint(p, this.opts.aim) : base;
    if (designed) cands.push(aimHeading);

    let best: { heading: number; score: number; blocked: boolean; exits: boolean } | null = null;
    let curScore = -Infinity;
    let curBlocked = false;
    let curExits = false;
    let aimBlocked = false;
    let aimScore = -Infinity;
    const vmax = a.profile.vmax;
    const tau = a.profile.tau;
    for (const h of cands) {
      const turn = Math.abs(angleDiff(cur, h));
      const s0 = speed * Math.max(0.25, Math.cos(Math.min(turn, Math.PI / 2)));
      const hx = Math.cos(h);
      const hy = Math.sin(h);
      let safeGain = 0;
      let clean = true;
      let lastQ = p;
      let exits = false;
      let impactCost = 0;
      let contactGain: number | null = null;
      for (const t of SAMPLES) {
        const d = vmax * t - (vmax - s0) * tau * (1 - Math.exp(-t / tau));
        let q = { x: p.x + hx * d, y: p.y + hy * d };
        let arrival = t;
        const crosses = q.y < 0 || q.y > FIELD_WIDTH;
        if (crosses) {
          // An exit is a terminal option. Clip the forecast at the boundary
          // and still check whether a defender/blocker can stop him first.
          const edge = q.y < 0 ? 0 : FIELD_WIDTH;
          const distance = (edge - p.y) / hy;
          q = { x: p.x + hx * distance, y: edge };
          arrival = sprintTime(distance, s0, vmax, tau);
        }
        // A lane through our own blocker is not open. Allow the minimum
        // shoulder-turned footprint, then request posture on approach.
        const segment = { x: q.x - lastQ.x, y: q.y - lastQ.y };
        const segment2 = segment.x * segment.x + segment.y * segment.y;
        const obstructed = blockers.some((b) => {
          const horizon = Math.min(arrival, 0.6);
          const bx = b.pos.x + b.vel.x * horizon;
          const by = b.pos.y + b.vel.y * horizon;
          const u = clamp(((bx - lastQ.x) * segment.x + (by - lastQ.y) * segment.y) / Math.max(1e-6, segment2), 0, 1);
          return Math.hypot(bx - lastQ.x - u * segment.x, by - lastQ.y - u * segment.y) < b.radius + a.profile.radius * 0.70;
        });
        if (obstructed) {
          clean = false;
          break;
        }
        let minMargin = Infinity;
        for (const th of threats) {
          // Respect the tackler's arms: his reach plus a lunge.
          const tt = timeToReach({ pos: th.pos, vel: th.vel, profile: th.d.profile, speedScale: th.d.speedScale }, q, a.profile.radius + th.d.profile.radius + th.d.profile.reach * 0.75) + th.extra;
          const m = tt - arrival;
          if (m < minMargin) {
            minMargin = m;
            if (m < 0) {
              const runnerSpeed = vmax - (vmax - s0) * Math.exp(-arrival / tau);
              impactCost = contactCost(a.profile.massKg, th.d.profile.massKg,
                Math.hypot(hx * runnerSpeed - th.vel.x, hy * runnerSpeed - th.vel.y), a.r('toughness'), a.r('ballSecurity'));
            }
          }
        }
        if (minMargin < 0) {
          clean = false;
          contactGain = (q.x - p.x) * dir;
          break;
        }
        lastQ = q;
        safeGain = (q.x - p.x) * dir;
        if (crosses) { exits = true; break; }
        if ((q.x - goalX) * dir >= 0) break;
      }
      let score = safeGain;
      if (clean && !exits) score += 3 + 0.4 * safeGain;
      // Near the boundary, weigh a costly hit against the few extra yards it
      // buys. An unobstructed field lane still wins over giving up free yards.
      if (!designed && Math.min(p.y, FIELD_WIDTH - p.y) < 5 && !clean) score -= impactCost;
      if (!designed && a.team === 'O') {
        const needed = (sim.firstDownX - p.x) * dir;
        const payoff = sim.snapContext.down >= 3 ? 5 : 2;
        if (needed > 0 && safeGain >= needed) score += payoff;
        // At the sticks, a runner may fight through an imminent hit rather
        // than leave short. This is decision utility, not awarded yardage.
        else if (needed > 0 && contactGain !== null) score += payoff * clamp(1 - Math.abs(needed - contactGain), 0, 1);
      }
      const toGoal = (goalX - p.x) * dir;
      if (safeGain >= toGoal) score += 10;
      else if (contactGain !== null) score += 10 * clamp(1 - Math.abs(toGoal - contactGain), 0, 1);
      // Cutting costs speed; prefer smooth paths.
      score -= turn * 1.2;
      // Lateral movement without gain is worth little; going backwards is bad.
      const lat = Math.abs(lastQ.y - p.y);
      score -= (lastQ.x - p.x) * dir < 0 ? 2 + lat * 0.2 : 0;
      if (designed && this.opts.aim) score -= Math.abs(angleDiff(angleOf({ x: this.opts.aim.x - p.x, y: this.opts.aim.y - p.y }), h)) * 2.5;
      if (hurry) {
        const toSide = hy > 0 ? FIELD_WIDTH - p.y : p.y;
        if (Math.abs(hy) > 0.5 && toSide < 12) score += 2.5;
      }
      score += Math.sin(h - base) * a.mind.placementError * (0.15 + 1.4 * this.visionNoise);
      const blocked = !clean && safeGain < 1.5;
      if (h === aimHeading) { aimBlocked = blocked; aimScore = score; }
      if (h === cur) {
        curScore = score;
        curBlocked = blocked;
        curExits = exits;
      }
      if (!best || score > best.score) best = { heading: h, score, blocked, exits };
    }
    // Hysteresis: keep the current lane unless the new one is clearly better.
    if (best && best.heading !== cur && best.score - curScore < 0.4) best = { heading: cur, score: curScore, blocked: curBlocked, exits: curExits };
    if (best?.exits) a.tags.add('chose-sideline');
    return best ? { heading: clampHeading(best.heading, dir), score: best.score, blocked: best.blocked, aimBlocked, aimScore, exits: best.exits } : null;
  }
}

function angleOfPoint(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function clampHeading(h: number, dir: number): number {
  // Never run straight backwards; allow up to ~100° off the attack direction.
  const base = dir > 0 ? 0 : Math.PI;
  const off = angleDiff(base, h);
  return base + clamp(off, -1.75, 1.75);
}
