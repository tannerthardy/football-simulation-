/**
 * The film room: a small set of pass plays from the engine as it is now, each with the call drawn before the snap, for a person to read.
 *
 *   node --import tsx scripts/film-room.ts collect --seed 101 --games 4 --out out/film/c101.json      (simulate; keep the pass plays that were filmed)
 *   node --import tsx scripts/film-room.ts build out/film/c101.json [more.json ...] [--random 60] [--zone-yac 20] [--min-yac 10] [--pick-seed 1] [--issues issues.txt] [--out out/film/film-room.html]
 *
 * `collect` is the engine's own game (scripts/export-replay.ts's recipe: the same teams, simulateGame, the read-only play-art tap) and keeps every filmed
 * scrimmage pass play with its art sheet. `build` draws the set: RANDOM ordinary pass plays (any result: completions, incompletions, sacks, throwaways)
 * and ZONE_YAC completions against a zone or match coverage with a catcher gaining MIN_YAC or more after the catch, then bakes them into the replay viewer
 * (viewer/replay.template.html) as one standalone page with the film-room panels (labels, the QB's reads on their footwork steps, known issues).
 * Nothing here is read by any player or changes a play; the set is a sample of the game as played.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam, leagueSample } from '../src/league/team.js';
import { COVERAGE_BY_ID, COVERAGES, FRONTS } from '../src/playbook/defense.js';
import { FORMATIONS } from '../src/playbook/formations.js';
import { packReplayPlay } from './replay-data.js';
import { installPlayArtTap, matchSheets, takeSheets } from './play-art.js';
import { sourceVersion } from './source-version.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), mode = args[0];
const opt = (n: string, d: string) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };

if (mode === 'collect') {
  const seed = Number(opt('--seed', '101')), games = Number(opt('--games', '4')), first = Number(opt('--first', '0')), LEAGUE = args.includes('--league-sample'), out = opt('--out', `out/film/c${seed}.json`);
  installPlayArtTap();
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const kept: unknown[] = [];
  for (let i = 0; i < games; i++) {
    takeSheets();
    // --league-sample: Coverage's census games (teams from Rng(seed), each game's rosters from leagueSample(team, seed + game), game seed seed + game).
    const g = simulateGame(LEAGUE ? leagueSample(home, seed + first + i) : home, LEAGUE ? leagueSample(away, seed + first + i) : away, { seed: seed + first + i, record: true, recordLevel: 'light' });
    const art = matchSheets(g.log, takeSheets());
    let n = 0;
    for (const p of g.log) {
      if (p.kind !== 'pass' || p.nullified || !p.replay || !art.get(p)) continue;
      kept.push(packReplayPlay(p, first + i, art.get(p))); n++;
    }
    console.error(`game ${i + 1}/${games} (seed ${seed + first + i}): ${n} pass plays kept`);
  }
  mkdirSync(resolve(root, dirname(out)), { recursive: true });
  writeFileSync(resolve(root, out), JSON.stringify({ seed, games, source: sourceVersion(), plays: kept }));
  console.error(`${kept.length} plays -> ${out}`);
} else if (mode === 'build') {
  const files = args.slice(1).filter((a, i, all) => !a.startsWith('--') && (i === 0 || !all[i - 1].startsWith('--')));
  const nRandom = Number(opt('--random', '60')), nZone = Number(opt('--zone-yac', '20')), minYac = Number(opt('--min-yac', '10')), pickSeed = Number(opt('--pick-seed', '1'));
  const out = opt('--out', 'out/film/film-room.html');
  const issuesFile = opt('--issues', ''); const issuesText = issuesFile ? readFileSync(resolve(root, issuesFile), 'utf8') : '';
  const all: any[] = []; let source = ''; let seeds: number[] = [];
  // A file may be given as tag=path: its plays carry that tag (a second arm of the same games, e.g. a flag set on), and --select rows may name the tag.
  for (const f0 of files) { const m = /^([a-z0-9]+)=(.+)$/.exec(f0); const tag = m ? m[1] : ''; const f = m ? m[2] : f0; const j = JSON.parse(readFileSync(resolve(root, f), 'utf8')); all.push(...j.plays.map((p: any) => ({ ...p, id: `${j.seed}-${tag ? tag + '-' : ''}${p.id}`, gameSeed: j.seed + p.game, fileTag: tag }))); source = j.source; seeds.push(j.seed); }
  const isZoneYac = (p: any) => p.flags.complete && (p.stats?.yac ?? 0) >= minYac && COVERAGE_BY_ID[p.plan?.coverage]?.man === false;
  const rng = new Rng(pickSeed);
  const shuffle = <T>(a: T[]) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const zonePool = shuffle(all.filter(isZoneYac));
  const zone = zonePool.slice(0, nZone);
  const taken = new Set(zone.map((p) => p.id));
  const random = shuffle(all.filter((p) => !taken.has(p.id) && !isZoneYac(p))).slice(0, nRandom);
  const dnd = (p: any) => `${['', '1st', '2nd', '3rd', '4th'][p.down] ?? p.down} & ${p.dist}`;
  // --select rows.json: a hand-picked page instead of the random draw; each row {game, index, owner, receiver, note} names a play of a collected game (game index and log index) and, for the owner check, the defender who owns the receiver.
  const selFile = opt('--select', ''); const sel: any[] = selFile ? JSON.parse(readFileSync(resolve(root, selFile), 'utf8')) : [];
  const picked: { p: any; set: string; row?: any }[] = selFile ? sel.map((row) => ({ p: all.find((q) => (row.gameSeed !== undefined ? q.gameSeed === row.gameSeed : q.game === row.game) && q.index === row.index && (q.fileTag ?? '') === (row.tag ?? '')), set: 'check', row })).filter((x) => x.p)
    : [...random.map((p) => ({ p, set: 'random' })), ...zone.map((p) => ({ p, set: 'zone-yac' }))];
  if (selFile) console.error(`select: ${picked.length} of ${sel.length} rows found`);
  const plays = picked.map(({ p, set, row }, i) => {
    const st = p.stats ?? {};
    return { ...p, id: `F${String(i + 1).padStart(2, '0')}`, game: 0, fixtureSeed: p.gameSeed, dist: Math.round(p.dist), film: {
      set, owner: row?.owner, recv: row?.receiver, note: row?.note, n: i + 1, concept: p.art?.offense.name ?? p.concept.name, formation: p.art?.offense.formation, coverage: p.art?.defense.coverage, down: dnd(p), yl: p.yl,
      result: p.text, yds: p.yds, air: st.air ?? null, yac: st.yac ?? null, ttt: st.ttt ?? null, complete: !!p.flags.complete, sack: !!p.flags.sack, gameSeed: p.gameSeed,
    } };
  });
  // The picked plays' keys, so a play can be replayed exactly: the game (seed 101 + game index; the teams come from Rng(101)) and the play's place in its log.
  writeFileSync(resolve(root, out.replace(/\.html$/, '') + '.keys.json'), JSON.stringify(plays.map((p: any) => ({ f: p.id, set: p.film.set, gameSeed: p.gameSeed, game: p.gameSeed - Number(seeds[0]), index: p.index, q: p.q, clk: p.clk, down: p.down, dist: p.dist, yl: p.yl, concept: p.plan?.concept, coverage: p.plan?.coverage, formation: p.plan?.formation, front: p.plan?.front, text: p.text })), null, 1));
  console.error(`pool ${all.length} pass plays; zone 10+ YAC pool ${zonePool.length}; picked ${random.length} random + ${zone.length} zone-yac`);
  const data = {
    meta: { seed: seeds[0], games: [], final: { home: 0, away: 0 }, quarters: [], sourceSha256: source,
      home: { name: 'Ironmen', abbr: 'IRN', color: '#a3302a', alt: '#f4efe6', text: '#ffffff' }, away: { name: 'Comets', abbr: 'COM', color: '#1d4f91', alt: '#f2c14e', text: '#ffffff' },
      telemetryLevel: 'light', film: { pageVersion: opt('--page-version', ''), builtAt: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC', issues: issuesText, seeds, pool: all.length, zonePool: zonePool.length, random: selFile ? 0 : random.length, zone: selFile ? 0 : zone.length, minYac, pickSeed, source } },
    games: [], plays: compactReplayPlays(plays as never),
    catalog: { coverage: Object.fromEntries(COVERAGES.map((c) => [c.id, c.name])), front: Object.fromEntries(FRONTS.map((f) => [f.id, f.name])), formation: Object.fromEntries(FORMATIONS.map((f) => [f.id, `${f.name} · ${f.personnel}`])) },
  };
  const template = readFileSync(resolve(root, 'viewer/replay.template.html'), 'utf8');
  const marker = '/*__REPLAY_DATA__*/null';
  if (!template.includes(marker)) throw new Error('replay template is missing the data marker');
  const json = JSON.stringify(data).replace(/<\//g, '<\\/');
  const html = opt('--fragment', '') !== '' || args.includes('--fragment') ? `<title>Pass Film Room</title>\n${template.replace(marker, () => json).replace(/^<title>[^\n]*\n/, '')}` : `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Pass game film room</title>\n</head>\n<body>\n${template.replace(marker, () => json)}\n</body>\n</html>\n`;
  mkdirSync(resolve(root, dirname(out)), { recursive: true });
  writeFileSync(resolve(root, out), html);
  console.error(`wrote ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB), ${plays.length} plays`);
} else console.error('usage: film-room.ts collect|build (see the file header)');
