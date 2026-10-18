/** Open-field space drill (diagnostic only). The production runner (open-field
 * BallCarrier) at speed meets one production pursuer (chase + tryTackles)
 * set downfield in space; everyone else is removed. Mirrored offsets.
 * Outcome: tackled (and yards from the meeting), or escaped (runner clear and
 * separating with no live grip), plus how the meeting went.
 *
 * node --import tsx scripts/diag/open-field/space.ts [--seeds 6] [--rosters pair11,pair31] [--who FS]
 */
import type { GraspJoint } from '../../../src/physics/world.js';
import { BallCarrier } from '../../../src/sim/behaviors/carrier.js';
import { chase } from '../../../src/sim/behaviors/common.js';
import { makeSim, rosters } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seeds = Number(arg('--seeds', '6')), who = arg('--who', 'FS');
const R = rosters();
const r2 = (x: number) => Math.round(x * 100) / 100;

export function rep(roster: string, cushion: number, lateral: number, speed: number, dSpeed: number, seed: number) {
  const sim = makeSim({ concept: 'iz', dir: 'strong', look: 'over3', roster, seed, formation: 'ace_12' }, R);
  const c = sim.slot('RB')!, d = sim.slot(who as never)!;
  for (const a of sim.agents) {
    a.body.pos = { x: 2 + a.idx * .1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 };
    a.downUntil = 99; a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  }
  c.downUntil = d.downUntil = -1;
  sim.t = sim.world.time = 3;
  sim.handoffAt = 1;
  sim.ball = { kind: 'held', carrier: c } as never;
  const y0 = sim.ballY, x0 = sim.los + 5;
  c.body.pos = { x: x0, y: y0 }; c.body.vel = { x: speed, y: 0 }; c.body.facing = 0;
  d.body.pos = { x: x0 + cushion, y: y0 + lateral }; d.body.vel = { x: -dSpeed, y: 0 }; d.body.facing = Math.PI;
  c.behavior = new BallCarrier({}, c);
  d.behavior = { kind: 'pursuit', update: () => chase(sim, d, c) } as never;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  const holds = new Map<GraspJoint, any>();
  let pass: any = null, ending = 'censored';
  let minD = Infinity;
  while (sim.phase === 'live' && sim.t < 7.5) {
    (sim as any).tick();
    const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
    minD = Math.min(minD, dd);
    // The meeting: when the runner draws level with the defender.
    if (!pass && c.pos.x >= d.pos.x) pass = { t: r2(sim.t), across: r2(Math.abs(c.pos.y - d.pos.y)), cs: r2(c.speed), ds: r2(d.speed), x: r2(c.pos.x - x0) };
    for (const j of sim.world.joints) if (j.kind === 'grasp' && j.b === c.body && !holds.has(j as GraspJoint))
      holds.set(j as GraspJoint, { t: r2(sim.t), origin: (j as GraspJoint).origin, cap: r2((j as GraspJoint).capacity), dd: r2(dd), cs: r2(c.speed), ds: r2(d.speed) });
    for (const [j, h] of holds) if (j.broken && h.broke === undefined) h.broke = r2(sim.t - h.t);
    const live = sim.world.joints.some(j => j.kind === 'grasp' && j.b === c.body && !j.broken);
    if (!live && c.pos.x - d.pos.x > 3 && c.vel.x - d.vel.x > 0) { ending = 'escaped'; break; }
  }
  if (sim.phase !== 'live') ending = sim.outcome === 'tackle' || sim.events.some(e => e.type === 'tackle') ? 'tackled' : String(sim.outcome);
  const misses = sim.events.filter(e => e.type === 'missed_tackle').map(e => e.note ?? 'roll');
  return { roster, cushion, lateral, speed, dSpeed, seed, ending, gainFromStart: r2(((sim.endSpot?.x ?? c.pos.x) - x0)), minD: r2(minD), pass, holds: [...holds.values()], misses,
    downAt: r2(sim.t) };
}

if (process.argv[1]?.endsWith('space.ts')) {
  const rows = [];
  for (const roster of arg('--rosters', 'pair11,pair31').split(','))
    for (const cushion of [5, 8, 12]) for (const lat of [0, 1.5, 3]) for (const side of lat ? [1, -1] : [1])
      for (const speed of [6, 8]) for (const dSpeed of [0, 2]) for (let s = 0; s < seeds; s++)
        rows.push(rep(roster, cushion, lat * side, speed, dSpeed, 500 + s));
  const share = (rs: any[], f: (r: any) => boolean) => rs.length ? (100 * rs.filter(f).length / rs.length).toFixed(0) + '%' : '-';
  const med = (xs: number[]) => xs.length ? xs.sort((a, b) => a - b)[xs.length >> 1] : NaN;
  console.log('cushion lat speed | tackled escaped | gain-from-start median (tackled) | holds/rep broken | pass across med, runner speed at pass');
  for (const cushion of [5, 8, 12]) for (const lat of [0, 1.5, 3]) for (const speed of [6, 8]) {
    const rs = rows.filter(r => r.cushion === cushion && Math.abs(r.lateral) === lat && r.speed === speed);
    const hs = rs.flatMap(r => r.holds);
    console.log(`${String(cushion).padStart(5)} ${String(lat).padStart(4)} ${speed} | ${share(rs, r => r.ending === 'tackled').padStart(4)} ${share(rs, r => r.ending === 'escaped').padStart(4)} | ${med(rs.filter(r => r.ending === 'tackled').map(r => r.gainFromStart)).toFixed(1)} | ${(hs.length / rs.length).toFixed(2)} ${share(hs, h => h.broke !== undefined)} | ${med(rs.filter(r => r.pass).map(r => r.pass.across)).toFixed(2)} ${med(rs.filter(r => r.pass).map(r => r.pass.cs)).toFixed(1)}`);
  }
  for (const roster of arg('--rosters', 'pair11,pair31').split(',')) {
    const rs = rows.filter(r => r.roster === roster);
    console.log(roster, 'all', rs.length, 'tackled', share(rs, r => r.ending === 'tackled'), 'escaped', share(rs, r => r.ending === 'escaped'));
  }
  const all = rows; const hs = all.flatMap(r => r.holds);
  console.log('ALL', all.length, 'tackled', share(all, r => r.ending === 'tackled'), 'escaped', share(all, r => r.ending === 'escaped'), 'holds broken', share(hs, h => h.broke !== undefined),
    'origins', JSON.stringify(hs.reduce((m: any, h: any) => { const k = h.origin.split('+')[0]; m[k] = (m[k] ?? 0) + 1; return m; }, {})),
    'rolled misses', all.flatMap(r => r.misses).length, 'no-attempt escapes', all.filter(r => r.ending === 'escaped' && !r.holds.length && !r.misses.length).length);
  const out = arg('--out', '');
  if (out) (await import('node:fs')).writeFileSync(out, JSON.stringify(rows));
}
