/** Build one replay-viewer page from recorded lab arms (film.ts outputs) and
 * a seeded random sample of real NFL runs (2022 tracking, converted common
 * format) of the same concept families, for side-by-side review.
 * NFL clips are tracking dots: no facing (taken from motion), no ball track
 * (the ball rides with the QB until the labelled handoff, then the carrier).
 * node --import tsx scripts/diag/stretch/film-page.ts OUT.html ARM.json.gz ... [--nfl-seed 20261019] */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../../../src/game/game.js';
import { FRONTS } from '../../../src/playbook/defense.js';
import { COVERAGES } from '../../../src/playbook/defense.js';
import { FORMATIONS } from '../../../src/playbook/formations.js';
import { Rng } from '../../../src/core/rng.js';
import { packReplayPlay } from '../../replay-data.js';
import { compactReplayPlays } from '../../replay-telemetry-packing.js';

const args = process.argv.slice(2);
const opt = (n: string, d: string) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : d; };
const nflSeed = Number(opt('--nfl-seed', '20261019'));
const [out, ...armPaths] = args;
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
type Arm = { label: string; changed: string[]; commit: string; dirtyFiles: string[]; casesSha256: string; plays: Array<Record<string, unknown>> };
const arms: Arm[] = armPaths.map(p => JSON.parse(gunzipSync(readFileSync(p)).toString()));

// ---- NFL reference: seeded random draw per concept family, before outcomes.
type Common = { id: string; yards: number; players: { side: 'O' | 'D'; group: string }[]; dt: number;
  xy: (number | null)[][]; ball_y: number; events: Record<string, number>; carrier: number | null; cell?: { concept?: string } };
const ytg = JSON.parse(readFileSync('out/mechanics/nfl-ytg.json', 'utf8')) as Record<string, number>;
const nflRows: Common[] = gunzipSync(readFileSync('out/mechanics/nfl-plays.jsonl.gz')).toString().split('\n').filter(Boolean)
  .map(l => JSON.parse(l)).filter((r: Common & { kind: string }) => r.kind === 'run' && r.carrier !== null
    && r.events?.handoff !== undefined && r.players[r.carrier!]?.group === 'RB' && (ytg[r.id] ?? 0) >= 60);
const qbOf = (r: Common) => r.players.findIndex(p => p.side === 'O' && p.group === 'QB');
const at = (r: Common, i: number, k: number): [number, number] | null => {
  const row = r.xy[Math.min(k, r.xy.length - 1)], x = row[2 * i], y = row[2 * i + 1];
  return x === null || y === null ? null : [x, y];
};
const tossed = (r: Common) => { const q = qbOf(r), k = Math.round(r.events.handoff / r.dt); const a = at(r, q, k), b = at(r, r.carrier!, k);
  return !!a && !!b && Math.hypot(a[0] - b[0], a[1] - b[1]) > 2.5; };
const families: Array<[string, string, (r: Common) => boolean, number]> = [
  ['counter', 'NFL COUNTER', r => r.cell?.concept === 'COUNTER' && !tossed(r), 3],
  ['power', 'NFL POWER', r => r.cell?.concept === 'POWER' && !tossed(r), 3],
  ['toss', 'NFL toss (carrier > 2.5 yd from the QB at the exchange)', r => tossed(r), 3],
  ['duo', 'NFL MAN family (duo is one of its runs)', r => r.cell?.concept === 'MAN' && !tossed(r), 2],
  ['insideZone', 'NFL INSIDE ZONE', r => r.cell?.concept === 'INSIDE ZONE' && !tossed(r), 2],
  ['outsideZone', 'NFL OUTSIDE ZONE', r => r.cell?.concept === 'OUTSIDE ZONE' && !tossed(r), 2],
];
const rng = new Rng(nflSeed);
const weight: Record<string, number> = { QB: 220, OL: 312, TE: 250, WR: 200, RB: 215, DL: 300, LB: 240, DB: 198 };
const nflPlays = families.flatMap(([scheme, name, pick, n]) => {
  const pool = nflRows.filter(pick).sort((a, b) => a.id < b.id ? -1 : 1), chosen: Common[] = [];
  while (chosen.length < n && pool.length) chosen.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
  return chosen.map((r) => {
    const q = qbOf(r), counts: Record<string, number> = {};
    const players = r.players.map(p => { counts[p.side + p.group] = (counts[p.side + p.group] ?? 0) + 1;
      return { team: p.side, slot: `${p.group}${counts[p.side + p.group]}`, name: `NFL ${p.group}`, jersey: counts[p.side + p.group], pos: p.group, weightLb: weight[p.group] ?? 230 }; });
    const end = r.events.end ?? (r.xy.length - 1) * r.dt;
    const facing = players.map(p => p.team === 'O' ? 0 : Math.PI);
    const frames = r.xy.map((_, k) => {
      const t = Math.round(k * r.dt * 100) / 100, carrier = t >= r.events.handoff ? r.carrier! : q;
      const agents = r.players.flatMap((_, i) => {
        const p = at(r, i, k) ?? [0, 0], a = at(r, i, Math.max(0, k - 1)), b = at(r, i, k + 1);
        if (a && b && Math.hypot(b[0] - a[0], b[1] - a[1]) > .06) facing[i] = Math.atan2(b[1] - a[1], b[0] - a[0]);
        return [40 + p[0], p[1], facing[i]];
      });
      const c = at(r, carrier, k) ?? [0, r.ball_y];
      return { t, agents, ball: [40 + c[0], c[1], 1] as [number, number, number], carrier };
    }).filter(f => f.t <= end + 1e-6);
    const events = [{ t: r.events.handoff, type: 'handoff', a: q, b: r.carrier! },
      ...(r.events.first_contact !== undefined ? [{ t: r.events.first_contact, type: 'carrier_contact', a: r.carrier!, b: r.carrier! }] : [])];
    const log = { index: 0, quarter: 1, clock: 900, offense: 'OFF', down: 1, distance: 10, yardline: 30,
      call: `NFL 2022 · ${name}`, defense: 'NFL', yards: r.yards, score: { home: 0, away: 0 }, kind: 'run',
      text: `NFL reference · ${r.id} · ${name} · ${r.yards} yd · 2022 tracking dots, 10 Hz; facing from motion; ball shown with the QB, then the carrier from the labelled handoff. Drawn at random (seed ${nflSeed}) before outcomes.`,
      outcome: 'tackle', stats: {} as PlayLog['stats'],
      plan: { personnel: '-', formation: 'nfl', qb: 'under', concept: scheme, playAction: false, audible: false, defPersonnel: '-',
        front: 'nfl', coverage: 'nfl', called: 'nfl', family: 'nfl', shell: '-', pressure: false },
      replay: { los: 40, firstDownX: 50, flip: false, frames, events, telemetry: undefined, players,
        profiles: players.map(p => ({ position: p.pos, heightIn: 74, weightLb: p.weightLb, ratings: {} })) } } as unknown as PlayLog;
    return { ...packReplayPlay(log, 0), id: `NFL-${r.id}`, caseId: r.id, note: name };
  });
});

const games = [{ label: 'NFL 2022 reference (random)', seed: nflSeed, final: { home: 0, away: 0 }, quarters: [] },
  ...arms.map(a => ({ label: a.label, seed: 0, commit: a.commit, flags: a.changed, final: { home: 0, away: 0 }, quarters: [] }))];
const plays = [
  ...nflPlays.map((p, i) => ({ ...p, game: 0, index: i })),
  ...arms.flatMap((a, g) => a.plays.map((p, i) => ({ ...p, game: g + 1, index: i,
    id: `${g === 0 ? 'BEFORE' : g === 1 ? 'AFTER' : 'ARM' + g}-${String(i + 1).padStart(2, '0')}` }))),
] as Array<ReturnType<typeof packReplayPlay>>;
const title = 'Run Game Film Review';
const data = { meta: { sourceSha256: arms.map(a => a.commit).join(' / '), telemetryLevel: 'standard',
    cohort: 'Same lab cases in each sim version (six labelled witnesses, then a random ordinary sample drawn before outcomes), beside a random sample of real 2022 NFL runs of the same concept families. Lab plays start 70 yd from the goal; NFL clips have 60+ yd to the goal.',
    seed: nflSeed, final: { home: 0, away: 0 }, quarters: [],
    home: { name: 'Offense', abbr: 'OFF', color: '#1d4f91', text: '#ffffff' },
    away: { name: 'Defense', abbr: 'DEF', color: '#a3302a', text: '#ffffff' } },
  games, plays: compactReplayPlays(plays),
  catalog: { coverage: { ...Object.fromEntries(COVERAGES.map(c => [c.id, c.name])), nfl: 'NFL (unlabelled)' },
    front: { ...Object.fromEntries(FRONTS.map(f => [f.id, f.name])), nfl: 'NFL (unlabelled)' },
    formation: { ...Object.fromEntries(FORMATIONS.map(f => [f.id, f.name])), nfl: 'NFL tracking' } } };
let template = readFileSync('viewer/replay.template.html', 'utf8');
const swap = (from: string, to: string) => { if (!template.includes(from)) throw new Error(`Viewer marker changed: ${from.slice(0, 60)}`); template = template.replace(from, to); };
swap('<title>Gridiron Film Room</title>', `<title>${title}</title>`);
swap('<h1>Find your next set of plays</h1>', `<h1>${title}</h1>`);
swap("key === 'game' ? `Game ${Number(value) + 1} · seed ${games[value].seed}`", "key === 'game' ? games[value].label");
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Replay template is missing its data marker');
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n${template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/'))}\n</body></html>\n`;
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`${plays.length} clips (${nflPlays.length} NFL) -> ${out} (${(html.length / 1024 / 1024).toFixed(2)} MB) sha256 ${sha(html)}`);
