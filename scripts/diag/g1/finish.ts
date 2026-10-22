/** Who should have finished the play, and why he didn't (observation only;
 * flags from the environment). Real games over the scorecard's leagues
 * (scripts/scorecard/records.ts conventions are not needed: plain seeded
 * teams); each snap's ticks are observed in place, nothing is changed.
 *
 * From the moment a ball carrier has the ball beyond the pocket (a handoff,
 * a catch, a pitch, or a scrambling QB) to the whistle, per defender:
 *   closest approach to the carrier, and when
 *   tackle attempts from the play events: whiff (missed_tackle), wrap
 *   (tackle_wrap), broken (broken_tackle), the final tackle
 *   pursuit: while 2-10 yd from the carrier and moving at 2+ yd/s, the
 *   angle between his velocity and the line to the carrier now, and to the
 *   constant-velocity intercept at his own speed; lead = how far his heading
 *   sits from "now" toward "intercept" (0 aims at the carrier, 1 leads him)
 *
 *   node --import tsx scripts/diag/g1/finish.ts [--games 12] [--seed 7] [--out out/g1/finish.jsonl]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { Agent } from '../../../src/sim/agent.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const GAMES = Number(arg('games', '12'));
const SEED = Number(arg('seed', '7'));
const OUT = arg('out', 'out/g1/finish.jsonl');

const group = (slot: string) => /^(DE|DT|NT)/.test(slot) ? 'DL' : /^LB/.test(slot) ? 'LB' : /^(CB|NB|DB)/.test(slot) ? 'CB' : /^(FS|SS|S)/.test(slot) ? 'S' : slot;

interface Def {
  slot: string; group: string; closest: number; closestT: number; firstReachT: number | null;
  whiffs: number; wraps: number; broken: number; tackled: boolean;
  /** Pursuit samples: [angle to the carrier now, angle to the intercept, lead, closing speed, his speed, distance]. */
  pursuit: number[][];
}
interface PlayOut {
  game: number; kind: 'run' | 'catch' | 'scramble'; gain: number; afterStart: number; startX: number;
  start: number; end: number; defs: Def[]; brokenAll: number; missedAll: number;
}
const plays: PlayOut[] = [];
const ang = (ax: number, ay: number, bx: number, by: number) => {
  const d = Math.atan2(ay, ax) - Math.atan2(by, bx);
  return Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
};

function intercept(d: Agent, c: Agent, speed: number): { x: number; y: number } | null {
  // Smallest t with |c + v t - d| = speed t.
  const rx = c.pos.x - d.pos.x, ry = c.pos.y - d.pos.y;
  const a = c.vel.x ** 2 + c.vel.y ** 2 - speed * speed;
  const b = 2 * (rx * c.vel.x + ry * c.vel.y);
  const k = rx * rx + ry * ry;
  let t: number;
  if (Math.abs(a) < 1e-6) t = b < 0 ? -k / b : -1;
  else {
    const disc = b * b - 4 * a * k;
    if (disc < 0) return null;
    const r1 = (-b - Math.sqrt(disc)) / (2 * a), r2 = (-b + Math.sqrt(disc)) / (2 * a);
    t = Math.min(...[r1, r2].filter((x) => x > 0));
    if (!Number.isFinite(t)) return null;
  }
  if (t <= 0 || t > 6) return null;
  return { x: c.pos.x + c.vel.x * t, y: c.pos.y + c.vel.y * t };
}

function observe(sim: PlaySim, game: number): void {
  const tick = sim.tick.bind(sim);
  let start: number | null = null;
  let kind: PlayOut['kind'] | null = null;
  let startX = 0;
  let carrier: Agent | null = null;
  const defs = new Map<Agent, Def>();
  let seen = 0;
  sim.tick = () => {
    tick();
    const evs = sim.events;
    for (; seen < evs.length; seen++) {
      const ev = evs[seen];
      if (start === null && (ev.type === 'handoff' || ev.type === 'catch' || ev.type === 'pitch_catch')) {
        start = ev.t; kind = ev.type === 'catch' ? 'catch' : 'run';
      }
      const get = (i?: number) => (i === undefined ? null : sim.agents[i]);
      if (ev.type === 'missed_tackle') { const d = get(ev.a); if (d && defs.has(d)) defs.get(d)!.whiffs++; }
      if (ev.type === 'tackle_wrap') { const d = get(ev.a); if (d && defs.has(d)) defs.get(d)!.wraps++; }
      if (ev.type === 'broken_tackle') { const d = get(ev.b); if (d && defs.has(d)) defs.get(d)!.broken++; }
    }
    const c = sim.carrier;
    if (start === null && c && c === sim.qb && sim.scrambled) { start = sim.t; kind = 'scramble'; }
    if (start === null || !c || sim.ball.kind !== 'held' || c.team === 'D') return;
    if (!carrier) {
      carrier = c; startX = c.pos.x;
      for (const d of sim.opponents(c)) defs.set(d, { slot: d.slot, group: group(d.slot), closest: Infinity, closestT: 0, firstReachT: null,
        whiffs: 0, wraps: 0, broken: 0, tackled: false, pursuit: [] });
    }
    if (c !== carrier) return;
    for (const [d, r] of defs) {
      const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, dist = Math.hypot(dx, dy);
      if (dist < r.closest) { r.closest = dist; r.closestT = sim.t - start; }
      const reach = c.profile.radius + d.profile.radius + d.profile.reach;
      if (r.firstReachT === null && dist <= reach) r.firstReachT = sim.t - start;
      const sp = Math.hypot(d.vel.x, d.vel.y);
      if (dist >= 2 && dist <= 10 && sp >= 2 && !d.engagement && !d.isDown(sim.t) && Math.round(sim.t * 20) % 2 === 0) {
        const ip = intercept(d, c, Math.max(sp, d.profile.vmax * 0.9));
        if (!ip) continue;
        const aNow = ang(d.vel.x, d.vel.y, dx, dy);
        const aInt = ang(d.vel.x, d.vel.y, ip.x - d.pos.x, ip.y - d.pos.y);
        const span = ang(dx, dy, ip.x - d.pos.x, ip.y - d.pos.y);
        // Signed lead: where his heading sits between the two bearings.
        const lead = span > 0.05 ? (span ** 2 + aNow ** 2 - aInt ** 2) / (2 * span * span) : NaN;
        const closing = ((d.vel.x - c.vel.x) * dx + (d.vel.y - c.vel.y) * dy) / (dist || 1);
        r.pursuit.push([+aNow.toFixed(3), +aInt.toFixed(3), Number.isFinite(lead) ? +lead.toFixed(2) : NaN, +closing.toFixed(2), +sp.toFixed(2), +dist.toFixed(2)]);
      }
    }
  };
  const res = sim.run.bind(sim);
  sim.run = () => {
    const r = res();
    if (carrier && kind && start !== null) {
      const tackler = sim.events.filter((e) => e.type === 'tackle' || e.type === 'tackle_wrap').at(-1);
      if (tackler?.a !== undefined) { const d = sim.agents[tackler.a]; if (defs.has(d)) defs.get(d)!.tackled = true; }
      const dir = sim.attackDir(carrier.team);
      plays.push({ game, kind, gain: +((carrier.pos.x - sim.los) * dir).toFixed(1), afterStart: +((carrier.pos.x - startX) * dir).toFixed(1),
        startX: +((startX - sim.los) * dir).toFixed(1), start, end: sim.t,
        defs: [...defs.values()], brokenAll: sim.stats.brokenTackles, missedAll: sim.stats.missedTackles });
    }
    return r;
  };
}

const rng = new Rng(SEED);
for (let g = 0; g < GAMES; g++) {
  const home = generateTeam(rng.fork(`h${g}`), 'Home', 'HOM', { strength: 0.55 });
  const away = generateTeam(rng.fork(`a${g}`), 'Away', 'AWY', { strength: 0.55 });
  simulateGame(home, away, { seed: rng.nextU32(), hooks: { playResult: (sim) => { observe(sim, g); return undefined; } } });
  process.stderr.write(`game ${g + 1}/${GAMES}: ${plays.length} carries so far\n`);
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, plays.map((p) => JSON.stringify(p)).join('\n') + '\n');
process.stderr.write(`${plays.length} carries -> ${OUT}\n`);
