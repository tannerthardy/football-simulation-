/** Short setup-only comparison: observes existing commands, bodies and loads. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const [hostArg, inputDir, outputDir, capArg = '2.8'] = process.argv.slice(2);
if (!hostArg || !inputDir || !outputDir) throw new Error('host, input directory and output directory required');
const host = resolve(hostArg), cap = Number(capArg);
const { PlaySim } = await import(pathToFileURL(`${host}/src/sim/playsim.ts`).href);
const { sourceVersion } = await import(pathToFileURL(`${host}/scripts/source-version.ts`).href);
const { movementObjective } = await import(pathToFileURL(`${host}/src/sim/movement-objective.ts`).href);
const source = sourceVersion(), commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: host, encoding: 'utf8' }).trim();
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const copy = value => structuredClone(value);
mkdirSync(outputDir, { recursive: true });
const summaries = [];
for (const caseId of ['A002', 'A003']) {
  const saved = JSON.parse(readFileSync(`${inputDir}/${caseId}.json`, 'utf8'));
  const lineup = saved.lineup ? JSON.parse(readFileSync(`${host}/config/roster-screen.json`, 'utf8')).matchups
    .find(m => m.id === saved.lineup) : null;
  if (saved.lineup && !lineup) throw new Error(`Unknown frozen lineup: ${saved.lineup}`);
  const setup = lineup ? { ...saved.setup, offense: lineup.offense, defense: lineup.defense } : saved.setup;
  const start = performance.now(), sim = new PlaySim(setup);
  const initial = { rng: copy(sim.rng), agents: sim.agents.map(a => ({ index: a.idx, slot: a.slot, body: copy(a.body),
    job: a.behavior.kind, plan: a.behavior.plan ? { kind: a.behavior.plan.kind,
      target: a.behavior.plan.target?.idx ?? null,
      combination: a.behavior.plan.combination ? { members: a.behavior.plan.combination.members.map(b => b.idx),
        defender: a.behavior.plan.combination.defender.idx, backer: a.behavior.plan.combination.backer?.idx ?? null } : null } : null })) };
  const ticks = [];
  while (sim.phase === 'live' && sim.t < cap - 1e-9) {
    const t = sim.t;
    sim.tick();
    ticks.push({ t, rng: copy(sim.rng), bodies: sim.agents.map(a => copy(a.body)),
      commands: sim.intents.map(c => copy(c)), goals: sim.intents.map(c => movementObjective(c) ?? null),
      contacts: copy(sim.lastStep?.contacts ?? []),
      blocks: sim.engagements.map(e => ({ a: e.blocker.idx, b: e.defender.idx,
        helpers: e.helpers.map(a => a.idx), control: e.control, phi: e.phi,
        normal: e.hands?.normalForce ?? 0, tangent: e.hands?.tangentForce ?? 0 })),
    });
  }
  const elapsedSeconds = (performance.now() - start) / 1000;
  const result = sim.buildResult();
  const tape = { caseId, commit, source, inputSha256: saved.inputSha256, cap,
    initial, ticks, result, finalRng: copy(sim.rng), end: sim.t, phase: sim.phase, censored: sim.phase === 'live', elapsedSeconds };
  const payload = gzipSync(JSON.stringify(tape));
  writeFileSync(`${outputDir}/${caseId}.json.gz`, payload);
  const nb = initial.agents.find(a => a.slot === 'NB'), end = initial.agents.find(a => a.slot === 'DE_S');
  const rb = sim.slot('RB'), mike = sim.slot('LB_M');
  summaries.push({ caseId, commit, source, inputSha256: saved.inputSha256, elapsedSeconds, end: sim.t, phase: sim.phase,
    censored: tape.censored, tapeSha256: createHash('sha256').update(payload).digest('hex'),
    initialHash: hash(initial), initialNb: nb, initialEnd: end,
    nbEndDistance: Math.hypot(nb.body.pos.x-end.body.pos.x, nb.body.pos.y-end.body.pos.y),
    radiusSum: nb.body.profile.radius + end.body.profile.radius,
    trajectoryHash: hash(ticks), eventHash: hash(result.events), finalRngHash: hash(tape.finalRng),
    events: result.events, finalRunner: copy(rb.body), finalMike: copy(mike.body),
    mikeLoads: ticks.flatMap(t => t.blocks.filter(b => b.b === mike.idx).map(b => ({ t: t.t, ...b }))),
  });
}
writeFileSync(`${outputDir}/summary.json`, JSON.stringify({ host, cap, commit, source, summaries }, null, 2) + '\n');
console.log(JSON.stringify(summaries.map(s => ({ caseId: s.caseId, source: s.source, elapsedSeconds: s.elapsedSeconds,
  end: s.end, phase: s.phase, nbEndDistance: s.nbEndDistance, radiusSum: s.radiusSum, mikeLoadTicks: s.mikeLoads.length }))));
