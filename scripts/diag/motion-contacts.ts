/**
 * Pre-snap motion contact count (film review 2026-10-23, brief 1).
 *
 *   node --import tsx scripts/diag/motion-contacts.ts [seed] [--games N] [--motion 0]
 *
 * For every play with a planned motion it reports, by motion kind:
 *  - plan:  the planned path passes within body reach (sum of radii) of a set
 *           teammate's installed spot (a planner defect);
 *  - body:  the motion man actually touched a teammate before the snap
 *           (World contact records with positive impulse, t < 0).
 * Also counts every offensive teammate-teammate pre-snap contact as a control
 * (with --motion 0 there is no motion, so that count must be zero).
 */
import { Rng } from '../../src/core/rng.js';
import type { Vec2 } from '../../src/core/vec.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { World } from '../../src/physics/world.js';
import { MotionRuntime, type MotionPlan } from '../../src/sim/motion.js';
import { PlaySim } from '../../src/sim/playsim.js';

const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const seed = Number(args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--')) ?? 7);
const games = Number(flag('--games') ?? 1);
if (flag('--motion') !== undefined) process.env.MOTION = flag('--motion');

type Row = { plays: number; plan: number; body: number; contacts: number; partners: Record<string, number>;
  seconds: number[]; snapLateral: number[]; snapDepth: number[]; snapSpeed: number[] };
const rows: Record<string, Row> = {};
let offPairs = 0, presnapPlays = 0;
let current: { sim: PlaySim; plan: MotionPlan; touched: Set<string>; row: Row } | null = null;
const examples: string[] = [];

/** Closest approach of a polyline to a point. */
function clearance(path: Vec2[], p: Vec2): number {
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1e-9;
    const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    best = Math.min(best, Math.hypot(a.x + u * dx - p.x, a.y + u * dy - p.y));
  }
  return best;
}

const motionStep = MotionRuntime.prototype.step;
MotionRuntime.prototype.step = function (this: MotionRuntime, sim: any, intents) {
  if (!current || current.sim !== sim) {
    const plan = this.plan, man = sim.slot(plan.slot)!;
    const row = rows[plan.kind] ??= { plays: 0, plan: 0, body: 0, contacts: 0, partners: {}, seconds: [], snapLateral: [], snapDepth: [], snapSpeed: [] };
    row.plays++;
    row.seconds.push(plan.seconds);
    const path = [{ ...man.pos }, ...plan.legs.map(l => l.to)];
    if (plan.live) path[path.length - 1] = plan.snapPos;
    const blocked = (sim.offense as any[]).filter(o => o !== man && clearance(path, o.pos) < o.profile.radius + man.profile.radius);
    if (blocked.length) row.plan++;
    current = { sim, plan, touched: new Set(), row };
  }
  return motionStep.call(this, sim, intents);
};

// Where the motion man is at the snap: COV-4 reads jets by their snap timing.
const finish = MotionRuntime.prototype.finish;
MotionRuntime.prototype.finish = function (this: MotionRuntime, sim: any) {
  const man = sim.slot(this.plan.slot), row = rows[this.plan.kind];
  if (man && row && current?.sim === sim) {
    row.snapLateral.push(Math.abs(man.pos.y - sim.ballY)); row.snapDepth.push(sim.los - man.pos.x);
    row.snapSpeed.push(Math.hypot(man.vel.x, man.vel.y));
  }
  return finish.call(this, sim);
};

const worldStep = World.prototype.step;
World.prototype.step = function (this: World, intents, dt) {
  const report = worldStep.call(this, intents, dt);
  if (this.time < 0 && staging && staging.world === this) {
    const sim = staging, motion = current && current.sim === sim ? current : null;
    const man = motion ? sim.slot(motion.plan.slot)! : undefined;
    for (const c of report.contacts) {
      if (!(c.impulse > 0)) continue;
      const a = sim.agents[c.i], b = sim.agents[c.j];
      if (a.team !== 'O' || b.team !== 'O') continue;
      offPairs++;
      if (!motion) continue;
      const current = motion;
      const other = a === man ? b : b === man ? a : null;
      if (!other) continue;
      current.row.contacts++;
      if (!current.touched.has(other.slot)) {
        current.touched.add(other.slot);
        current.row.partners[other.slot] = (current.row.partners[other.slot] ?? 0) + 1;
        if (current.touched.size === 1) {
          current.row.body++;
          if (examples.length < 12) examples.push(`${current.plan.kind} ${current.plan.slot}->${other.slot} t=${this.time.toFixed(2)} start ${-current.plan.seconds.toFixed(2)} man (${(man!.pos.x - sim.los).toFixed(2)},${(man!.pos.y - sim.ballY).toFixed(2)}) v ${Math.hypot(man!.vel.x, man!.vel.y).toFixed(2)} other (${(other.pos.x - sim.los).toFixed(2)},${(other.pos.y - sim.ballY).toFixed(2)}) v ${Math.hypot(other.vel.x, other.vel.y).toFixed(2)} set (${(current.plan.snapPos.x - sim.los).toFixed(2)},${(current.plan.snapPos.y - sim.ballY).toFixed(2)}) ${sim.offCall.formation.id} ${sim.offCall.label}`);
        }
      }
    }
  }
  return report;
};

// Every play's pre-snap phase, so motionless plays count in the control too.
let staging: PlaySim | null = null;
/** Motions called by the play-caller, and those the planner found no room for. */
const calls: Record<string, { called: number; dropped: number }> = {};
const stageDefense = (PlaySim.prototype as any).stageDefense;
(PlaySim.prototype as any).stageDefense = function (this: PlaySim, ...rest: unknown[]) {
  staging = this; presnapPlays++;
  const called = this.offCall.motion;
  if (called) { const c = calls[called.kind] ??= { called: 0, dropped: 0 }; c.called++; if (!this.motion) c.dropped++; }
  return stageDefense.apply(this, rest);
};

let totalPlays = 0, illegalMotion = 0;
for (let g = 0; g < games; g++) {
  const s = seed + g, rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const game = simulateGame(home, away, { seed: s });
  totalPlays += game.log.filter(p => p.kind === 'run' || p.kind === 'pass').length;
  illegalMotion += game.log.filter(p => /illegal motion/i.test(p.text)).length;
}

console.log(`games ${games} from seed ${seed}, MOTION=${process.env.MOTION ?? '(default on)'}, scrimmage plays ${totalPlays}`);
console.log('kind      plays  plan-through-teammate  touched-teammate  contact-ticks  partners');
for (const [kind, r] of Object.entries(rows))
  console.log(`${kind.padEnd(9)} ${String(r.plays).padStart(5)}  ${String(r.plan).padStart(21)}  ${String(r.body).padStart(16)}  ${String(r.contacts).padStart(13)}  ${JSON.stringify(r.partners)}`);
const med = (xs: number[]) => { const v = [...xs].sort((a, b) => a - b); return v.length ? v[v.length >> 1].toFixed(2) : '-'; };
console.log('kind      median: motion s  snap lateral  snap depth  snap speed');
for (const [kind, r] of Object.entries(rows))
  console.log(`${kind.padEnd(9)} ${med(r.seconds).padStart(16)}  ${med(r.snapLateral).padStart(12)}  ${med(r.snapDepth).padStart(10)}  ${med(r.snapSpeed).padStart(10)}`);
console.log(`offense-offense pre-snap contact ticks, any player, ${presnapPlays} snaps: ${offPairs}`);
console.log(`illegal motion flags in the log: ${illegalMotion}`);
console.log(`called (dropped by planner): ${Object.entries(calls).map(([k, c]) => `${k} ${c.called} (${c.dropped})`).join(', ')}`);
for (const e of examples) console.log('  ' + e);
