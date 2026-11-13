/** Does a rating reach the field? Hold lineup, bodies, roster seed, play call and play seed fixed, change
 * ONE rating on ONE player (1 vs 99), and report the first difference in what that player consumed,
 * requested, was controlled to, or achieved. Nothing is wired or tuned; this reads existing behavior.
 *   node --import tsx scripts/diag/rating-channel.ts [--out out/rating-channel/report.json]
 * Also prints a static consumer map (which src files read each rating by name) for the RAT-3 table.
 * First-difference order inside a step is the order the data is produced:
 *   observations (what he saw, how old) -> decision (request) -> rewrites/final (control) -> endpoint/start (body). */
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { RATING_KEYS, type RatingKey } from '../../src/players/types.js';
import { ROLES } from '../../src/players/roles.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickOffense } from '../../src/league/team.js';
import { PlaySim } from '../../src/sim/playsim.js';
import type { CommandTraceStep } from '../../src/sim/command-trace.js';
import { nativeTraceSetup } from './command-trace.js';
import { executionIdentity, firstDifference } from './saved-play.js';

const recipe = { coverage: 'cover3_buzz', concept: 'iz_strong', seed: 1, roster: 7, formation: 'i_pro_21', flip: false };
const WINDOW = { from: 0, to: 3 };
const LOW = 1, HIGH = 99;

interface Subject { team: 'O' | 'D'; slot: string }
type Stage = 'observations' | 'decision' | 'rewrites' | 'final' | 'endpoint' | 'start';
const ORDER: Stage[] = ['observations', 'decision', 'rewrites', 'final', 'endpoint', 'start'];
const meaning: Record<Stage, string> = {
  observations: 'timing: what he consumed, or how old it was',
  decision: 'request: the command his controller produced',
  rewrites: 'control: a later stage rewrote the request',
  final: 'control: the command that reached the body',
  endpoint: 'achieved: body state after the step (earlier stages equal; effect arrived through another body)',
  start: 'achieved: body state at step start (earlier stages equal; effect arrived through another body)',
};

function run(subject: Subject, key: RatingKey, value: number | null, who?: Subject) {
  const setup = nativeTraceSetup(recipe);
  const roster = (subject.team === 'O' ? setup.offense : setup.defense) as Record<string, { ratings: Record<string, number> }>;
  if (value !== null) roster[subject.slot].ratings[key] = value;
  const sim = new PlaySim(setup);
  const trace = sim.recordCommands({ actor: subject.team === 'O' ? { team: 'O', slot: subject.slot } : { team: 'D', slot: subject.slot }, ...WINDOW });
  const agent = sim.agents.find(a => a.team === subject.team && a.slot === subject.slot)!;
  const plan = (agent.behavior as unknown as { plan?: { kind?: string; target?: { slot: string } | null } }).plan;
  const profile = { ...agent.profile } as Record<string, unknown>;
  const result = sim.run();
  return { steps: trace.steps as CommandTraceStep[], profile, result, planAtSnap: plan ? { kind: plan.kind, target: plan.target?.slot ?? null } : null, who };
}

function firstTraceDifference(a: CommandTraceStep[], b: CommandTraceStep[]) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    for (const stage of ORDER) {
      const d = firstDifference((a[i] as unknown as Record<string, unknown>)[stage], (b[i] as unknown as Record<string, unknown>)[stage], stage);
      if (d) return { stepStart: a[i].stepStart, stage, path: d.path, low: d.expected, high: d.actual, means: meaning[stage] };
    }
  }
  return a.length !== b.length ? { stepStart: null, stage: 'length', path: 'steps', low: a.length, high: b.length, means: 'trace lengths differ' } : null;
}

function pair(subject: Subject, key: RatingKey) {
  const lo = run(subject, key, LOW), hi = run(subject, key, HIGH);
  const profileDiff = Object.keys(lo.profile).filter(k => !Object.is(lo.profile[k], hi.profile[k]) && JSON.stringify(lo.profile[k]) !== JSON.stringify(hi.profile[k]))
    .map(k => ({ field: k, low: lo.profile[k], high: hi.profile[k] }));
  return { subject: `${subject.team}:${subject.slot}`, rating: key, lowVsHigh: [LOW, HIGH],
    steps: lo.steps.length, planAtSnap: lo.planAtSnap, profileFieldsChanged: profileDiff,
    firstDifference: firstTraceDifference(lo.steps, hi.steps),
    wholePlayResultIdentical: firstDifference(lo.result, hi.result) === null,
    play: { low: { outcome: lo.result.outcome, yards: lo.result.yards, duration: lo.result.duration },
      high: { outcome: hi.result.outcome, yards: hi.result.yards, duration: hi.result.duration } } };
}

/** Static: src files (outside generation/role selection) that name a rating. Literal r('x'), ratings.x, ratings['x'] only. */
function consumers(): Record<string, string[]> {
  const files: string[] = [];
  (function walk(d: string) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') && files.push(p); } })('src');
  const skip = new Set(['src/players/generator.ts', 'src/players/roles.ts', 'src/players/types.ts']);
  const out: Record<string, string[]> = {};
  for (const k of RATING_KEYS) {
    const re = new RegExp(`(\\br\\(\\s*['"]${k}['"]|ratings\\.${k}\\b|ratings\\[\\s*['"]${k}['"]|\\br\\.${k}\\b)`);
    out[k] = files.filter(f => !skip.has(f) && readFileSync(f, 'utf8').split('\n').some(l => re.test(l))).map(f => f.replace(/^src\//, ''));
  }
  return out;
}

/** Selection: the same roster picks its FB with that player's leadBlock at 99, then at 1. */
function selectionCheck() {
  const team = generateTeam(new Rng(recipe.roster).fork('offense'), 'Offense', 'OFF', { strength: 0.6 });
  const pick = () => pickOffense(team, '21').F;
  const first = pick(), was = first.ratings.leadBlock;
  first.ratings.leadBlock = HIGH; const high = pick().id;
  first.ratings.leadBlock = LOW; const low = pick().id;
  first.ratings.leadBlock = was;
  return { fbWithGeneratedRating: first.id, leadBlock: was, pickedAt99: high, pickedAt1: low, selectionChanges: high !== low };
}

/** RAT-3 table rows. 'shown' = this scene's first difference; 'named' = static consumers; untested ratings stay unknown. */
function classify(map: Record<string, string[]>, rows: ReturnType<typeof pair>[]) {
  const inRoles = new Set(ROLES.flatMap(r => r.weights.map(w => w[0] as string)));
  return RATING_KEYS.map(k => {
    const files = map[k];
    const tested = rows.filter(r => r.rating === k);
    const shown = tested.filter(r => r.firstDifference);
    if (!files.length) return { rating: k, class: inRoles.has(k) ? 'selection-only' : 'generated, unread (not even in role weights)', named: 0, evidence: tested.length ? 'scene: no difference over 0-3 s, whole play identical' : 'static scan' };
    if (shown.length) return { rating: k, class: 'affects execution', named: files.length,
      evidence: shown.map(r => `${r.subject}: ${r.firstDifference!.stage} ${r.firstDifference!.path}`).join('; ') };
    if (tested.length) return { rating: k, class: 'inactive in this case', named: files.length, evidence: 'scene: no difference' };
    return { rating: k, class: 'unknown (named by sim code, not exercised here)', named: files.length, evidence: files.slice(0, 3).join(', ') + (files.length > 3 ? ', …' : '') };
  });
}

function main() {
  const { values: v } = parseArgs({ options: { out: { type: 'string', default: 'out/rating-channel/report.json' } } });
  const base = run({ team: 'O', slot: 'F' }, 'leadBlock', null);
  const fbTarget = base.planAtSnap?.target ?? null;
  if (base.planAtSnap?.kind !== 'lead' || !fbTarget) throw new Error(`Scene has no FB lead plan: ${JSON.stringify(base.planAtSnap)}`);
  const fb: Subject = { team: 'O', slot: 'F' }, target: Subject = { team: 'D', slot: fbTarget };
  const cases: Array<[Subject, RatingKey, string]> = [
    [fb, 'leadBlock', 'question'],
    [fb, 'runBlock', 'control: rating the run-block code reads, same player and duty'],
    [fb, 'awareness', 'mental timing'],
    [fb, 'playRecognition', 'mental timing'],
    [target, 'playRecognition', 'control: defender whose reaction time the sim derives from it'],
    [target, 'awareness', 'control: defender whose reaction time the sim derives from it'],
  ];
  const rows = cases.map(([s, k, role]) => ({ role, ...pair(s, k) }));
  const map = consumers();
  const report = { identity: executionIdentity(), recipe, window: WINDOW, lowHigh: [LOW, HIGH], fbLeadTarget: fbTarget, rows,
    selection: selectionCheck(),
    classes: classify(map, rows),
    consumers: Object.fromEntries(RATING_KEYS.map(k => [k, map[k]])), unreadByName: RATING_KEYS.filter(k => !map[k].length) };
  mkdirSync(v.out!.replace(/\/[^/]*$/, ''), { recursive: true });
  writeFileSync(v.out!, JSON.stringify(report, null, 1));
  console.log(`scene: ${recipe.formation} ${recipe.concept} vs ${recipe.coverage}, roster ${recipe.roster}, seed ${recipe.seed}; FB lead target D:${fbTarget}; window ${WINDOW.from}-${WINDOW.to}s`);
  for (const r of rows) {
    const d = r.firstDifference;
    console.log(`${r.subject.padEnd(10)} ${r.rating.padEnd(16)} ${r.role.split(':')[0].padEnd(14)} profile:${r.profileFieldsChanged.map(f => f.field).join(',') || '-'}  first:`
      + (d ? ` t=${d.stepStart} ${d.stage} ${d.path} (${d.low} -> ${d.high})` : ' none in window')
      + `  play ${r.play.low.yards.toFixed(2)} vs ${r.play.high.yards.toFixed(2)} yd`);
  }
  const counts: Record<string, number> = {};
  for (const c of report.classes) counts[c.class] = (counts[c.class] ?? 0) + 1;
  console.log('classes:', JSON.stringify(counts));
  console.log('selection:', JSON.stringify(report.selection));
  console.log(`not named by any consumer: ${report.unreadByName.join(', ') || 'none'}\nwrote ${v.out}`);
}
main();
