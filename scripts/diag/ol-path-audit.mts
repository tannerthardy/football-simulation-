/** Observational ownership/path trace for four fixed retained 11v11 runs.
 * node --import tsx scripts/diag/ol-path-audit.mts [output.json.gz]
 * Additional reads never call perception or advance controller/RNG state.
 */
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const root = process.cwd();
const mod = (p: string) => import(`file://${root}/${p}`);
const [{ Rng }, { CENTER_Y }, { generateTeam, pickDefense, pickOffense }, { RUN_BY_ID }, { COVERAGE_BY_ID, FRONT_BY_ID }, { FORMATION_BY_ID }, { PlaySim }, { RunBlocker }, { sourceVersion }] = await Promise.all([mod('src/core/rng.ts'), mod('src/core/field.ts'), mod('src/league/team.ts'), mod('src/playbook/concepts.ts'), mod('src/playbook/defense.ts'), mod('src/playbook/formations.ts'), mod('src/sim/playsim.ts'), mod('src/sim/behaviors/blocking.ts'), mod('scripts/source-version.ts')]);
const output = process.argv[2] ?? 'out/ol-path-audit/traces.json.gz';
if (process.argv.length > 3)
    throw new Error('Usage: ol-path-audit.mts [output.json.gz]');
const sourceFiles = ['src/sim/behaviors/blocking.ts', 'src/sim/behaviors/carrier.ts', 'src/physics/world.ts'];
const moduleSha256 = Object.fromEntries(sourceFiles.map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
const before = sourceVersion();
const reports: any[] = [];
const hash = (v: any) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
for (const run of ['iz_strong', 'wz_strong', 'power', 'trap']) {
    const formation = FORMATION_BY_ID.ace_11;
    const input = { offense: pickOffense(generateTeam(new Rng(31), 'Panel offense 1', 'O1', { strength: .55 }), formation.personnel), defense: pickDefense(generateTeam(new Rng(32), 'Panel defense 1', 'D1', { strength: .55 }), 'base43'), offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID[run], label: `${formation.name} · ${RUN_BY_ID[run].name}` }, defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: `${FRONT_BY_ID.over.name} · Cover 3` }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, record: true, recordLevel: 'full' };
    const sim: any = new PlaySim(input);
    const samples = [];
    let perceptions: any[] = [], engageCalls: any[] = [], commands: any[] = [];
    const vec = (v: any) => ({ ...v });
    const plan = (b: any) => ({ kind: b.plan.kind, target: b.plan.target?.slot ?? null, drive: vec(b.plan.drive), combination: b.plan.combination ? { members: b.plan.combination.members.map((a: any) => a.slot), defender: b.plan.combination.defender.slot, released: b.plan.combination.released, secureSince: b.plan.combination.secureSince } : null, pullIdx: b.pullIdx, retarget: b.retarget, nextRuleRead: b.nextRuleRead, firstStep: b.firstStep ? vec(b.firstStep) : null, homeY: b.homeY });
    const body = (a: any) => ({ slot: a.slot, idx: a.idx, pos: vec(a.pos), vel: vec(a.vel), facing: a.facing, speed: a.speed, down: a.isDown(sim.t), engagement: a.engagement ? { blocker: a.engagement.blocker.slot, defender: a.engagement.defender.slot, helpers: a.engagement.helpers.map((x: any) => x.slot), phi: a.engagement.phi, control: a.engagement.control } : null, plan: a.behavior instanceof RunBlocker ? plan(a.behavior) : null });
    const see = sim.see;
    sim.see = function (a: any, b: any, ...rest: any[]) { const p = see.call(this, a, b, ...rest); if (a.team === 'O' && a.behavior instanceof RunBlocker)
        perceptions.push({ a: a.slot, b: b.slot, p: { ...p, pos: vec(p.pos), vel: vec(p.vel) } }); return p; };
    const engage = sim.engage;
    sim.engage = function (a: any, b: any, ...rest: any[]) { const ba = body(a), bb = body(b); const success = engage.call(this, a, b, ...rest); engageCalls.push({ a: a.slot, b: b.slot, beforeA: ba, beforeB: bb, success: !!success, afterA: body(a), afterB: body(b) }); return success; };
    for (const a of sim.offense) {
        if (!(a.behavior instanceof RunBlocker))
            continue;
        const behavior = a.behavior;
        const update = behavior.update;
        behavior.update = function (aa: any, s: any) { const b = body(aa), result = update.call(this, aa, s); commands.push({ a: aa.slot, before: b, after: body(aa), command: structuredClone(result) }); return result; };
    }
    sim.event('snap', sim.slot('C') ?? sim.qb);
    while (sim.phase === 'live' && sim.t < 25) {
        perceptions = [];
        engageCalls = [];
        commands = [];
        const t = sim.t;
        const start = sim.events.length;
        const pre = sim.agents.map(body);
        sim.tick();
        samples.push({ t, before: pre, perceptions, commands, engageCalls, after: sim.agents.map(body), events: sim.events.slice(start) });
    }
    if (sim.phase === 'live')
        sim.whistle('timeout', (sim.carrier ?? sim.qb).pos);
    const result = sim.buildResult();
    const signature = hash({ result: { ...result, frames: undefined, telemetry: undefined }, bodies: sim.agents.map((a: any) => a.body), intents: sim.intents, rngNext: sim.rng.nextU32() });
    const control: any = new PlaySim({ ...input, record: false });
    const plain = control.run();
    const controlSignature = hash({ result: { ...plain, frames: undefined, telemetry: undefined }, bodies: control.agents.map((a: any) => a.body), intents: control.intents, rngNext: control.rng.nextU32() });
    if (signature !== controlSignature)
        throw new Error(`Observer changed ${run}`);
    reports.push({ id: `RC-R1-${run}-over-R-S3`, source: before, signature, observerVerified: true, physics: { boundedAttachment: sim.world.boundedAttachment, handIntegration: sim.world.handIntegration, substeps: sim.world.substeps ?? 'native' }, result: { ...result, frames: undefined, telemetry: undefined }, players: sim.agents.map((a: any) => ({ slot: a.slot, idx: a.idx, team: a.team, profile: a.profile, ratings: a.player.ratings, snapDelay: a.mind.snapDelay, decisionInterval: a.mind.decisionInterval })), samples });
    console.log(JSON.stringify({ id: reports.at(-1).id, signature, yards: result.offenseYards, outcome: result.outcome, observerVerified: true }));
}
const after = sourceVersion();
if (before !== after)
    throw new Error('Source changed');
const report = { schema: 'ol-path-audit-v1', sourceBefore: before, sourceAfter: after, moduleSha256, scriptSha256: createHash('sha256').update(readFileSync(process.argv[1])).digest('hex'), command: [process.execPath, ...process.execArgv, ...process.argv.slice(1)], reports };
mkdirSync(dirname(output), { recursive: true });
const bytes = Buffer.from(JSON.stringify(report));
writeFileSync(output, output.endsWith('.gz') ? gzipSync(bytes, { level: 9 }) : bytes);
console.log(JSON.stringify({ output, sourceBefore: before, sourceAfter: after, moduleSha256 }));
