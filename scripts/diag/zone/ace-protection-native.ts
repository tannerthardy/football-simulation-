/** Only the missing controller provenance on two saved prefixes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { Agent, type Engagement } from '../../../src/sim/agent.js';
import { axisOf, contactControl } from '../../../src/sim/engagement.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';

const manifest = JSON.parse(readFileSync('config/ace-protection-traces.json', 'utf8'));
const copy = <T>(x: T): T => structuredClone(x);
const serialize = (v: unknown) => JSON.stringify(v, (_k, x: unknown) => x instanceof Agent ? { agent: x.idx }
  : x instanceof PlaySim ? { sim: true } : x instanceof Map ? [...x] : x instanceof Set ? [...x] : x instanceof Float64Array ? [...x] : x);
const sha = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
function execute(row: typeof manifest.inputs[number]) {
  const i = row.input, formation = FORMATION_BY_ID[i.formation];
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(i.o), 'O', 'O', { strength: manifest.strength }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(i.d), 'D', 'D', { strength: manifest.strength }), 'base43'),
    offCall: { formation, flip: i.flip, kind: 'run', run: RUN_BY_ID[i.concept], label: i.id },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[i.front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: manifest.los, ballY: CENTER_Y, firstDownX: 50, seed: i.seed,
    handContact: 'patch', groundMovement: 'legacy' });
  const cues: unknown[] = [], contacts: unknown[] = [], frames: unknown[] = [], hashes: string[] = [], writes: unknown[] = [];
  // Distinguish the contact technique's request from teammate spacing and
  // the final World input. Observe assignments; retain the original array data.
  sim.intents = new Proxy(sim.intents, {
    set(target, key, value) {
      if ([2, 5, 6, 12, 13].includes(Number(key))) writes.push({ t: sim.t, actor: Number(key),
        caller: new Error().stack?.split('\n')[2]?.trim(), intent: copy(value) });
      return Reflect.set(target, key, value);
    },
  });
  const rep = (e: Engagement) => ({ blocker: e.blocker.idx, defender: e.defender.idx, start: e.start,
    helpers: e.helpers.map(h => ({ id: h.idx, control: contactControl(e, h) })), control: e.control,
    drive: copy(e.drive), surfaceAxis: copy(e.surfaceAxis), axis: axisOf(sim, e), sealTarget: e.sealTarget });
  const see = sim.see.bind(sim);
  sim.see = (a, b, scale) => {
    const seen = see(a, b, scale);
    if ((a.idx === 2 && [7, 12].includes(b.idx)) || ([12, 13, 5].includes(a.idx) && [5, 6, 12, 13].includes(b.idx))) {
      const caller = new Error().stack?.split('\n')[2]?.trim();
      cues.push({ t: sim.t, actor: a.idx, target: b.idx, caller, seen: copy(seen) });
    }
    return seen;
  };
  runContactObservers.set(sim, (e, phase, data) => {
    if ([12, 13].includes(e.defender.idx)) contacts.push({ t: sim.t, phase, rep: rep(e), data: copy(data) });
  });
  const step = sim.world.step.bind(sim.world);
  sim.world.step = (intents, dt) => {
    frames.push({ t: sim.t, reps: sim.engagements.filter(e => [12, 13].includes(e.defender.idx)).map(rep),
      agents: sim.agents.filter(a => [2, 5, 6, 7, 10, 12, 13].includes(a.idx)).map(a => ({ id: a.idx, slot: a.slot,
        pos: copy(a.pos), vel: copy(a.vel), facing: a.facing, energy: a.body.energy, support: copy(a.body.support),
        decisionInterval: a.mind.decisionInterval, placementError: a.mind.placementError,
        armIn: a.player.measurables.armIn, bodyProfile: copy(a.profile), intent: copy(intents[a.idx]) })) });
    return step(intents, dt);
  };
  while (sim.phase === 'live' && sim.t < manifest.stopSeconds) {
    sim.tick();
    const state = { t: sim.t, rng: sim.rng, events: sim.events, perception: sim.perception,
      agents: sim.agents.map(a => ({ body: a.body, mind: a.mind, recog: a.recog, behavior: a.behavior, tags: a.tags })),
      engagements: sim.engagements, joints: sim.world.joints, intents: sim.intents, cmds: Reflect.get(sim, 'cmds') };
    hashes.push(sha(serialize(state)));
  }
  assert.equal(hashes.length, row.referencePrefixTicks);
  assert.equal(sha(JSON.stringify(hashes)), row.referencePrefixSha256, 'Reuse exact saved state/RNG history');
  return { input: i, stop: sim.t, prefixExact: true, hashes, cues, contacts, writes, frames };
}
const started = performance.now(), panel: ReturnType<typeof execute>[] = manifest.inputs.map(execute);
const result = { protocol: 'ace-protection-provenance-v1', manifest,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  scriptSha256: sha(readFileSync('scripts/diag/zone/ace-protection-native.ts')),
  elapsedSeconds: (performance.now() - started) / 1000, panel };
const destination = process.argv[2] ?? 'out/ace-protection/provenance.json.gz';
mkdirSync(dirname(destination), { recursive: true });
writeFileSync(destination, gzipSync(serialize(result)));
console.log(JSON.stringify({ prefixesExact: panel.map(p => p.input.id), ticks: 49, seconds: result.elapsedSeconds }));
