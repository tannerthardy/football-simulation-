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
  /** Pursuit samples: [angle to the carrier now, angle to the intercept, lead, closing speed, his speed, distance,
   * carrier speed toward him, carrier speed, contact distance, his speed / top speed]. */
  pursuit: number[][];
}
interface PlayOut {
  game: number; kind: 'run' | 'catch' | 'scramble'; gain: number; afterStart: number; startX: number;
  start: number; end: number; defs: Def[]; brokenAll: number; missedAll: number;
  /** Each whiff and broken hold in order: [t, type, group, origin of the hold or note, engaged, distance,
   * carrier speed, defender speed, holders left after it, pocket QB]. */
  ev: Array<[number, string, string, string, number, number, number, number, number, number]>;
  /** Every whiff after the carrier has the ball, with the tackler's recent history. */
  whiffs: Array<{ t: number; g: string; note: string; engaged: number; hist: number[][] }>;
  /** Every hold taken: how (origin), the carrier's heading toward him (cosA, +1 straight at him), closing speed, and whether it broke. */
  holds: Array<{ hist: number[][]; t: number; d: number; g: string; origin: string; dist: number; cs: number; ds: number; cosA: number; closing: number; broken: boolean }>;
}
const plays: PlayOut[] = [];
/** Whiffs and broken holds before anyone carries beyond the pocket (sack attempts). */
const pre: Record<string, number> = {};
let snaps = 0;
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
  snaps++;
  const tick = sim.tick.bind(sim);
  let start: number | null = null;
  let kind: PlayOut['kind'] | null = null;
  let startX = 0;
  let carrier: Agent | null = null;
  const defs = new Map<Agent, Def>();
  let seen = 0;
  const trail: PlayOut['ev'] = [];
  const holds: PlayOut['holds'] = [];
  const whiffs: PlayOut['whiffs'] = [];
  /** Per defender within 15 yd, the last 60 ticks: [t, distance, arms, closing, his speed, cosA, attempt cooling (1/0), engaged, ...state; see the row]. */
  const ring = new Map<number, number[][]>();
  const origin = new Map<number, string>();
  sim.tick = () => {
    const had = new Set(sim.bond?.holds?.values() ?? []);
    for (const [d, j] of sim.bond?.holds ?? []) origin.set(d.idx, (j as { origin?: string }).origin ?? '');
    tick();
    // Each new hold: who, how, and the approach that produced it.
    if (start !== null) for (const [d, j] of sim.bond?.holds ?? []) {
      if (had.has(j)) continue;
      const c = sim.bond!.carrier;
      const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, dd = Math.hypot(dx, dy) || 1;
      const cs = c.speed;
      const cosA = cs > .5 ? -(c.vel.x * dx + c.vel.y * dy) / (cs * dd) : 0;
      const closing = -((c.vel.x - d.vel.x) * dx + (c.vel.y - d.vel.y) * dy) / dd;
      const hist = (ring.get(d.idx) ?? []).slice(-60);
      holds.push({ hist, t: +(sim.t - start).toFixed(2), d: d.idx, g: group(d.slot), origin: (j as { origin?: string }).origin ?? '', dist: +dd.toFixed(2),
        cs: +cs.toFixed(2), ds: +d.speed.toFixed(2), cosA: +cosA.toFixed(2), closing: +closing.toFixed(2), broken: false });
    }
    const evs = sim.events;
    for (; seen < evs.length; seen++) {
      const ev = evs[seen];
      if (start === null && (ev.type === 'handoff' || ev.type === 'catch' || ev.type === 'pitch_catch')) {
        start = ev.t; kind = ev.type === 'catch' ? 'catch' : 'run';
      }
      const get = (i?: number) => (i === undefined ? null : sim.agents[i]);
      const log = (d: Agent | null, c: Agent | null, note: string) => {
        if (!d || !c) return;
        if (start === null) { pre[`${ev.type} ${group(d.slot)}${c === sim.qb ? ' on QB' : ''}${d.engagement ? ' engaged' : ''}`] = (pre[`${ev.type} ${group(d.slot)}${c === sim.qb ? ' on QB' : ''}${d.engagement ? ' engaged' : ''}`] ?? 0) + 1; return; }
        const pocket = c === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled ? 1 : 0;
        trail.push([+(ev.t - start).toFixed(2), ev.type, group(d.slot), note, d.engagement ? 1 : 0, +Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y).toFixed(2),
          +c.speed.toFixed(2), +d.speed.toFixed(2), sim.bond?.tacklers.length ?? 0, pocket]);
      };
      if (ev.type === 'missed_tackle') {
        log(get(ev.a), get(ev.b), ev.note ?? '');
        const d = get(ev.a);
        if (d && start !== null) whiffs.push({ t: +(ev.t - start).toFixed(2), g: group(d.slot), note: ev.note ?? '', engaged: d.engagement ? 1 : 0,
          hist: (ring.get(d.idx) ?? []).slice(-60) });
      }
      if (ev.type === 'broken_tackle') {
        log(get(ev.b), get(ev.a), origin.get(ev.b ?? -1) ?? '');
        const h = holds.filter((x) => x.d === ev.b && !x.broken).at(-1);
        if (h) h.broken = true;
      }
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
      if (dist < 15) {
        const cs = c.speed, arms = c.profile.radius + d.profile.radius + d.profile.reach;
        const iv = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 };
        const r2 = (v: number) => +v.toFixed(2);
        const row = [+(sim.t - start).toFixed(2), +dist.toFixed(2), +arms.toFixed(2),
          +(-((c.vel.x - d.vel.x) * dx + (c.vel.y - d.vel.y) * dy) / (dist || 1)).toFixed(2), +d.speed.toFixed(2),
          +(cs > .5 ? -(c.vel.x * dx + c.vel.y * dy) / (cs * (dist || 1)) : 0).toFixed(2), sim.t < d.nextTackleAt ? 1 : 0, d.engagement ? 1 : 0,
          // 8..: carrier and tackler state, his requested velocity, top speed, acceleration time constant,
          // body-to-body (form) distance, on the ground
          r2(c.pos.x), r2(c.pos.y), r2(c.vel.x), r2(c.vel.y), r2(d.pos.x), r2(d.pos.y), r2(d.vel.x), r2(d.vel.y),
          r2(iv.x), r2(iv.y), r2(d.profile.vmax * d.speedScale), r2(d.profile.tau),
          r2(c.profile.radius + d.profile.radius + d.profile.reach * .35), d.isDown(sim.t) ? 1 : 0];
        const list = ring.get(d.idx) ?? [];
        list.push(row);
        if (list.length > 60) list.shift();
        ring.set(d.idx, list);
      }
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
        // The carrier's speed toward this pursuer (+: coming at him), his
        // speed, and the near-hip contact distance chase() uses.
        const incoming = -(c.vel.x * dx + c.vel.y * dy) / (dist || 1);
        const contact = d.profile.radius + c.profile.radius + d.profile.reach * .65;
        r.pursuit.push([+aNow.toFixed(3), +aInt.toFixed(3), Number.isFinite(lead) ? +lead.toFixed(2) : NaN, +closing.toFixed(2), +sp.toFixed(2), +dist.toFixed(2),
          +incoming.toFixed(2), +Math.hypot(c.vel.x, c.vel.y).toFixed(2), +contact.toFixed(2), +(sp / (d.profile.vmax * d.speedScale)).toFixed(2)]);
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
        defs: [...defs.values()], brokenAll: sim.stats.brokenTackles, missedAll: sim.stats.missedTackles, ev: trail, holds, whiffs });
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
writeFileSync(OUT.replace(/\.jsonl$/, '.pre.json'), JSON.stringify({ snaps, pre }) + '\n');
