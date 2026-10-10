/** Read saved Counter recordings without resimulation or outcome selection.
 * node --import tsx scripts/export-carrier-boundary-review.ts parent.json[.gz] carrier-only.json[.gz] output.html [bundled.json[.gz]]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import type { RatingKey } from '../src/players/types.js';
import type { PlayResult } from '../src/sim/types.js';
import { packReplayPlay } from './replay-data.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';

interface SavedReport {
  schema: string; sourceBefore: string; sourceAfter: string; fixtureSha256: string; profilesSha256: string;
  carrierSha256: string; scriptSha256: string; observerVerified: boolean;
  fixture: { id: string; los: number; firstDownX: number; down: number; seed: number; formation: string; flip: boolean };
  observerControls: Array<{ observed: boolean; signature: string }>;
  players: Array<{ team: 'O' | 'D'; slot: string; name: string; jersey: number; position: string; weightLb: number;
    heightIn: number; ratings: Record<RatingKey, number> }>;
  choices: Array<{ t: number; pos: { x: number; y: number }; vel: { x: number; y: number }; command: unknown }>;
  result: PlayResult;
}
const [parentPath, carrierPath, output, bundledPath, extra] = process.argv.slice(2);
if (!parentPath || !carrierPath || !output || extra)
  throw new Error('Usage: export-carrier-boundary-review.ts parent.json[.gz] carrier-only.json[.gz] output.html [bundled.json[.gz]]');
const paths = [parentPath, carrierPath, ...(bundledPath ? [bundledPath] : [])];
const inputs = paths.map(path => {
  const bytes = readFileSync(path), decoded = path.endsWith('.gz') ? gunzipSync(bytes) : bytes;
  return { path, inputSha256: createHash('sha256').update(decoded).digest('hex'), report: JSON.parse(decoded.toString()) as SavedReport };
});
for (const { report } of inputs) {
  if (report.schema !== 'carrier-boundary-review-v1' || report.sourceBefore !== report.sourceAfter || !report.observerVerified
    || report.observerControls.length !== 2 || report.observerControls[0].signature !== report.observerControls[1].signature
    || report.players.length !== 22 || !report.result.frames?.length || report.result.telemetry?.level !== 'full'
    || report.result.outcome === 'timeout' || !report.players.every(p => p.name && Number.isFinite(p.weightLb)))
    throw new Error('Expected source-pinned, observer-verified full Counter recordings with actual player profiles');
  if (report.fixtureSha256 !== inputs[0].report.fixtureSha256 || report.profilesSha256 !== inputs[0].report.profilesSha256
    || JSON.stringify(report.fixture) !== JSON.stringify(inputs[0].report.fixture)
    || JSON.stringify(report.players) !== JSON.stringify(inputs[0].report.players))
    throw new Error('Inputs/profile mismatch in paired boundary recordings');
}
const firstDifference = (a: SavedReport, b: SavedReport) => {
  for (let i = 0; i < Math.min(a.choices.length, b.choices.length); i++) {
    const x = a.choices[i], y = b.choices[i];
    if (JSON.stringify({ pos: x.pos, vel: x.vel, command: x.command }) !== JSON.stringify({ pos: y.pos, vel: y.vel, command: y.command }))
      return { t: x.t, samePosition: JSON.stringify(x.pos) === JSON.stringify(y.pos), sameVelocity: JSON.stringify(x.vel) === JSON.stringify(y.vel) };
  }
  return null;
};
const difference = firstDifference(inputs[0].report, inputs[1].report);
if (!difference || Math.abs(difference.t - 5.85) > 1e-9 || !difference.samePosition || !difference.sameVelocity)
  throw new Error('Carrier-only comparison no longer isolates the retained 5.85-second guard transition');
const labels = ['Parent controller', 'Carrier repair only', 'Current combined source'];
const ids = ['RB-BOUND-PARENT', 'RB-BOUND-REPAIR', 'RB-BOUND-CURRENT'];
const plays = inputs.map(({ report: p }, group) => {
  const r = p.result, setup = p.fixture;
  const text = `${labels[group]} · ${setup.id} · ${r.outcome} · ${r.offenseYards.toFixed(2)} credited yd. `
    + (group === 0 ? 'Watch 5.85 s onward: the runner intends to remain in bounds, but weak inward commands compete with downfield propulsion and repeatedly stop braking.'
      : group === 1 ? 'At 5.85 s the same runner begins a sustained braking redirect; ordinary World traction and contact decide the result.'
        : 'Includes the current recorded engine changes. Compare with the separately retained carrier-only case; this combined source is not a one-change causal experiment.')
    + ' Same setup/profiles/play seed. This Counter clip was selected retrospectively because of its diagnosed sideline failure. No league-rate inference.';
  const log: PlayLog = { index: 0, quarter: 0, clock: 0, offense: 'OFF', down: setup.down,
    distance: setup.firstDownX - setup.los, yardline: setup.los - 10, score: { home: 0, away: 0 },
    call: `${labels[group]} · Ace (Y right) · Counter`, defense: '4-3 Under · Cover 3',
    text, kind: r.kind, yards: r.offenseYards, stats: r.stats, outcome: r.outcome, duration: r.duration,
    plan: { personnel: '11', formation: setup.formation, qb: 'under', concept: 'counter', playAction: false, audible: false,
      defPersonnel: 'base43', front: 'under', coverage: 'cover3', called: 'cover3', family: 'cover3', shell: 'one-high', pressure: false, rushers: 4 },
    replay: { los: setup.los, firstDownX: setup.firstDownX, flip: setup.flip, frames: r.frames!, events: r.events, telemetry: r.telemetry,
      players: p.players.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.jersey, pos: a.position, weightLb: a.weightLb })),
      profiles: p.players.map(a => ({ position: a.position, heightIn: a.heightIn, weightLb: a.weightLb, ratings: { ...a.ratings } })) } };
  return { ...packReplayPlay(log, group), id: ids[group], sourceLabel: labels[group], sourceSha256: p.sourceBefore,
    fixtureId: setup.id, fixtureSeed: setup.seed, filmSelection: 'retrospective-diagnosed-boundary-failure',
    carrierSha256: p.carrierSha256, physicalSha256: p.observerControls[1].signature };
});
const cohort = `${inputs.length} saved full 11-on-11 Counter recordings, same generated roster/input/play seed. `
  + 'Parent and Carrier repair only are identical until the 5.85 s command at the sideline guard. The repair requests braking through unchanged movement physics; it does not place the runner inside the field or award yards. '
  + (bundledPath ? 'Current combined source includes other engine changes and is a separately labelled validation replay, not the isolated carrier comparison. ' : '')
  + 'One retrospectively diagnosed failure, not a representative NFL sample. These are controlled 1st-and-10 inputs, not a recorded game quarter/clock. Recording begins at snap. Use movement/contact layers and player inspection.';
const data = { meta: { sourceSha256: inputs.at(-1)!.report.sourceBefore, seed: 3, telemetryLevel: 'full', cohort,
  sourceComparison: inputs.map(({ report: p, inputSha256 }, i) => ({ label: labels[i], sourceSha256: p.sourceBefore,
    carrierSha256: p.carrierSha256, inputSha256 })), final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Controlled Offense', abbr: 'OFF', color: '#1d4f91', text: '#ffffff' },
  away: { name: 'Controlled Defense', abbr: 'DEF', color: '#a3302a', text: '#ffffff' } },
  games: inputs.map(({ report: p }, i) => ({ label: labels[i], seed: 3, sourceSha256: p.sourceBefore, final: { home: 0, away: 0 }, quarters: [] })),
  plays: compactReplayPlays(plays), catalog: { coverage: { cover3: 'Cover 3' }, front: { under: '4-3 Under' }, formation: { ace_11: 'Ace (Y right)' } } };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let template = readFileSync(resolve(root, 'viewer/replay.template.html'), 'utf8');
const marker = '/*__REPLAY_DATA__*/null', cardClock = "${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}";
if (!template.includes(marker) || !template.includes(cardClock)) throw new Error('Replay template markers changed');
template = template.replace(cardClock, '${esc(p.id)} · Controlled Counter');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
console.log(`Wrote ${plays.length} boundary-control recordings to ${output}; ${(html.length / 1024 / 1024).toFixed(2)} MB.`);
