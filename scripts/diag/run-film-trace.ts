/**
 * Run-only film trace: plays the film room's games (teams built exactly as
 * scripts/export-replay.ts builds them, so G{g}-P{n} ids match `npm run replay
 * -- <seed> --run-only`) with every offensive call a designed run, and writes a
 * compact 10 Hz trace of each run play for offline analysis. Reads only.
 *   node --import tsx scripts/diag/run-film-trace.ts [seed=7] [--games 2] [--out out/run/trace-seed7.json]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import type { Agent } from '../../src/sim/agent.js';
import type { PlaySim } from '../../src/sim/playsim.js';
import type { PlayStats } from '../../src/sim/types.js';

const { values: v, positionals } = parseArgs({ allowPositionals: true, options: { games: { type: 'string', default: '2' }, out: { type: 'string' } } });
const seed = Number(positionals[0] ?? 7);
const games = Number(v.games);
const out = v.out ?? `out/run/trace-seed${seed}.json`;
const r2 = (x: number) => Math.round(x * 100) / 100;

interface Rec { setup: Record<string, unknown>; frames: unknown[]; events: unknown[] }
function watch(sim: PlaySim): () => Rec {
  const s = sim as unknown as { offCall: any; defCall: any; los: number; ballY: number; events: any[] };
  const plan = (a: Agent) => (a.behavior as unknown as { plan?: { kind?: string; pullRole?: string; target?: Agent | null; climbTo?: Agent | null } }).plan;
  const setup = {
    concept: s.offCall.run?.id, scheme: s.offCall.run?.scheme, formation: s.offCall.formation.id, flip: s.offCall.flip,
    front: s.defCall.front?.id, coverage: s.defCall.coverage?.id, pressure: s.defCall.pressure?.id ?? null, los: s.los, ballY: s.ballY,
    agents: sim.agents.map((a) => ({ i: a.idx, team: a.team, slot: a.slot, pos: a.player.position, job: a.behavior.kind,
      plan: plan(a)?.kind ?? null, role: plan(a)?.pullRole ?? null, tgt: plan(a)?.target?.slot ?? null, climb: plan(a)?.climbTo?.slot ?? null })),
  };
  const frames: unknown[] = [];
  const tick = sim.tick.bind(sim);
  // Frames at t = 0, 0.1, 0.2, ... (the snap, then every second 20 Hz tick),
  // so frame k is at 0.1k s, the same clock as the 10 Hz NFL tracking.
  let n = 0;
  const record = () => {
    const c = sim.carrier;
    frames.push({ t: r2(sim.t), c: c ? c.idx : -1, ph: sim.phase,
      a: sim.agents.map((a) => {
        const e = a.engagement;
        const beh = a.behavior as unknown as { target?: Agent | null };
        let tg = -1;
        if (a.team === 'O') { try { tg = beh.target?.idx ?? -1; } catch { tg = -1; } }
        return [r2(a.body.pos.x), r2(a.body.pos.y), r2(a.body.vel.x), r2(a.body.vel.y), r2(a.body.facing),
          e ? (e.blocker === a || e.helpers.includes(a) ? e.defender.idx : e.blocker.idx) : -1, tg, a.isDown(sim.t) ? 1 : 0,
          a.team === 'O' ? (plan(a)?.kind ?? a.behavior.kind) : a.behavior.kind];
      }) });
  };
  sim.tick = () => {
    if (n === 0) record();
    tick();
    if (++n % 2 === 0) record();
  };
  return () => ({ setup, frames, events: s.events.map((e) => ({ t: r2(e.t), type: e.type, a: e.a ?? null, b: e.b ?? null, note: e.note ?? null })) });
}

const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const plays: unknown[] = [];
for (let g = 0; g < games; g++) {
  const caps = new WeakMap<PlayStats, () => Rec>();
  const res = simulateGame(home, away, { seed: seed + g, record: false, runOnly: true, hooks: {
    playResult(sim, kind) {
      if (kind !== 'scrimmage' || sim.isPass) return undefined;
      const get = watch(sim);
      const run = sim.run.bind(sim);
      sim.run = () => { const r = run(); caps.set(r.stats, get); return r; };
      return undefined;
    },
  } });
  for (const p of res.log) {
    const get = p.stats ? caps.get(p.stats) : undefined;
    if (!get || p.kind !== 'run') continue;
    plays.push({ id: `G${g + 1}-P${String(p.index + 1).padStart(3, '0')}`, yards: p.yards, text: p.text, nullified: !!p.nullified, down: p.down, dist: p.distance, ...get() });
  }
  console.log(`game ${g + 1} seed ${seed + g}: ${plays.length} run plays so far`);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(plays));
console.log(`-> ${out}`);
