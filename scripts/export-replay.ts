/**
 * Record games and bake a searchable concept library into the replay viewer.
 *   npm run replay -- [seed] [--games 6] [--out path] [--doc] [--telemetry standard|full] [--run-only]
 * --run-only makes every offensive scrimmage call a designed run (run-game film).
 * Teams are generated once; games use consecutive seeds and reset game state.
 * --doc produces a standalone HTML document for opening from disk.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import { COVERAGES, FRONTS } from '../src/playbook/defense.js';
import { FORMATIONS } from '../src/playbook/formations.js';
import { packReplayPlay, replayOptions } from './replay-data.js';
import { installPlayArtTap, matchSheets, takeSheets } from './play-art.js';
import { sourceVersion } from './source-version.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';

const options = replayOptions(process.argv.slice(2));
installPlayArtTap();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, options.out);
const rng = new Rng(options.seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const plays: ReturnType<typeof packReplayPlay>[] = [];
const games = [];
for (let i = 0; i < options.games; i++) {
  const seed = options.seed + i;
  takeSheets();
  const g = simulateGame(home, away, { seed, record: true, recordLevel: options.telemetry, runOnly: options.runOnly });
  const art = matchSheets(g.log, takeSheets());
  const quarters = [...g.quarterScores];
  const last = quarters[quarters.length - 1];
  if (!last || last.home !== g.score.home || last.away !== g.score.away) quarters.push({ ...g.score });
  games.push({ seed, final: g.score, quarters });
  const clips = g.log.map((p) => packReplayPlay(p, i, art.get(p)));
  plays.push(...clips);
  console.log(`Game ${i + 1} · seed ${seed}: ${home.name} ${g.score.home} — ${away.name} ${g.score.away} · ${clips.filter((p) => 'frames' in p).length} filmed plays`);
}
const data = {
  meta: {
    ...games[0],
    sourceSha256: sourceVersion(),
    telemetryLevel: options.telemetry,
    home: { name: home.name, abbr: home.abbr, color: '#a3302a', alt: '#f4efe6', text: '#ffffff' },
    away: { name: away.name, abbr: away.abbr, color: '#1d4f91', alt: '#f2c14e', text: '#ffffff' },
  },
  games, plays: compactReplayPlays(plays),
  catalog: {
    coverage: Object.fromEntries(COVERAGES.map((c) => [c.id, c.name])),
    front: Object.fromEntries(FRONTS.map((f) => [f.id, f.name])),
    formation: Object.fromEntries(FORMATIONS.map((f) => [f.id, `${f.name} · ${f.personnel}`])),
  },
};
const template = readFileSync(resolve(root, 'viewer/replay.template.html'), 'utf8');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('replay template is missing the data marker');
// Escape "</" so player names or play text can never close the script tag.
const json = JSON.stringify(data).replace(/<\//g, '<\\/');
let html = template.replace(marker, () => json);
if (options.document) html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n<body>\n${html}\n</body>\n</html>\n`;
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);
console.log(`${plays.filter((p) => 'frames' in p).length} clips across ${games.length} games; wrote ${outPath} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
