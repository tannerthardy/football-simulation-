/** Live 20 Hz contact instrumentation, without changing RNG or decisions.
 * node --import tsx scripts/dropback-motion-anatomy.ts [games=16] [seed=7] [leagues=2] [output=out/dropbacks.json]
 * Copy unchanged with source-version.ts into an archived revision to pair.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam, type Team } from '../src/league/team.js';
import type { Agent } from '../src/sim/agent.js';
import type { PlayStats } from '../src/sim/types.js';
import { sourceVersion } from './source-version.js';

const games = Number(process.argv[2] ?? 16), seed = Number(process.argv[3] ?? 7), leagues = Number(process.argv[4] ?? 2);
const output = process.argv[5] ?? 'out/dropbacks.json';
if (![games, leagues].every(n => Number.isInteger(n) && n > 0) || !Number.isSafeInteger(seed)) throw new Error('Invalid game count, seed or league count');
type Row = { id?: string; game: number; front: string; concept: string; los: number; firstPressure?: number; pressureSeconds: number; attachedSeconds: number;
  freeSeconds: number; felt: boolean; sacked: boolean; scramble: boolean; ttt?: number; blockerCompression?: number;
  interception?: { slot: string; precededBy: 'drop' | 'pbu' | 'direct'; qbReadCorrect: boolean; feltPressure: boolean } };
const rows: Row[] = [], rng = new Rng(seed);
const names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];
const per = Math.ceil(games / leagues);
let teams: Team[] = [];
for (let g = 0; g < games; g++) {
  if (g % per === 0) {
    const lr = rng.fork(`league-${g / per}`);
    teams = names.map(n => { const tr = lr.fork(n); return generateTeam(tr, n, n.slice(0, 3).toUpperCase(), { strength: tr.range(0.35, 0.75) }); });
  }
  const i = rng.int(0, 7); let j = rng.int(0, 6); if (j >= i) j++;
  const byStats = new Map<PlayStats, Row>();
  const game = simulateGame(teams[i], teams[j], { seed: rng.nextU32(), hooks: { playResult(sim, kind) {
    if (!sim.isPass || kind !== 'scrimmage') return undefined;
    const row: Row = { game: g, front: sim.defCall.front.id, concept: sim.offCall.pass!.id, los: sim.los,
      pressureSeconds: 0, attachedSeconds: 0, freeSeconds: 0, felt: false, sacked: false, scramble: false };
    const contacts = new Map<Agent, { blocker: Agent; x: number }>();
    let ended = false;
    while (sim.phase === 'live' && sim.t < 25) {
      sim.tick();
      const time = Math.round((sim.t - sim.dt) * 100) / 100;
      const end = sim.throwAt >= 0 ? sim.throwAt : sim.events.find(e => ['sack', 'scramble'].includes(e.type))?.t;
      if (ended || (end !== undefined && time > end + 1e-6)) continue;
      for (const e of sim.engagements) if (e.type === 'pass' && !contacts.has(e.defender)) contacts.set(e.defender, { blocker: e.blocker, x: e.blocker.pos.x });
      if (time >= 0.5) {
        const close = sim.defense.filter(d => !d.isDown(time) && Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) < 2);
        if (close.length && row.firstPressure === undefined) row.firstPressure = time;
        if (close.length) row.pressureSeconds += sim.dt;
        if (close.some(d => !!d.engagement)) row.attachedSeconds += sim.dt;
        if (close.some(d => !d.engagement)) row.freeSeconds += sim.dt;
      }
      const finish = end !== undefined || (sim.phase as string) === 'dead';
      if (finish) {
        const compression = [...contacts].flatMap(([d, c]) => d.engagement?.blocker === c.blocker ? [c.x - c.blocker.pos.x] : []);
        if (compression.length) row.blockerCompression = compression.reduce((s, x) => s + x, 0) / compression.length;
        ended = true;
      }
    }
    const result = sim.run(), st = result.stats;
    row.felt = st.pressured; row.sacked = st.sacked; row.scramble = st.scramble; row.ttt = st.timeToThrow;
    if (st.interceptedBy) {
      const intercept = sim.events.find(e => e.type === 'interception');
      const before = sim.events.filter(e => intercept && e.t <= intercept.t && ['drop', 'pbu'].includes(e.type)).at(-1);
      row.interception = { slot: sim.agents.find(a => a.player.id === st.interceptedBy)?.slot ?? '?',
        precededBy: before?.type === 'drop' ? 'drop' : before?.type === 'pbu' ? 'pbu' : 'direct',
        qbReadCorrect: !!st.qbRead && (st.qbRead.post ?? st.qbRead.pre) === st.qbRead.actual, feltPressure: st.pressured };
    }
    byStats.set(st, row);
    return result;
  } } });
  for (const p of game.log) if (p.kind === 'pass' && p.stats && !p.nullified) {
    const row = byStats.get(p.stats);
    if (row) { row.id = `G${g + 1}-P${String(p.index + 1).padStart(3, '0')}`; rows.push(row); }
  }
}
const avg = (xs: number[]) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
const pressed = rows.filter(r => r.firstPressure !== undefined);
const interceptions = rows.filter(r => r.interception);
const result = { sourceSha256: sourceVersion(), setup: { games, seed, leagues },
  definitions: { pressure: 'Any standing defender within 2 yd at 20 Hz, starting 0.5 s, through release/sack/scramble. sack-anatomy.ts retains the 10 Hz tracking proxy.',
    attached: 'At least one geometrically close defender still in a block; free and attached durations can overlap.',
    compression: 'Mean longitudinal blocker displacement since first contact at release/sack/scramble, for blocks still attached at that instant.',
    interceptions: 'Observed predecessors and read/pressure flags, not a causal label for QB mistakes. These IDs refer to this guard panel, not the six-game film library.' },
  summary: { dropbacks: rows.length, geometricPressurePct: 100 * pressed.length / rows.length,
    qbFeltPressurePct: 100 * rows.filter(r => r.felt).length / rows.length,
    attachedPressurePct: 100 * rows.filter(r => r.attachedSeconds > 0).length / rows.length,
    freePressurePct: 100 * rows.filter(r => r.freeSeconds > 0).length / rows.length,
    attachedSecondsPerDropback: avg(rows.map(r => r.attachedSeconds)), freeSecondsPerDropback: avg(rows.map(r => r.freeSeconds)),
    pressureDuration: avg(pressed.map(r => r.pressureSeconds)),
    blockerCompressionN: rows.filter(r => r.blockerCompression !== undefined).length,
    blockerCompression: avg(rows.flatMap(r => r.blockerCompression === undefined ? [] : [r.blockerCompression])),
    interceptions: interceptions.length,
    interceptionPredecessors: Object.fromEntries(['drop', 'pbu', 'direct'].map(key => [key, interceptions.filter(r => r.interception!.precededBy === key).length])),
    interceptionSlots: Object.fromEntries([...new Set(interceptions.map(r => r.interception!.slot))].map(slot => [slot, interceptions.filter(r => r.interception!.slot === slot).length])) }, rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output, summary: result.summary }, null, 2));
