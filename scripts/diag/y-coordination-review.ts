/** Reproduce saved candidate histories, inspect both directions from snap,
 * and test exactly one call-derived request-only continuation. No body restores.
 * Run with baseline:run --candidate. Evidence archive must be extracted first.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { Agent } from '../../src/sim/agent.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { spaceTeammates } from '../../src/sim/spacing.js';
import { previewFreeMovement } from '../../src/physics/movement-preview.js';
import { sourceVersion } from '../source-version.js';
import { installPostMeshTrial, postMeshFallback } from './post-mesh-trial.js';

const sha = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
const encode = (v: unknown) => JSON.stringify(v, (_k, x) => x instanceof Agent ? { agent: x.idx }
  : x instanceof PlaySim ? { sim: true } : x instanceof Map || x instanceof Set ? [...x]
  : x instanceof Float64Array ? [...x] : x);
const copy = (v: unknown): any => JSON.parse(encode(v));
const source = sourceVersion();
assert.equal(source, '60120551f0ad09415b47150f5edd9cdbd179955010a33d557af817fec31a01f1');
assert.equal(process.version, 'v22.23.3');
const baseline = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
assert.deepEqual(Object.fromEntries(Object.keys(baseline.flags).map(k => [k, process.env[k] ?? null])), baseline.flags);
const bytes = readFileSync('out/y-coordination/saved/packets/candidate-outcomes.json.gz');
assert.equal(sha(bytes), 'c8b55083a18a08daf990f233e6fd891e8ceb538dd04401102e8b8aec3f2ddbbf');
const saved = JSON.parse(gunzipSync(bytes).toString());
const pairs = [[2, 6], [6, 2]];
const panel: any[] = [];
const started = performance.now();

for (const row of saved.panel) for (const trial of [false, true]) {
  const input = row.input, setup = row.installedSetup;
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(input.o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID[input.formation].personnel),
    defense: pickDefense(generateTeam(new Rng(input.d), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation: FORMATION_BY_ID[input.formation], flip: input.flip, kind: 'run', run: RUN_BY_ID[input.concept], label: input.id },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[input.front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: setup.los, ballY: CENTER_Y, firstDownX: setup.firstDownX, seed: input.seed,
  });
  assert.equal(sim.slot('RT')!.player.id, 'O-OT2'); assert.equal(sim.slot('RB')!.player.id, 'O-RB1');
  const calls = installPostMeshTrial(sim), acquired = sim.teammateInformation.bind(sim);
  const proposed = postMeshFallback(calls, acquired, () => sim.t);
  if (trial) sim.teammateInformation = proposed;
  const frames: any[] = [], hashes: string[] = [], sightings: any[] = [], legacyQueries: any[] = [];
  let raw: any = null;
  const query = sim.teammateInformation.bind(sim);
  sim.teammateInformation = (a, b) => {
    // First spacing query sees actual pre-spacing intents, no controller rerun.
    if (raw === null) raw = copy(sim.intents);
    return query(a, b);
  };
  const sense = sim.teammateAwareness.sense.bind(sim.teammateAwareness);
  sim.teammateAwareness.sense = (agents, now, dt) => {
    sense(agents, now, dt);
    const states = copy(sim.teammateAwareness).observers;
    sightings.push({ t: now, pairs: pairs.map(([a, b]) => {
      const state = states.find(([idx]: any) => idx === a)[1];
      const target = agents[b], observer = agents[a];
      const angle = Math.abs(Math.atan2(Math.sin(Math.atan2(target.pos.y-observer.pos.y, target.pos.x-observer.pos.x)-observer.facing),
        Math.cos(Math.atan2(target.pos.y-observer.pos.y, target.pos.x-observer.pos.x)-observer.facing)));
      return { observer: a, target: b, angle, engaged: !!observer.engagement, down: observer.isDown(now),
        eyes: observer.eyes ? { keys: observer.eyes.keys.map(k => k.idx), peripheral: observer.eyes.peripheral } : null,
        delivered: state.seen.find(([idx]: any) => idx === b)?.[1] ?? null,
        pending: state.pending.find(([idx]: any) => idx === b)?.[1] ?? [], information: copy(query(observer, target)) };
    }) });
  };
  const see = sim.see.bind(sim);
  sim.see = (a, b, scale) => {
    const picture = see(a, b, scale);
    if (pairs.some(([o,t]) => o===a.idx && t===b.idx)) legacyQueries.push({ t: sim.t, observer: a.idx, target: b.idx,
      consumer: new Error().stack?.split('\n').slice(2,5), picture: copy(picture) });
    return picture;
  };
  const step = sim.world.step.bind(sim.world);
  sim.world.step = (intents, dt) => {
    const before = copy(sim.agents.map(a => a.body));
    const information = pairs.map(([a,b]) => ({ observer:a,target:b,information:copy(query(sim.agents[a],sim.agents[b])) }));
    const neutral = encode({ awareness: sim.teammateAwareness, rng: sim.rng });
    const shadow = copy(raw);
    const constrained = new Set(sim.world.joints.filter(j => j.kind !== 'grasp' || !j.broken).flatMap(j => [j.a,j.b]));
    if (sim.bond) { constrained.add(sim.bond.carrier.body); sim.bond.tacklers.forEach(a => constrained.add(a.body)); }
    for (const c of sim.lastStep?.contacts ?? []) { constrained.add(sim.agents[c.i].body); constrained.add(sim.agents[c.j].body); }
    spaceTeammates(sim.agents, shadow, (a,b) => { const p = proposed(a,b); return p.source==='unavailable'?null:p; }, { now:sim.t,constrained });
    for (const a of sim.agents) if (sim.t < a.snapReadyAt) shadow[a.idx] = { ...shadow[a.idx],
      vel:{x:0,y:0},facing:a.facing,push:0,dive:undefined,lunge:undefined,posture:a.body.support!.posture };
    assert.equal(encode({ awareness: sim.teammateAwareness, rng: sim.rng }), neutral);
    // Conditional unloaded RB forecasts only, never applied to the live World.
    const rb = sim.agents[6];
    const previews = !trial && sim.t>=2.2-1e-9 && sim.t<=2.45+1e-9
      ? { final: previewFreeMovement(rb.body,intents[6]!,sim.t,6),
        brake: previewFreeMovement(rb.body,{...intents[6],vel:{x:0,y:0}},sim.t,6) } : null;
    const final = copy(intents), report = step(intents,dt);
    frames.push({ t: sim.t, before, raw, final, shadow, information, previews,
      engagements: sim.engagements.map(e => ({ blocker:e.blocker.idx,defender:e.defender.idx,win:e.win,control:e.control })),
      after:copy(sim.agents.map(a => a.body)), contacts:copy(report.contacts) });
    return report;
  };
  while (sim.phase === 'live' && sim.t < 10) {
    raw = null; sim.tick();
    const legacy = { t: sim.t, rng:sim.rng,events:sim.events,perception:sim.perception,
      agents:sim.agents.map(a=>({body:a.body,mind:a.mind,recog:a.recog,behavior:a.behavior,tags:a.tags})),
      engagements:sim.engagements,joints:sim.world.joints,intents:sim.intents,cmds:Reflect.get(sim,'cmds') };
    hashes.push(sha(encode(legacy)));
  }
  assert.notEqual(sim.phase,'live');
  if (!trial) assert.deepEqual(hashes,row.legacyStateRngHashes,'Inspection changed saved native candidate history');
  panel.push({ input, trial, calls:copy(calls), hashes, frames, sightings,legacyQueries,
    outcome:copy(sim.buildResult()),endTime:sim.t,matchedSavedHashes:trial?null:hashes.length });
}
const output = { protocol:'y-coordination-review-v1',candidate:'68284671d062dfd4e7e879bcd037bc21dad3e3ac',
  harnessCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source,
  flags:baseline.flags,worldDefaults:baseline.worldDefaults,savedPacketSha256:sha(bytes),panel,
  newNativePlays:4,newGames:0,extraControllerUpdates:0,seconds:(performance.now()-started)/1000 };
const encoded = gzipSync(encode(output));
writeFileSync('out/y-coordination/review.json.gz',encoded);
console.log(JSON.stringify({path:'out/y-coordination/review.json.gz',sha256:sha(encoded),bytes:encoded.length,
  seconds:output.seconds,cases:panel.map(r=>({id:r.input.id,trial:r.trial,matchedSavedHashes:r.matchedSavedHashes,
    yards:r.outcome.yards,endTime:r.endTime,contacts:r.frames.flatMap((f:any)=>f.contacts.filter((c:any)=>[c.i,c.j].includes(2)&&[c.i,c.j].includes(6)).map((c:any)=>({t:f.t,...c}))) }))}));
