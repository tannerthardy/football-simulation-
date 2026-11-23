/** Run the SAME play of a recorded game on another engine setting, and cut it for the film room.
 *   capture:  node --import tsx scripts/film-flag-replay.mts capture --game G --index N[,N2...] --out DIR        (Coverage's census recipe: teams from Rng(11), leagueSample(team, 11+G), seed 11+G; N = position in the game's log)
 *   replay:   [FLAGS] node --import tsx scripts/film-flag-replay.mts replay --out OUT.json DIR/G-N.json [...]    (any build; the play's setup is the captured PlaySetup, so the call, the players and the play's seed are the same)
 * The replay writes a film-room collect file (`collect`'s format) with the play recorded and its read-only art sheet. Same setup, different engine flags: a play whose inputs reach the flagged code differs, the rest is identical. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deserialize, serialize } from 'node:v8';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam, leagueSample } from '../src/league/team.js';
import { PlaySim } from '../src/sim/playsim.js';
import { ScoutingReport } from '../src/sim/recognition.js';
import { CoverageScouting } from '../src/sim/qbmind.js';
import { packReplayPlay } from './replay-data.js';
import { installPlayArtTap, takeSheets } from './play-art.js';
import { sourceVersion } from './source-version.js';

const mode = process.argv[2];
const arg = (n: string, d = '') => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
if (mode === 'capture') {
  const g = Number(arg('--game')), want = arg('--index').split(',').map(Number), out = arg('--out'); mkdirSync(out, { recursive: true });
  const rng = new Rng(11);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  let last: Buffer | null = null; const setups: { bytes: Buffer; los: number; cov: string; form: string }[] = [];
  const res = simulateGame(leagueSample(home, 11 + g), leagueSample(away, 11 + g), { seed: 11 + g, record: true, recordLevel: 'light', hooks: {
    playSetup: (s: any) => { last = serialize(s); },
    playResult: (sim: any) => { if (last) setups.push({ bytes: last, los: sim.los, cov: sim.defCall?.coverage?.id, form: sim.offCall?.formation?.id }); last = null; return undefined; } } as any });
  // The log entries with a recorded play, in order, against the captured scrimmage setups in order (the same alignment as the film setup capture).
  let j = 0; const hits = new Map<number, Buffer>();
  res.log.forEach((q: any, idx: number) => {
    if (!q.replay || !q.plan) return;
    for (let i = j; i < setups.length; i++) { const s = setups[i]; if (Math.abs(s.los - q.replay.los) < 0.01 && s.form === q.plan.formation && s.cov === q.plan.coverage) { j = i + 1; if (want.includes(idx)) hits.set(idx, s.bytes); break; } }
  });
  for (const n of want) {
    const p: any = res.log[n]; const bytes = hits.get(n); if (!p || !bytes) { console.error(`game ${g} index ${n}: no setup`); continue; }
    const { replay, ...meta } = p; // the baseline log entry without its frames: the replay re-records
    writeFileSync(`${out}/${g}-${n}.json`, JSON.stringify({ game: g, index: n, meta, setup: bytes.toString('base64') }));
    console.error(`captured ${g}-${n}: ${p.text}`);
  }
} else if (mode === 'replay') {
  const outFile = arg('--out'); const files = process.argv.slice(3).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--out');
  installPlayArtTap(); const plays: unknown[] = [];
  for (const f of files) {
    const saved = JSON.parse(readFileSync(f, 'utf8')); const s: any = deserialize(Buffer.from(saved.setup, 'base64'));
    if (s.scouting) Object.setPrototypeOf(s.scouting, ScoutingReport.prototype);
    if (s.coverageScouting) Object.setPrototypeOf(s.coverageScouting, CoverageScouting.prototype);
    takeSheets(); const sim = new PlaySim(s); const r: any = sim.run(); const sheet = takeSheets()[0];
    const meta = saved.meta; const st = r.stats ?? sim.stats ?? {};
    const name = (slot: string) => sim.agents.find((a: any) => a.slot === slot)?.name ?? slot;
    const recvA = sim.agents.find((a: any) => a.player?.id === st.receiver); const tgtA = sim.agents.find((a: any) => a.player?.id === st.target);
    const text = r.outcome === 'touchdown' && st.completed ? `${name('QB')} pass complete to ${recvA?.name ?? '?'} for ${Math.round(r.yards)} yds — TOUCHDOWN`
      : st.completed ? `${name('QB')} pass complete to ${recvA?.name ?? '?'} for ${Math.round(r.yards)} yds`
      : st.sacked ? `${name('QB')} sacked for ${Math.round(r.yards)} yds` : st.interceptedBy ? `${name('QB')} pass intercepted` : `${name('QB')} pass to ${tgtA?.name ?? '?'} incomplete`;
    const entry: any = { ...meta, text, yards: r.turnover ? r.offenseYards : r.yards, stats: r.stats, segments: r.segments, outcome: r.outcome, duration: r.duration,
      plan: { ...meta.plan, coverage: sim.defCall.coverage.id, family: sim.defCall.coverage.family ?? sim.defCall.coverage.id, shell: sim.defCall.coverage.shell, checkedOn: sim.defCall.check?.when },
      replay: { frames: r.frames, players: sim.agents.map((a: any) => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey, pos: a.player.position, weightLb: a.player.measurables.weightLb })),
        los: s.los, firstDownX: s.firstDownX, flip: meta.replay?.flip ?? false, events: r.events, telemetry: r.telemetry,
        profiles: r.telemetry ? sim.agents.map((a: any) => ({ position: a.player.position, heightIn: a.player.measurables.heightIn, weightLb: a.player.measurables.weightLb, ratings: { ...a.player.ratings } })) : undefined } };
    plays.push(packReplayPlay(entry, saved.game, sheet));
    console.error(`replayed ${saved.game}-${saved.index}: ${text}`);
  }
  writeFileSync(outFile, JSON.stringify({ seed: 11, games: 0, source: sourceVersion(), plays }));
}
