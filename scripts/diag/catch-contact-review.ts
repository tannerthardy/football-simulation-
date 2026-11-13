/** Exact native snap contexts and observational catch/contact traces.
 * --collect captures original calls, fatigue, shadow preferences and scouting.
 * --replay holds those inputs fixed across engine candidates, not later games.
 * Large contexts/traces belong in ignored out/, never in tracked receipts.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { Rng } from '../../src/core/rng.js';
import { Game } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { ScoutingReport } from '../../src/sim/recognition.js';
import { CoverageScouting } from '../../src/sim/qbmind.js';
import type { PlayResult } from '../../src/sim/types.js';
import { sourceVersion } from '../source-version.js';

type Side = 'home' | 'away';
type SavedSetup = Omit<PlaySetup, 'seed' | 'energy' | 'scouting' | 'coverageScouting'> & {
  seed: number; energy: [string, number][];
  scouting: { strength: number; cells: [string, { n: number; passes: number; expected: number }][] };
  coverageScouting: Record<string, unknown>;
};
interface Clip { id: string; cohort: number; seed: number; setup: SavedSetup; signature: string; result: PlayResult }
interface Contexts { source: string; method: string; clips: Clip[] }
const selected = [
  { cohort: 101, seeds: [107, 108], ids: ['S107-P214', 'S107-P233', 'S108-P143'] },
  { cohort: 202, seeds: [204, 207], ids: ['S204-P41', 'S204-P60', 'S207-P161'] },
];
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
function signature(sim: PlaySim, result: PlayResult): string {
  return hash({ result: { ...result, frames: undefined, telemetry: undefined },
    bodies: sim.agents.map(a => a.body), rng: sim.rng, perception: sim.perception });
}
function restore(s: SavedSetup, record: boolean): PlaySim {
  const scouting = new ScoutingReport(s.scouting.strength);
  Reflect.set(scouting, 'cells', new Map(structuredClone(s.scouting.cells)));
  const coverageScouting = Object.assign(new CoverageScouting(), structuredClone(s.coverageScouting));
  return new PlaySim({ ...s, energy: new Map(s.energy), scouting, coverageScouting,
    record, recordEvery: 1, recordLevel: 'full' });
}
function collect(panels = selected): Contexts {
  const source = sourceVersion(), clips: Clip[] = [];
  for (const panel of panels) for (const seed of panel.seeds) {
    const rng = new Rng(panel.cohort);
    const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: .55 });
    const away = generateTeam(rng, 'Comets', 'COM', { strength: .55 });
    let game: Game, offCall: PlaySetup['offCall'], defCall: PlaySetup['defCall'], prefs: PlaySetup['manPrefs'];
    game = new Game(home, away, { seed, record: false, hooks: { playResult(sim, kind) {
      const id = `S${seed}-P${Reflect.get(game, 'playIndex') + 1}`;
      if (kind !== 'scrimmage' || !panel.ids.includes(id)) return undefined;
      const off: Side = sim.qb.player.id.startsWith(home.abbr) ? 'home' : 'away';
      const def: Side = off === 'home' ? 'away' : 'home';
      const scouting = Reflect.get(game, 'scouting')[def] as ScoutingReport;
      const coverageScouting = Reflect.get(game, 'coverageScouting')[off] as CoverageScouting;
      // Deep-copy now: future game observations mutate existing scout cells.
      const setup: SavedSetup = structuredClone({
        offense: Object.fromEntries(sim.offense.map(a => [a.slot, a.player])),
        defense: Object.fromEntries(sim.defense.map(a => [a.slot, a.player])),
        offCall, defCall, manPrefs: prefs, los: sim.los, ballY: sim.ballY,
        firstDownX: sim.firstDownX, seed: sim.rng.key,
        energy: [...Reflect.get(game, 'energy')], hurry: sim.hurry,
        down: sim.snapContext.down, audibles: true,
        scouting: { strength: Reflect.get(scouting, 'strength'), cells: [...Reflect.get(scouting, 'cells')] },
        coverageScouting: { ...coverageScouting },
      });
      const repeat = restore(setup, true);
      if (hash(repeat.agents.map(a => a.body)) !== hash(sim.agents.map(a => a.body)))
        throw new Error(`Initial native bodies differ: ${id}`);
      const result = sim.run(), recorded = repeat.run();
      const sig = signature(sim, result);
      if (sig !== signature(repeat, recorded)) throw new Error(`Native reexecution/observer mismatch: ${id}`);
      clips.push({ id, cohort: panel.cohort, seed, setup, signature: sig, result });
      return result;
    } } });
    // Observe actual coordinator calls without another choice or random draw.
    for (const oc of Object.values(Reflect.get(game, 'oc')) as Array<{
      call: (...args: never[]) => PlaySetup['offCall']
    }>) {
      const original = oc.call.bind(oc);
      oc.call = (...args) => { offCall = original(...args); return offCall; };
    }
    for (const dc of Object.values(Reflect.get(game, 'dc')) as Array<{
      call: (...args: never[]) => { call: PlaySetup['defCall']; prefs: PlaySetup['manPrefs'] }
    }>) {
      const original = dc.call.bind(dc);
      dc.call = (...args) => { const choice = original(...args); defCall = choice.call; prefs = choice.prefs; return choice; };
    }
    game.play();
    console.log(`Captured exact native contexts: ${seed}`);
  }
  if (source !== sourceVersion() || clips.length !== panels.flatMap(p => p.ids).length)
    throw new Error('Changed source or missing native contexts');
  return { source, method: 'Original coordinator calls, man preferences, fatigue and both learned scout histories. Recorded isolated snap matches result, all bodies, RNG and perception exactly.', clips };
}
function replay(input: Contexts, out: string): void {
  const source = sourceVersion();
  const clips = input.clips.map(c => {
    const sim = restore(c.setup, true), rows: unknown[] = [];
    const tick = sim.tick.bind(sim);
    const state = () => sim.agents.map(a => ({ pos: { ...a.pos }, vel: { ...a.vel },
      support: structuredClone(a.body.support), behavior: a.behavior.kind }));
    sim.tick = () => {
      const t = sim.t, before = state(); tick();
      rows.push({ t, before, after: state(), intents: structuredClone(sim.intents),
        contacts: sim.lastStep?.contacts, groundImpulse: sim.lastStep?.groundImpulse,
        work: sim.lastStep?.work });
    };
    const result = sim.run(), sig = signature(sim, result);
    if (source === input.source && sig !== c.signature) throw new Error(`Saved context mismatch: ${c.id}`);
    const plain = restore(c.setup, false), unrecorded = plain.run();
    if (sig !== signature(plain, unrecorded)) throw new Error(`Recording changed physical execution: ${c.id}`);
    return { id: c.id, result: { ...result, frames: undefined, telemetry: undefined },
      signature: sig, matchesBaseline: sig === c.signature, recordingVerified: true,
      players: sim.agents.map(a => ({ id: a.player.id, team: a.team, slot: a.slot, profile: a.profile })),
      rows, frames: result.frames, telemetry: result.telemetry };
  });
  if (source !== sourceVersion()) throw new Error('Source changed during replay');
  writeFileSync(`${out}.traces.json.gz`, gzipSync(JSON.stringify({ source, baselineSource: input.source, inputSha256: hash(input), clips })));
  const summaries = clips.map(({ rows, frames, telemetry, ...c }) => c);
  writeFileSync(out, JSON.stringify({ source, baselineSource: input.source, inputSha256: hash(input), clips: summaries }, null, 2) + '\n');
  console.log(JSON.stringify(summaries.map(c => ({ id: c.id, yac: c.result.stats.yac,
    outcome: c.result.outcome, misses: c.result.stats.missedTackles, broken: c.result.stats.brokenTackles,
    matchesBaseline: c.matchesBaseline }))));
}
const args = process.argv.slice(2), mode = args[0];
const out = args[mode === '--replay' ? 2 : 1];
if (!out || !['--collect', '--replay'].includes(mode))
  throw new Error('Usage: catch-contact-review.ts --collect out/contexts.json [selection.json] | --replay out/contexts.json out/report.json');
mkdirSync(dirname(out), { recursive: true });
if (mode === '--collect') writeFileSync(out, JSON.stringify(collect(args[2] ? JSON.parse(readFileSync(args[2], 'utf8')) : selected)) + '\n');
else replay(JSON.parse(readFileSync(args[1], 'utf8')) as Contexts, out);
