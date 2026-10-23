/** One native play, one actor, one live time window. See docs/COMMAND_TRACE.md. */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { HASH_LEFT_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import type { CommandTraceSelection } from '../../src/sim/command-trace.js';
import { engineSettings } from '../scorecard/provenance.js';
import { sourceVersion } from '../source-version.js';

/** Same generated-team/input recipe as coverage-trace.ts, without its extra diagnostic reads. */
export function nativeTraceSetup(input: { coverage: string; concept: string; seed: number; roster: number; formation: string; flip: boolean }): PlaySetup {
  const formation = FORMATION_BY_ID[input.formation], pass = PASS_BY_ID[input.concept], run = RUN_BY_ID[input.concept];
  const coverage = COVERAGE_BY_ID[input.coverage];
  if (!formation || !coverage || (!pass && !run)) throw new Error('Unknown formation, coverage or concept');
  for (const [key, n] of Object.entries({ seed: input.seed, roster: input.roster }))
    if (!Number.isSafeInteger(n) || n < 0 || n > 0xffffffff) throw new Error(`${key} must be a uint32`);
  const rng = new Rng(input.roster);
  const offense = generateTeam(rng.fork('offense'), 'Offense', 'OFF', { strength: 0.6 });
  const defense = generateTeam(rng.fork('defense'), 'Defense', 'DEF', { strength: 0.6 });
  const personnel = formation.personnel === '21' || formation.personnel === '22' ? 'base43' : 'nickel';
  return { offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, personnel),
    offCall: { formation, flip: input.flip, kind: pass ? 'pass' : 'run', pass, run, label: input.concept },
    defCall: { personnel, front: FRONT_BY_ID.over, coverage, pressure: null, zoneStyle: 'match', label: input.coverage },
    los: 40, ballY: HASH_LEFT_Y, firstDownX: 50, seed: input.seed, down: 1 };
}

function main() {
  const { values: v } = parseArgs({ options: {
    actor: { type: 'string' }, 'player-id': { type: 'string' }, from: { type: 'string' }, to: { type: 'string' },
    coverage: { type: 'string', default: 'cover3_buzz' }, concept: { type: 'string', default: 'curl_flat' },
    seed: { type: 'string', default: '1' }, roster: { type: 'string', default: '7' },
    formation: { type: 'string', default: 'gun_doubles_11' }, flip: { type: 'boolean', default: false },
    out: { type: 'string', default: 'out/command-trace.json' }, help: { type: 'boolean' },
  } });
  if (v.help) {
    console.log('node --import tsx scripts/diag/command-trace.ts --actor D:CB_W --from 3.45 --to 3.6 [--coverage cover3_buzz --concept curl_flat --seed 1 --roster 7 --formation gun_doubles_11 --flip --out out/command-trace.json]');
    return;
  }
  if (!!v.actor === !!v['player-id'] || v.from === undefined || v.to === undefined)
    throw new Error('Select --actor O:SLOT or D:SLOT (or --player-id), and --from / --to seconds');
  let actor: CommandTraceSelection['actor'];
  if (v['player-id']) actor = { playerId: v['player-id'] };
  else {
    const match = /^([OD]):([^:]+)$/.exec(v.actor!);
    if (!match) throw new Error('--actor must be O:SLOT or D:SLOT');
    actor = { team: match[1] as 'O' | 'D', slot: match[2] };
  }
  const input = { coverage: v.coverage!, concept: v.concept!, seed: Number(v.seed), roster: Number(v.roster),
    formation: v.formation!, flip: v.flip! };
  const sim = new PlaySim(nativeTraceSetup(input));
  const trace = sim.recordCommands({ actor, from: Number(v.from), to: Number(v.to) });
  const result = sim.run();
  const output = { version: 1, meta: { commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    engineSha256: sourceVersion(), node: process.version, settings: engineSettings(process.env),
    command: process.argv.slice(1), input, selection: trace.selection },
    result: { outcome: result.outcome, yards: result.yards, duration: result.duration },
    events: result.events.filter(e => e.t >= Number(v.from) && e.t <= Number(v.to)), steps: trace.steps };
  mkdirSync(dirname(v.out!), { recursive: true });
  writeFileSync(v.out!, JSON.stringify(output, null, 2) + '\n');
  const f = (n: number | undefined) => n === undefined ? '-' : n.toFixed(2);
  for (const step of trace.steps) {
    const d = step.decision!, end = step.endpoint!;
    console.log(`${f(step.stepStart)}→${f(step.endpointTime)} ${step.actor.team}:${step.actor.slot} ${d.evaluated ? d.owner.controller : 'snap-wait'}:${d.owner.kind}`
      + ` target=${d.ownerAfterUpdate.target?.slot ?? '?'} raw=(${f(d.raw.vel.x)},${f(d.raw.vel.y)}) face=${f(d.raw.facing)}`
      + ` rewrites=${step.rewrites.map(r => r.stage).join(',') || 'none'}`
      + ` final=(${f(step.final!.vel.x)},${f(step.final!.vel.y)}) face=${f(step.final!.facing)}`
      + ` endpoint=${end.behavior.controller}:${end.behavior.kind} v=(${f(end.body.velocity.x)},${f(end.body.velocity.y)})`);
  }
  console.log(`${trace.steps.length} steps → ${v.out}; ${result.outcome}, ${f(result.yards)} yd. Stored targets may be unavailable; endpoint behavior is not command authorship.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
