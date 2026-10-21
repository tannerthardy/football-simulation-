/** NFL-comparable pocket geometry, with explicit engine assignment proxies.
 * node --import tsx scripts/pocket-anatomy.ts [games=16] [seed=7] [leagues=2] [output=out/pocket-anatomy.json]
 * Copy unchanged with source-version.ts into an archived revision to pair.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam, type Team } from '../src/league/team.js';
import { isOL, PassProtector, type ProtectionCoordinator } from '../src/sim/behaviors/blocking.js';
import type { Agent } from '../src/sim/agent.js';
import type { PlayStats } from '../src/sim/types.js';
import { sourceVersion } from './source-version.js';

const games = Number(process.argv[2] ?? 16), seed = Number(process.argv[3] ?? 7), leagues = Number(process.argv[4] ?? 2);
const output = process.argv[5] ?? 'out/pocket-anatomy.json';
if (![games, leagues].every(n => Number.isInteger(n) && n > 0) || !Number.isSafeInteger(seed)) throw new Error('Invalid setup');
const times = [0.5, 1, 1.5, 2, 2.5, 3];
type Slice = { t: number; qbDepth: number; meanOLDepth: number; tackleWidth: number; qbOLSpace: number;
  interior: Array<{ rusher: string; blocker: string; rusherDepth: number; blockerDepth: number; retreat: number; separation: number; engaged: boolean }> };
type Row = { id?: string; game: number; concept: string; front: string; traditional: boolean; scramble: boolean; sacked: boolean;
  end: number; first?: { t: number; attached: boolean; engaged: boolean; unassigned: boolean; onOutcome: boolean; initialRusher: boolean };
  everAttached: boolean; everFree: boolean; slices: Slice[] };
const rows: Row[] = [], rng = new Rng(seed);
const names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];
const per = Math.ceil(games / leagues);
let teams: Team[] = [];
const distance = (a: Agent, b: Agent) => Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
for (let g = 0; g < games; g++) {
  if (g % per === 0) {
    const lr = rng.fork(`league-${g / per}`);
    teams = names.map(n => { const tr = lr.fork(n); return generateTeam(tr, n, n.slice(0, 3).toUpperCase(), { strength: tr.range(0.35, 0.75) }); });
  }
  const i = rng.int(0, 7); let j = rng.int(0, 6); if (j >= i) j++;
  const byStats = new Map<PlayStats, Row>();
  const game = simulateGame(teams[i], teams[j], { seed: rng.nextU32(), hooks: { playResult(sim, kind) {
    if (!sim.isPass || kind !== 'scrimmage') return undefined;
    const ol = sim.offense.filter(isOL).sort((a, b) => a.pos.y - b.pos.y);
    const rushers = sim.defense.filter(d => ['rush', 'blitz'].includes(d.behavior.kind));
    const interior = rushers.filter(d => d.pos.x <= sim.los + 2 && (['DT', 'NT'].includes(d.player.position) || (d.pos.y > ol[0].pos.y && d.pos.y < ol.at(-1)!.pos.y)));
    const listed = new Map<Agent, Set<Agent>>(sim.defense.map(d => [d, new Set<Agent>()]));
    const row: Row = { game: g, concept: sim.offCall.pass!.id, front: sim.defCall.front.id,
      traditional: sim.offCall.pass!.drop !== 'boot', scramble: false, sacked: false, end: 4.5, everAttached: false, everFree: false, slices: [] };
    let ended = false;
    while (sim.phase === 'live' && sim.t < 25) {
      sim.tick();
      const t = Math.round((sim.t - sim.dt) * 100) / 100;
      const eventEnd = sim.throwAt >= 0 ? sim.throwAt : sim.events.find(e => ['sack', 'scramble', 'fumble'].includes(e.type))?.t;
      // The first declared matchup plus chips/doubles and live pickups form
      // our label proxy. Reading these maps does not advance decisions or RNG.
      for (const b of sim.offense) {
        if (b.behavior instanceof PassProtector) {
          const coord = (b.behavior as unknown as { coord: ProtectionCoordinator }).coord;
          const d = coord.assigned.get(b);
          if (d && listed.has(d)) listed.get(d)!.add(b);
        }
        if (b.engagement && listed.has(b.engagement.defender)) listed.get(b.engagement.defender)!.add(b);
      }
      if (ended || t > 4.5 || (eventEnd !== undefined && t > eventEnd + 1e-6)) continue;
      const endpoint = eventEnd !== undefined || sim.phase !== 'live';
      if (endpoint) { row.end = eventEnd ?? t; ended = true; }
      if (t >= 0.5 && Math.round(t * 20) % 2 === 0) {
        const near = sim.defense.filter(d => distance(d, sim.qb) < 2).sort((a, b) => distance(a, sim.qb) - distance(b, sim.qb));
        const attached = (d: Agent) => [...listed.get(d)!].some(b => distance(b, d) <= 1.5);
        if (near.length && !row.first) row.first = { t, attached: attached(near[0]), engaged: !!near[0].engagement,
          unassigned: listed.get(near[0])!.size === 0, onOutcome: eventEnd !== undefined && t >= eventEnd - 1e-6, initialRusher: rushers.includes(near[0]) };
        if (near.some(attached)) row.everAttached = true;
        if (near.some(d => !attached(d))) row.everFree = true;
      }
      if (!endpoint && times.some(s => Math.abs(s - t) < 1e-6)) {
        const meanOLDepth = ol.reduce((s, b) => s + sim.los - b.pos.x, 0) / ol.length;
        row.slices.push({ t, qbDepth: sim.los - sim.qb.pos.x, meanOLDepth,
          tackleWidth: Math.abs(ol.at(-1)!.pos.y - ol[0].pos.y), qbOLSpace: sim.los - sim.qb.pos.x - meanOLDepth,
          interior: interior.flatMap(d => {
            const b = [...listed.get(d)!].sort((a, b) => distance(a, d) - distance(b, d))[0];
            return b ? [{ rusher: d.slot, blocker: b.slot, rusherDepth: sim.los - d.pos.x, blockerDepth: sim.los - b.pos.x,
              retreat: sim.snapX[b.idx] - b.pos.x, separation: distance(b, d), engaged: !!d.engagement }] : [];
          }) });
      }
    }
    const result = sim.run();
    row.scramble = result.stats.scramble; row.sacked = result.stats.sacked;
    row.traditional &&= !row.scramble;
    byStats.set(result.stats, row);
    return result;
  } } });
  for (const p of game.log) if (p.kind === 'pass' && p.stats && !p.nullified) {
    const row = byStats.get(p.stats);
    if (row) { row.id = `G${g + 1}-P${String(p.index + 1).padStart(3, '0')}`; rows.push(row); }
  }
}
const avg = (xs: number[]) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? (s[Math.floor((s.length - 1) / 2)] + s[Math.floor(s.length / 2)]) / 2 : null; };
function summarize(rs: Row[]) {
  const pressures = rs.filter(r => r.first);
  return { n: rs.length, pressurePct: 100 * pressures.length / Math.max(1, rs.length),
    pressureBeforeOutcomePct: 100 * pressures.filter(r => !r.first!.onOutcome).length / Math.max(1, rs.length),
    firstAttachedPct: 100 * pressures.filter(r => r.first!.attached).length / Math.max(1, pressures.length),
    firstEngagedPct: 100 * pressures.filter(r => r.first!.engaged).length / Math.max(1, pressures.length),
    firstInitialRusherPct: 100 * pressures.filter(r => r.first!.initialRusher).length / Math.max(1, pressures.length),
    everAttachedPct: 100 * rs.filter(r => r.everAttached).length / Math.max(1, rs.length),
    everFreePct: 100 * rs.filter(r => r.everFree).length / Math.max(1, rs.length),
    firstPressureMedian: median(pressures.map(r => r.first!.t)),
    slices: Object.fromEntries(times.map(t => {
      const slices = rs.flatMap(r => r.slices.filter(s => s.t === t)), interior = slices.flatMap(s => s.interior);
      return [t, { n: slices.length, meanOLDepth: avg(slices.map(s => s.meanOLDepth)), medianOLDepth: median(slices.map(s => s.meanOLDepth)),
        qbDepth: avg(slices.map(s => s.qbDepth)), tackleWidth: avg(slices.map(s => s.tackleWidth)), qbOLSpace: avg(slices.map(s => s.qbOLSpace)),
        interiorN: interior.length, blockerDepth: avg(interior.map(s => s.blockerDepth)), rusherDepth: avg(interior.map(s => s.rusherDepth)),
        blockerRetreat: avg(interior.map(s => s.retreat)), separation: avg(interior.map(s => s.separation)),
        attachedPct: 100 * interior.filter(s => s.separation < 1.5).length / Math.max(1, interior.length),
        engagedPct: 100 * interior.filter(s => s.engaged).length / Math.max(1, interior.length) }];
    })) };
}
const result = { sourceSha256: sourceVersion(), setup: { games, seed, leagues },
    definitions: { cohort: 'Traditional excludes boot drops and all scrambles. Includes play action. Proximity counts all defenders; interior push counts initial rush/blitz defenders.',
    time: '10 Hz post-integration samples labeled by the engine tick; 0.5 s through outcome inclusive, cap 4.5 s. Shape slices strictly before release/sack/scramble/fumble.',
    attached: 'Any blocker in the declared/observed matchup proxy within 1.5 yd of the rusher. Engaged is separately the engine active block state.',
    limitations: 'NFL PFF blocker labels are unavailable for simulation: proxy unions declared assignments and contacts seen so far. Simulation LOS is its snap line, not a measured football center. Late survivors are a selected subset. Pocket geometry alone is not evidence of causal push.' },
  traditional: summarize(rows.filter(r => r.traditional)), all: summarize(rows), rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result) + '\n');
console.log(JSON.stringify({ output, traditional: result.traditional, all: result.all }, null, 2));
