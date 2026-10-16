/** Open-field tackle tracer. Runs the zone lab's cases and, past the second
 * level (carrier 5+ yd beyond the line), records every defender's approach
 * and every tackle interaction: rolled misses, holds with their geometry and
 * fate, and reach windows a tackler passed up. Observation only.
 *
 * node --import tsx scripts/diag/open-field/trace.ts --out out/open-field/x.jsonl.gz [lab selection args] [--shard i/n]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { timeToReach } from '../../../src/physics/reach.js';
import type { GraspJoint } from '../../../src/physics/world.js';
import type { Agent } from '../../../src/sim/agent.js';
import { caseId, LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const r2 = (x: number) => Math.round(x * 100) / 100;
const OPEN = Number(arg('--open', '5'));

function trace(c: LabCase, R: ReturnType<typeof rosters>) {
  const sim = makeSim(c, R);
  const dir = sim.attackDir('O');
  const depth = (a: Agent) => (a.pos.x - sim.los) * dir;
  let openAt = -1;
  const holds = new Map<GraspJoint, any>();
  const approach = new Map<Agent, { min: number; t: number; rel?: any; inRange: number; attempts: number }>();
  const nEv0 = { n: 0 };
  // Common play format (scripts/mechanics/metrics.py): 0.1 s frames, x past
  // the line in the offense's direction, y mirrored with it.
  const W = 160 / 3, xy: number[][] = [];
  const frame = () => xy.push(sim.agents.flatMap(a => [r2((a.pos.x - sim.los) * dir), r2(dir > 0 ? a.pos.y : W - a.pos.y)]));
  frame();
  let ticks = 0;
  const path: number[][] = [];
  let snap: any[] = [];
  const enc = new Map<Agent, any>();
  let movers: { d: Agent; m: Parameters<typeof timeToReach>[0] }[] = [];
  while (sim.phase === 'live' && sim.t < 20) {
    const before = new Map(sim.defense.map(d => [d, d.nextTackleAt]));
    sim.tick();
    if (++ticks % 2 === 0) frame();
    const car = sim.carrier;
    if (!car || car.team !== 'O') continue;
    if (openAt < 0 && depth(car) > OPEN) {
      openAt = sim.t; nEv0.n = sim.events.length;
      // Each defender at the moment the runner reaches the open field.
      snap = sim.defense.map(d => ({ d: d.slot, x: r2(d.pos.x), y: r2(d.pos.y), vx: r2(d.vel.x), vy: r2(d.vel.y), v: r2(d.profile.vmax * d.speedScale),
        k: d.behavior.kind, down: d.isDown(sim.t), eng: !!d.engagement }));
      movers = sim.defense.map(d => ({ d, m: { pos: { ...d.pos }, vel: { ...d.vel }, profile: d.profile, speedScale: d.speedScale } }));
    }
    if (openAt >= 0) path.push([r2(sim.t), r2(car.pos.x), r2(car.pos.y), r2(car.vel.x), r2(car.vel.y)]);
    // Holds: creation and fate.
    for (const j of sim.world.joints) {
      if (j.kind !== 'grasp' || j.b !== car.body) continue;
      const g = j as GraspJoint;
      const d = sim.agents.find(a => a.body === g.a)!;
      let h = holds.get(g);
      if (!h) {
        const dx = car.pos.x - d.pos.x, dy = car.pos.y - d.pos.y, dd = Math.hypot(dx, dy) || 1;
        const cs = car.speed, hx = cs > .5 ? car.vel.x / cs : 0, hy = cs > .5 ? car.vel.y / cs : 0;
        h = { t: sim.t, d: d.slot, open: openAt >= 0, depth: r2(depth(car)), origin: g.origin, cap0: r2(g.capacity), legs0: r2(g.legs),
          grip0: r2(sim.bond?.grip?.get(d) ?? -1), hold0: r2(g.hold ?? 0), reach: r2(g.reach), cs: r2(cs), ds: r2(d.speed),
          cosA: r2(-(hx * dx / dd + hy * dy / dd)), others: sim.bond ? sim.bond.tacklers.length - 1 : 0,
          capMax: g.capacity, minDist: dd, csMin: cs };
        holds.set(g, h);
      }
      h.capMax = Math.max(h.capMax, g.capacity);
      h.minDist = Math.min(h.minDist, Math.hypot(car.pos.x - d.pos.x, car.pos.y - d.pos.y));
      h.csMin = Math.min(h.csMin, car.speed);
      if (g.broken && h.broke === undefined) {
        h.broke = r2(sim.t - h.t); h.capEnd = r2(g.capacity); h.legsEnd = r2(g.legs);
        h.dSup = d.body.support?.state; h.cSup = car.body.support?.state; h.slipping = !!g.slipping;
        h.distEnd = r2(Math.hypot(car.pos.x - d.pos.x, car.pos.y - d.pos.y));
      }
    }
    // First encounters past the line: the first time each upright, unblocked
    // defender is within 2 yd of the runner, and what follows in 0.8 s.
    if (depth(car) > 1) for (const d of sim.defense) {
      const dx = car.pos.x - d.pos.x, dy = car.pos.y - d.pos.y, dd = Math.hypot(dx, dy);
      const e = enc.get(d);
      if (!e && dd < 2 && !d.isDown(sim.t) && !d.engagement && !sim.bond?.tacklers.includes(d)) {
        const cs = car.speed, hx = cs > .5 ? car.vel.x / cs : dir, hy = cs > .5 ? car.vel.y / cs : 0;
        enc.set(d, { d: d.slot, t: r2(sim.t), depth: r2(depth(car)), cs: r2(cs), ds: r2(d.speed),
          // Defender position in the runner's frame: along his travel and across it.
          along: r2(-(hx * dx + hy * dy)), across: r2(Math.abs(hx * dy - hy * dx)),
          // Defender velocity along the runner's travel (+: same way, -: toward him).
          dAlong: r2(d.vel.x * hx + d.vel.y * hy), closing: r2(-((car.vel.x - d.vel.x) * dx + (car.vel.y - d.vel.y) * dy) / (dd || 1)),
          bond: !!sim.bond, k: d.behavior.kind, out: 'none', n: sim.events.length });
      }
      if (e && e.out === 'none' && sim.t - e.t <= .8) {
        for (const ev of sim.events.slice(e.n)) if (ev.a === d.idx || ev.b === d.idx) {
          if (ev.type === 'tackle_wrap') e.out = 'wrap';
          else if (ev.type === 'missed_tackle') e.out = ev.note === 'dive' ? 'dive-miss' : 'miss';
          else if (ev.type === 'hit') e.out = 'dive-hit';
          if (e.out !== 'none') { e.at = r2(ev.t - e.t); break; }
        }
        e.n = sim.events.length;
        e.dmin = r2(Math.min(e.dmin ?? 9, dd));
      }
    }
    if (openAt < 0) continue;
    for (const d of sim.defense) {
      const dd = Math.hypot(car.pos.x - d.pos.x, car.pos.y - d.pos.y);
      let a = approach.get(d);
      if (!a) approach.set(d, a = { min: Infinity, t: 0, inRange: 0, attempts: 0 });
      if (dd < a.min && !d.isDown(sim.t)) {
        const dx = car.pos.x - d.pos.x, dy = car.pos.y - d.pos.y;
        a.min = dd; a.t = sim.t;
        a.rel = { ahead: r2((d.pos.x - car.pos.x) * dir), lat: r2(d.pos.y - car.pos.y), cs: r2(car.speed), ds: r2(d.speed),
          closing: r2(-((car.vel.x - d.vel.x) * dx + (car.vel.y - d.vel.y) * dy) / (dd || 1)), down: d.isDown(sim.t), eng: !!d.engagement };
      }
      const range = car.profile.radius + d.profile.radius + d.profile.reach + .45;
      if (dd <= range && !d.isDown(sim.t) && !d.engagement && !sim.bond?.tacklers.includes(d)) {
        if (d.nextTackleAt !== before.get(d)) a.attempts++;
        else if (sim.t >= (before.get(d) ?? 0)) a.inRange++;
      }
    }
  }
  const res = sim.buildResult();
  // Oracle: earliest point of the runner's actual later path each defender
  // could have reached from his open-field state (engine reach model, arm
  // reach, 0.3 s to react). The outcome is in hand; diagnostic only.
  for (const [i, { d, m }] of movers.entries()) {
    const reach = d.profile.radius + (sim.slot('RB')?.profile.radius ?? .35) + d.profile.reach * .75;
    for (const [t, x, y] of path) if (timeToReach(m, { x, y }, reach) + .3 <= t - openAt) {
      snap[i].could = { dt: r2(t - openAt), depth: r2((x - sim.los) * dir) }; break;
    }
  }
  const ev = sim.events.slice(openAt >= 0 ? nEv0.n : sim.events.length)
    .filter(e => ['missed_tackle', 'broken_tackle', 'tackle_wrap', 'hit', 'tackle'].includes(e.type))
    .map(e => ({ t: e.t, type: e.type, a: e.a !== undefined ? sim.agents[e.a].slot : null, b: e.b !== undefined ? sim.agents[e.b].slot : null, note: e.note }));
  const H = [...holds.values()].map(h => ({ ...h, capMax: r2(h.capMax), minDist: r2(h.minDist), csMin: r2(h.csMin) }));
  return { id: caseId(c), ...c, gain: r2(res.offenseYards), outcome: res.outcome, t: r2(sim.t), openAt: openAt >= 0 ? r2(openAt) : null,
    common: { id: caseId(c), source: 'sim', kind: 'run', yards: r2(res.offenseYards), dt: .1, xy, carrier: sim.slot('RB')!.idx,
      ball_y: r2(dir > 0 ? sim.ballY : W - sim.ballY),
      players: sim.agents.map(a => ({ side: a.team, group: ({ QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', OT: 'OL', OG: 'OL', C: 'OL', EDGE: 'DL', DT: 'DL', LB: 'LB', CB: 'DB', S: 'DB' } as Record<string, string>)[a.player.position] ?? 'OTHER' })),
      events: { handoff: sim.handoffAt >= 0 ? r2(sim.handoffAt) : undefined, end: r2(sim.t),
        // Same first-contact definition as scripts/mechanics/sim-export.ts.
        first_contact: sim.events.find(e => (e.type === 'carrier_contact' && (e.a === sim.slot('RB')!.idx || e.b === sim.slot('RB')!.idx))
          || ((e.type === 'tackle_wrap' || e.type === 'hit' || e.type === 'tackle') && e.b === sim.slot('RB')!.idx))?.t } },
    events: ev, holds: H, enc: [...enc.values()].map(({ n, ...e }) => e), snap, path: path.filter((_, i) => i % 2 === 0), dir, los: sim.los,
    approach: [...approach.entries()].map(([d, a]) => ({ d: d.slot, min: r2(a.min), t: r2(a.t), inRange: a.inRange, attempts: a.attempts, ...a.rel }))
      .filter(a => a.min < 4).sort((x, y) => x.t - y.t) };
}

const [si, sn] = arg('--shard', '0/1').split('/').map(Number);
const R = rosters();
const cases: LabCase[] = [];
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of list('--dirs', 'strong,weak') as Array<'strong' | 'weak'>) for (const lk of list('--looks', LOOK_SPECS.map(l => l[0]).join(',')))
    for (const roster of list('--rosters', 'pair11,pair31')) for (const seed of list('--seeds', '77,71001,1,2,3,4,5,6,7,8').map(Number))
      cases.push({ concept, dir, look: lk, roster, seed, formation });
const rows: string[] = [];
const t0 = performance.now();
for (const c of cases.filter((_, i) => i % sn === si)) {
  try { rows.push(JSON.stringify(trace(c, R))); } catch (e) { rows.push(JSON.stringify({ id: caseId(c), error: String(e) })); }
}
const out = arg('--out', 'out/open-field/trace.jsonl.gz');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, gzipSync(rows.join('\n') + '\n'));
console.log(`${rows.length} plays in ${((performance.now() - t0) / 1000).toFixed(1)} s -> ${out}`);
