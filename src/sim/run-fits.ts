/** A support contract derived from the called front AND coverage, not the run call. */
import { clamp, type Vec2 } from '../core/vec.js';
import { gapY, isDeepZone } from '../playbook/alignment.js';
import type { DefSlot, Gap } from '../playbook/types.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { chase, goTo, stand, track } from './behaviors/common.js';

export interface RunFitJob {
  gap: Gap;
  side: number;
  kind: 'interior' | 'edge' | 'insert' | 'force' | 'alley' | 'cutback';
  technique: 'attack' | 'control' | 'lag';
  edge: 'box' | 'spill';
  pace: 'plug' | 'stack';
  partner?: string;
}

export function buildRunFits(sim: PlaySim): Map<Agent, RunFitJob> {
  const jobs = new Map<Agent, RunFitJob>();
  const policy = sim.defCall.runPolicy ?? { edge: 'box', linebacker: 'stack' };
  const first = new Set<Agent>();
  const claimed = new Set<string>();
  for (const d of sim.defense) {
    const spot = sim.defAlign.spots[d.slot as DefSlot]!;
    const override = sim.defCall.front.fits?.[d.slot as DefSlot];
    const line = ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'].includes(d.slot)
      || (spot.pos.x < sim.los + 2 && spot.role.kind === 'rush');
    const gap = spot.role.kind === 'blitz' ? spot.role.gap : spot.gap;
    const side = spot.role.kind === 'blitz' ? (spot.role.side === 'S' ? sim.offAlign.strongSign : -sim.offAlign.strongSign) : spot.gapSign;
    const kind = line ? (gap === 'C' || gap === 'D' ? 'edge' : 'interior') : d.slot.startsWith('LB') ? 'insert' : 'alley';
    jobs.set(d, { gap, side, kind, technique: override?.technique ?? 'attack', edge: policy.edge, pace: policy.linebacker });
    if (line || spot.role.kind === 'blitz') { first.add(d); claimed.add(`${side}:${gap}`); }
  }
  // Flat/curl-flat coverage supplies force before a deep or man player. This
  // keeps Cover 6 asymmetric and never counts both candidates as primary force.
  for (const side of [-1, 1]) {
    const candidates = sim.defense.filter((d) => !first.has(d) && (d.pos.y - sim.ballY) * side > 2);
    const cost = (d: Agent) => {
      const role = sim.defAlign.spots[d.slot as DefSlot]!.role;
      const priority = role.kind === 'zone' ? role.zone.startsWith('flat') ? 0 : role.zone.startsWith('curl_flat') ? 1 : isDeepZone(role.zone) ? 6 : 3 : 7;
      return priority * 4 + Math.abs(Math.abs(d.pos.y - sim.ballY) - 5.5);
    };
    candidates.sort((a,b) => cost(a)-cost(b));
    const force = candidates[0];
    if (force) { jobs.get(force)!.kind = 'force'; jobs.get(force)!.side = side; jobs.get(force)!.gap = 'D'; }
    for (const d of first) {
      const j = jobs.get(d)!;
      if (j.side !== side || j.kind !== 'edge') continue;
      // Spill requires an outside support player. Without one, preserve the edge.
      if (!force || force.pos.x>sim.los+8 || (force.pos.y - d.pos.y) * side < .2) j.edge = 'box';
      if (force) j.partner = force.slot;
    }
  }
  // Fill the bubbles with available inside backers. An apex/coverage player is
  // not an additional instantaneous interior hat just because he is a linebacker.
  const backers = sim.defense.filter((d) => d.slot.startsWith('LB') && !first.has(d) && jobs.get(d)!.kind !== 'force'
    && Math.abs(sim.defAlign.spots[d.slot as DefSlot]!.pos.y - sim.ballY) < 5.5)
    .sort((a, b) => a.pos.y - b.pos.y);
  const bubbles = [-1, 1].flatMap((side) => (['A', 'B', 'C'] as Gap[])
    .filter((gap) => !claimed.has(`${side}:${gap}`)).map((gap) => ({ side, gap })));
  for (const d of backers) {
    bubbles.sort((a, b) => Math.abs(gapY(sim.offAlign, a.gap, a.side) - d.pos.y) - Math.abs(gapY(sim.offAlign, b.gap, b.side) - d.pos.y));
    const bubble = bubbles.shift();
    if (bubble) Object.assign(jobs.get(d)!, bubble);
  }
  const exchange = sim.defCall.gapExchange;
  if (exchange) {
    const end = sim.slot(exchange.edge), backer = sim.slot(exchange.backer);
    if (end && backer && !first.has(backer) && jobs.get(backer)?.kind !== 'force') {
      const e = jobs.get(end)!, b = jobs.get(backer)!;
      b.gap = e.gap; b.side = e.side; b.kind = 'cutback'; b.partner = end.slot;
      e.gap = 'B'; e.kind = 'interior'; e.partner = backer.slot;
    }
  }
  return jobs;
}

/** Only visible pull/slice motion changes a fit; no offensive scheme lookup. */
export function blockingIndicator(a: Agent, sim: PlaySim): { side: number; kind: 'pull' | 'slice'; pos: Vec2 } | null {
  for (const o of sim.offense) {
    const guard = o.slot === 'LG' || o.slot === 'RG' || o.slot === 'LT' || o.slot === 'RT';
    const homeSpot=sim.offAlign.spots[o.slot];
    const slice = (o.player.position === 'TE' || o.player.position === 'FB') && !homeSpot?.inline
      && homeSpot.pos.x<sim.los-.9 && Math.abs(homeSpot.pos.y-sim.ballY)<6;
    if (!guard && !slice) continue;
    const s = sim.see(a, o), home = sim.offAlign.spots[o.slot].pos;
    if (s.pos.x > sim.los - (guard ? .65 : 1) || Math.abs(s.vel.y) < 1.5 || Math.abs(s.pos.y-home.y) < .6) continue;
    return { side: Math.sign(s.vel.y), kind: guard ? 'pull' : 'slice', pos: s.pos };
  }
  return null;
}

export function executeRunFit(a: Agent, sim: PlaySim, fallbackGap: Gap, fallbackSide: number) {
  if (a.engagement) return stand();
  const job = a.runFit ?? { gap: fallbackGap, side: fallbackSide, kind: 'insert', technique: 'attack', edge: 'box', pace: 'stack' };
  const c = sim.carrier;
  const back = sim.slot('RB');
  const premesh = c === sim.qb && !sim.scrambled && sim.handoffAt < 0 && !!back;
  if (!c || c.team === a.team) return goTo(a, { x: sim.los + .6, y: gapY(sim.offAlign, job.gap, job.side) }, { speed: .7 });
  const seen = sim.see(a, premesh ? back! : c);
  if (!premesh && seen.pos.x > sim.los + 2) return chase(sim, a, c);
  const indicator = blockingIndicator(a, sim);
  let gy = gapY(sim.offAlign, job.gap, job.side);
  if (job.kind === 'alley') {
    // The remaining secondary support is the cap on the fit. Bringing every
    // safety to linebacker depth before the back declares removes the final
    // level and turns ordinary creases into breakaways.
    if (!premesh && seen.pos.x>sim.los-2.5) return chase(sim,a,c,3.5);
    const home=sim.defAlign.spots[a.slot as DefSlot]!.pos;
    const depth=clamp((home.x-sim.los)*.65,5,8);
    const aim=a.mind.aim('alley-fit',{x:sim.los+depth,y:seen.pos.y+job.side*1.2+a.mind.placementError},sim.t);
    return track(a,aim,{x:0,y:0},{speed:.65,gain:2,facing:Math.PI});
  }
  const edge = job.kind === 'edge' || job.kind === 'force';
  const core = sim.offense.filter((o) => ['LT','LG','C','RG','RT'].includes(o.slot) || sim.offAlign.spots[o.slot]?.inline)
    .map((o) => ({ ...sim.see(a,o), radius:o.profile.radius }));
  const surface = job.side > 0 ? Math.max(...core.map((o) => o.pos.y + o.radius)) : Math.min(...core.map((o) => o.pos.y - o.radius));
  if (edge) {
    let kick: ReturnType<PlaySim['see']> | null = null;
    if (job.kind === 'edge') {
      kick = sim.offense.filter((o) => o !== sim.qb && o !== back).map((o) => sim.see(a,o))
        .filter((o) => o.pos.x < a.pos.x + .5 && Math.abs(o.pos.y-a.pos.y) < 2.5 && o.vel.y * job.side > 1.3)
        .sort((p,q) => Math.hypot(p.pos.x-a.pos.x,p.pos.y-a.pos.y)-Math.hypot(q.pos.x-a.pos.x,q.pos.y-a.pos.y))[0] ?? null;
    }
    if (kick) {
      // Wrong-arm the inside half or maintain the outside half of the arriving
      // kickout. The blocker can answer with a log; no outcome is prescribed.
      gy = kick.pos.y + job.side * (job.edge === 'spill' ? -.45 : .65);
      a.tags.add(job.edge === 'spill' ? 'fit-spill' : 'fit-box');
    } else gy = job.kind === 'force' ? job.side > 0 ? Math.max(surface+.5,seen.pos.y+.7) : Math.min(surface-.5,seen.pos.y-.7) : gy;
    const homeDepth=sim.defAlign.spots[a.slot as DefSlot]!.pos.x-sim.los;
    const supportDepth=job.kind==='force' && (premesh||seen.pos.x<sim.los-1.6) ? clamp(homeDepth*.55,1.5,6) : .3;
    const x = kick ? Math.max(sim.los-.6,kick.pos.x+.5) : Math.max(sim.los+supportDepth,Math.min(sim.los+2.5,seen.pos.x+1.5));
    const aim = a.mind.aim('edge-fit',{x,y:gy+a.mind.placementError},sim.t);
    return track(a,aim,{x:0,y:0},{speed:.9,gain:3,facing:Math.PI});
  }
  if (job.technique === 'lag' && Math.abs(seen.vel.y) > .8) gy = gapY(sim.offAlign,'A',-Math.sign(seen.vel.y));
  const flow = clamp(seen.pos.y-gy,-2,2) * (job.pace === 'stack' ? .5 : .2);
  if (indicator?.kind === 'pull' && job.kind !== 'interior') {
    gy += indicator.side * Math.min(1.5,Math.abs(indicator.pos.y-gy)*.35);
    a.tags.add('fit-pull-read');
  }
  // Insert to the surface, then attack a declared crease. The back's being
  // near our lateral landmark at a deep mesh is not permission to chase him.
  const declared = !premesh && seen.pos.x > sim.los-1.6 && Math.abs(seen.pos.y-gy) < 2.5;
  if (declared && job.kind !== 'cutback') return chase(sim,a,c,2);
  const depth = job.kind === 'interior' ? .25 : job.kind === 'cutback' ? 1.4 : job.pace === 'stack' ? 1.5 : .5;
  const aim = a.mind.aim('run-fit',{x:sim.los+depth,y:gy+flow+a.mind.placementError},sim.t);
  return track(a,aim,{x:0,y:0},{speed:.78+.15*a.mind.urgency,gain:3,facing:Math.PI});
}
