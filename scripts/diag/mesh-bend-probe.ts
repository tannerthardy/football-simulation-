/** Research intervention, separate from the passive observer and production.
 * Can a modest request bend preserve the same coverage objective through the
 * observed traffic? One fixed 30-degree bend away from the forecast conflict;
 * no angle/margin search, hidden peer motion, body changes, or altered physics.
 * --plan is the default. Only the four named saved setups may be used.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { previewFreeMovement, type MovementSample } from '../../src/physics/movement-preview.js';
import type { Intent } from '../../src/physics/world.js';
import type { Agent } from '../../src/sim/agent.js';
import { observeCommands, type CommandObservation } from '../../src/sim/command-observer.js';
import type { Perceived } from '../../src/sim/perception.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';

const args = process.argv.slice(2), input = args[args.indexOf('--input') + 1], out = args[args.indexOf('--out') + 1];
const detail = args.includes('--trace-a044');
const safetyFirst = args.includes('--safety-first');
const plan = { cases: ['A008', 'A020', 'A032', 'A044'], until: [3.4, 3.75, 4.35, 5.6], executions: 8,
  question: 'Does one fixed peer-directed bend improve a naturally reacting local approach while retaining useful controls/block?',
  batchWallCapMs: 20000, angleDegrees: 30, forecastSteps: 12,
  limitedTo: 'LB_M/NB/SS free man/zone commands, from original named observation windows; football objectives unchanged.',
  productionChange: false, fullGames: 0, generatedRosters: 0 };
const executionPlan = detail ? { ...plan, cases: ['A044'], until: [2.75], executions: 1,
  question: 'Attribute the first failed transition of the already rejected A044 bend; reuse the saved baseline/probe comparison.' }
  : safetyFirst ? { ...plan, cases: ['A020', 'A032', 'A044'], until: [3.75, 4.35, 5.6], executions: 3,
    question: 'Correct the demonstrated research-selector comparison of clear bends against unsafe fast requests; reuse accepted arms and unchanged A008.' } : plan;
if (!args.includes('--run')) { console.log(JSON.stringify(executionPlan, null, 2)); process.exit(0); }
if (!input || !out || !input.endsWith('flex-windows.json.gz')) throw Error('Use --run --input saved/flex-windows.json.gz --out new/path');
if (existsSync(`${out}/summary.json`)) throw Error('Preserve earlier evidence');
const inputBytes = readFileSync(input), expected = '11637c8ff81b32b06faa21f87995fc870e37ff089d4f03496717856b5eb05191';
if (createHash('sha256').update(inputBytes).digest('hex') !== expected) throw Error('Saved-window hash mismatch');
const saved = JSON.parse(gunzipSync(inputBytes).toString());
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/plan.json`, JSON.stringify(executionPlan, null, 2) + '\n');
const start = performance.now(), cpu = process.cpuUsage(), rows = [];
interface Peer { idx: number; seen: Perceived; touch: number }
function clearance(a: Agent, samples: MovementSample[], p: Peer): number {
  let x = a.pos.x - p.seen.pos.x, y = a.pos.y - p.seen.pos.y, minimum = Math.hypot(x, y) - p.touch;
  for (const s of samples) {
    const rx = s.pos.x - p.seen.pos.x - p.seen.vel.x * s.t, ry = s.pos.y - p.seen.pos.y - p.seen.vel.y * s.t;
    const ex = rx - x, ey = ry - y, u = Math.max(0, Math.min(1, -(x * ex + y * ey) / Math.max(1e-12, ex * ex + ey * ey)));
    minimum = Math.min(minimum, Math.hypot(x + u * ex, y + u * ey) - p.touch); x = rx; y = ry;
  }
  return minimum;
}
for (let i = 0; i < saved.cases.length; i++) {
  const c = saved.cases[i];
  if (c.caseId !== plan.cases[i]) throw Error('Unexpected case order');
  if (detail && c.caseId !== 'A044') continue;
  if (safetyFirst && c.caseId === 'A008') continue;
  for (const intervention of detail || safetyFirst ? [true] : [false, true]) {
    const begin = performance.now(), sim = new PlaySim(structuredClone(c.setup) as PlaySetup), changes: unknown[] = [], ticks: unknown[] = [], stages: CommandObservation[] = [];
    const selected = sim.agents.filter(a => ['LB_M', 'NB', 'SS'].includes(a.slot));
    let observations: CommandObservation[] = [];
    const remove = observeCommands(sim, selected, e => observations.push(e));
    const step = sim.world.step.bind(sim.world);
    sim.world.step = (intents, dt) => {
      if (intervention && sim.t >= c.windows[0][0]) for (const a of selected) {
        const s = a.body.support, command = intents[a.idx];
        if (!command || !['man', 'zone'].includes(a.behavior.kind) || a.engagement || a.isDown(sim.t)
          || command.free || command.dive || command.lunge || (command.push ?? 0) > 0
          || (command.squeeze ?? 0) > 0 || (a.body.squeeze ?? 0) > 0 || !s || s.state !== 'up'
          || s.foot || s.strike || Math.hypot(s.lean.x, s.lean.y) > 1e-6 || Math.hypot(s.load.x, s.load.y) > 1e-6
          || sim.lastStep?.contacts.some(p => p.i === a.idx || p.j === a.idx)
          || sim.world.joints.some(j => (j.kind !== 'grasp' || !j.broken) && (j.a === a.body || j.b === a.body))) continue;
        const own = observations.filter(e => e.actor === a.idx), rawEvent = own.find(e => e.stage === 'behavior');
        if (!rawEvent) continue;
        const raw = rawEvent.command as Intent, speed = a.speed;
        if (speed < 2 || Math.abs(raw.vel.x * a.vel.y - raw.vel.y * a.vel.x) / speed < 1) continue;
        const peers: Peer[] = own.filter(e => e.stage === 'spacing-picture').map(e => ({ idx: e.peer as number, seen: e.used as Perceived,
          touch: .9 * (a.profile.radius + sim.agents[e.peer as number].profile.radius) }));
        // Do not silently omit an unknown/missing peer, nor replace its motion.
        if (peers.length !== sim.teammates(a).length - 1 || peers.some(p => !Number.isFinite(p.seen.age)
          || ![p.seen.pos.x, p.seen.pos.y, p.seen.vel.x, p.seen.vel.y].every(Number.isFinite))) continue;
        const path = previewFreeMovement(a.body, raw, sim.t, plan.forecastSteps);
        const ranked = peers.map(p => ({ p, gap: clearance(a, path, p) })).sort((x, y) => x.gap - y.gap);
        if (ranked[0].gap >= 0) continue;
        const p = ranked[0].p, cross = raw.vel.x * (p.seen.pos.y - a.pos.y) - raw.vel.y * (p.seen.pos.x - a.pos.x);
        if (!cross) continue;
        const theta = -Math.sign(cross) * plan.angleDegrees * Math.PI / 180;
        const bend: Intent = { ...raw, vel: { x: raw.vel.x * Math.cos(theta) - raw.vel.y * Math.sin(theta),
          y: raw.vel.x * Math.sin(theta) + raw.vel.y * Math.cos(theta) } };
        const samples = previewFreeMovement(a.body, bend, sim.t, plan.forecastSteps), minimum = Math.min(...peers.map(p => clearance(a, samples, p)));
        if (minimum < 0 || samples.some(p => p.support !== 'up')) continue;
        const chosen = previewFreeMovement(a.body, command, sim.t, plan.forecastSteps), mag = Math.hypot(raw.vel.x, raw.vel.y);
        const progress = (p: MovementSample) => ((p.pos.x - a.pos.x) * raw.vel.x + (p.pos.y - a.pos.y) * raw.vel.y) / mag;
        const chosenClearance = Math.min(...peers.map(p => clearance(a, chosen, p)));
        if ((!safetyFirst || chosenClearance >= 0) && progress(samples.at(-1)!) <= progress(chosen.at(-1)!)) continue;
        changes.push({ t: sim.t, actor: a.idx, peer: p.idx, raw, chosen: structuredClone(command), bend,
          rawClearance: ranked[0].gap, chosenClearance, bendClearance: minimum, chosenProgress: progress(chosen.at(-1)!), bendProgress: progress(samples.at(-1)!) });
        if (intents !== sim.intents) throw Error('Intervention must target the live simulator command array');
        sim.intents[a.idx] = bend;
      }
      if (detail || safetyFirst) stages.push(...observations);
      return step(intents, dt);
    };
    sim.event('snap', sim.slot('C') ?? sim.qb);
    while (sim.phase === 'live' && sim.t < (detail ? 2.75 : plan.until[i])) {
      if (performance.now() - start > plan.batchWallCapMs) throw Error('Probe cap; no retries');
      observations = []; const t = sim.t; sim.tick();
      if (t >= c.windows[0][0]) ticks.push({ t, after: sim.t,
        agents: sim.agents.map(a => ({ idx: a.idx, pos: { ...a.pos }, vel: { ...a.vel }, state: a.body.support?.state })),
        commands: structuredClone(sim.intents), contacts: sim.lastStep?.contacts });
    }
    remove();
    const result = { caseId: c.caseId, intervention, stoppedAt: sim.t, phase: sim.phase, outcome: sim.outcome,
      events: sim.events, changes, ticks, ...(detail || safetyFirst ? { stages } : {}), rng: { ...sim.rng }, elapsedMs: performance.now() - begin };
    const path = `${out}/${c.caseId}-${intervention ? 'bend' : 'accepted'}.json.gz`, bytes = gzipSync(JSON.stringify(result));
    writeFileSync(path, bytes);
    rows.push({ caseId: c.caseId, intervention, stoppedAt: sim.t, changes: changes.length, elapsedMs: result.elapsedMs,
      path, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
}
const used = process.cpuUsage(cpu), summary = { ...executionPlan, rows, elapsedMs: performance.now() - start, cpuMs: (used.user + used.system) / 1000 };
writeFileSync(`${out}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary));
