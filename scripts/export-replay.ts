/**
 * Simulate a full game with frame recording and bake it into the standalone
 * replay viewer (viewer/replay.template.html → out/replay.html).
 *   npx tsx scripts/export-replay.ts [seed] [--out path] [--doc]
 * --doc wraps the output in a full HTML document (for opening from disk);
 * without it the file is a page fragment, ready to publish as-is.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Rng } from '../src/core/rng.js';
import { simulateGame, type PlayLog } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';

const args = process.argv.slice(2);
const seed = Number(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out') ?? 7);
const outIdx = args.indexOf('--out');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, outIdx >= 0 ? args[outIdx + 1] : 'out/replay.html');
const asDocument = args.includes('--doc');

const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const g = simulateGame(home, away, { seed, record: true });

const KIND_LABEL: Record<PlayLog['kind'], string> = {
  run: 'Run', pass: 'Pass', punt: 'Punt', fg: 'Field goal', xp: 'Extra point', kickoff: 'Kickoff',
  kneel: 'Kneel', penalty: 'Penalty', two: 'Two-point try',
};
const SHOWN_EVENTS = new Set(['handoff', 'throw', 'throwaway', 'catch', 'drop', 'pbu', 'interception', 'shed', 'sack', 'tackle', 'tackle_wrap', 'carrier_contact', 'missed_tackle', 'broken_tackle', 'fumble', 'recovery', 'touchdown', 'safety', 'out_of_bounds', 'scramble', 'slide', 'block_contact', 'block_exchange', 'block_collect', 'block_log', 'block_climb', 'squeeze']);
const tenth = (v: number) => Math.round(v * 10);
const r2 = (v: number) => Math.round(v * 100) / 100;

const plays = g.log.map((p) => {
  const base = {
    q: p.quarter, clk: p.clock, off: p.offense, down: p.down, dist: p.distance, yl: p.yardline,
    call: p.call, def: p.defense, text: p.text, yds: Math.round(p.yards), score: p.score, kindLabel: KIND_LABEL[p.kind],
    read: p.stats?.qbRead,
  };
  const rp = p.replay;
  if (!rp || rp.frames.length < 2) return base;
  const s = p.stats;
  const stats: Record<string, number | boolean> = {};
  if (s?.timeToThrow !== undefined) stats.ttt = r2(s.timeToThrow);
  if (s?.airYards !== undefined) stats.air = r2(s.airYards);
  if (s?.yac !== undefined && s.completed) stats.yac = r2(s.yac);
  if (s?.separation !== undefined && s.completed) stats.sep = r2(s.separation);
  if (s?.yardsBeforeContact !== undefined && s.rusher) stats.ybc = r2(s.yardsBeforeContact);
  if (s?.pressured) stats.pressured = true;
  return {
    ...base,
    los: rp.los,
    fd: rp.firstDownX,
    roster: rp.players.map((a) => [a.team, a.slot, a.name, a.jersey]),
    stats,
    ev: rp.events.filter((e) => SHOWN_EVENTS.has(e.type)).map((e) => [r2(e.t), e.type]),
    // Positions and facings are stored in tenths (ints) to keep the page small.
    frames: {
      t: rp.frames.map((f) => f.t),
      p: rp.frames.flatMap((f) => f.agents.map(tenth)),
      b: rp.frames.flatMap((f) => f.ball.map(tenth)),
      c: rp.frames.map((f) => f.carrier),
      s: rp.frames.flatMap((f) => (f.carrierPosture ?? [0, 0]).map(tenth)),
    },
  };
});

const quarters = [...g.quarterScores];
const last = quarters[quarters.length - 1];
if (!last || last.home !== g.score.home || last.away !== g.score.away) quarters.push({ ...g.score });

const data = {
  meta: {
    seed,
    home: { name: home.name, abbr: home.abbr, color: '#a3302a', alt: '#f4efe6', text: '#ffffff' },
    away: { name: away.name, abbr: away.abbr, color: '#1d4f91', alt: '#f2c14e', text: '#ffffff' },
    final: g.score,
    quarters,
  },
  plays,
};

const template = readFileSync(resolve(root, 'viewer/replay.template.html'), 'utf8');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('replay template is missing the data marker');
// Escape "</" so player names or play text can never close the script tag.
const json = JSON.stringify(data).replace(/<\//g, '<\\/');
let html = template.replace(marker, () => json);
if (asDocument) html = `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n</head>\n<body>\n${html}\n</body>\n</html>\n`;
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);
const filmed = plays.filter((p) => 'frames' in p).length;
console.log(`${home.name} ${g.score.home} — ${away.name} ${g.score.away} (seed ${seed}): ${g.log.length} log entries, ${filmed} filmed plays`);
console.log(`wrote ${outPath} (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
