/** Declared ordinary zone set for the combination-to-climb question (KNOWN_PROBLEMS RUN-12).
 *   node --import tsx scripts/diag/zone-climb-ordinary.ts capture out/g2-ordinary/set.bin
 *   node --import tsx scripts/diag/zone-climb-ordinary.ts measure out/g2-ordinary/set.bin out/g2-ordinary/arm.json
 * capture: the first 10 inside/outside/wide/split zone runs of normal games 7 and 8 (or the
 * games named in ZONE_SEEDS, e.g. ZONE_SEEDS=9,10), in game order, nothing dropped; also
 * writes a Play Lab scenario per play (npm run lab:replay). Capture on the base checkout:
 * the set is a prefix of a normal game, so an engine that blocks differently picks other plays.
 * measure: identical setup bytes on the current checkout. Engine state and engagements only. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { deserialize, serialize } from 'node:v8';
import { Rng } from '../../src/core/rng.js';
import { Game } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import type { Agent } from '../../src/sim/agent.js';
import { RunBlocker, type Combination } from '../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { SCENARIO_FORMAT, storeSetup } from '../../lab-app/engine.js';
import { captureSetup, restoreSetup } from './saved-play.js';

type Saved = { id: string; concept: string; front: string; setup: Buffer };
const FAMILY = new Set(['insideZone', 'outsideZone', 'wideZone', 'splitZone']), CAP = 10;
const [mode, input, output] = process.argv.slice(2);

function capture(): void {
  const plays: Saved[] = [];
  for (const seed of (process.env.ZONE_SEEDS ?? '7,8').split(',').map(Number)) {
    const rng = new Rng(seed);
    const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
    let n = 0;
    const game = new Game(home, away, { seed, hooks: { playSetup(setup, context) {
      const run = setup.offCall.run;
      if (n >= CAP || context.kind !== 'scrimmage' || setup.offCall.kind !== 'run' || !run || !FAMILY.has(run.scheme)) return;
      n++;
      plays.push({ id: `S${seed}-P${String(context.index + 1).padStart(3, '0')}`, concept: run.id, front: setup.defCall.front?.id ?? '-', setup: captureSetup(setup) });
    } } });
    game.kickoffToStart();
    while (n < CAP && !game.state.over) game.step();
  }
  mkdirSync(dirname(input), { recursive: true });
  writeFileSync(input, serialize(plays));
  mkdirSync('out/lab/scenarios', { recursive: true });
  for (const p of plays) writeFileSync(`out/lab/scenarios/g2-${p.id}.json`, JSON.stringify({ format: SCENARIO_FORMAT, id: `g2-${p.id}`,
    name: `G2 ordinary ${p.id} ${p.concept} vs ${p.front}`, created: new Date().toISOString(),
    setup: storeSetup(restoreSetup(p.setup)), interventions: [], flags: {}, source: { kind: 'builder' } }));
  console.log(plays.map(p => `${p.id} ${p.concept}/${p.front}`).join('\n'));
}

type Job = { keeper: Agent | null; climber: Agent; dl: Agent | null; lb: Agent | null; combo: Combination | null;
  released: number; releaseDistance: number | null; workedBy: string | null; workedAt: number; lbArrive: number; close: number; dlArrive: number; dlHeld: string | null; dlHit: boolean; dlAtContact?: string | null };

function measure(): void {
  const plays = deserialize(readFileSync(input)) as Saved[];
  const rows = plays.map(p => {
    const sim = new PlaySim(restoreSetup(Buffer.from(p.setup)));
    const started = performance.now();
    // A pre-snap foul is whistled before the first tick (PlaySim.run). Ticking
    // by hand would play a snap that never happens.
    if (sim.snapAssessment && !sim.snapAssessment.snapPermitted)
      return { id: p.id, concept: p.concept, front: p.front, ms: 0, yards: sim.run().yards, deadBall: true, first: null, jobs: [] };
    sim.tick();
    const dir = sim.attackDir('O'), jobs: Job[] = [];
    const job = (keeper: Agent | null, climber: Agent, dl: Agent | null, lb: Agent | null, combo: Combination | null): Job =>
      ({ keeper, climber, dl, lb, combo, released: -1, releaseDistance: null, workedBy: null, workedAt: -1, lbArrive: -1, close: Infinity, dlArrive: -1, dlHeld: null, dlHit: false, dlAtContact: undefined });
    for (const o of sim.offense) {
      const plan = o.behavior instanceof RunBlocker ? o.behavior.plan : null, c = plan?.combination;
      if (c && c.members[1] === o) jobs.push(job(c.members[0], o, c.defender, c.backer, c));
      else if (plan?.kind === 'climb') jobs.push(job(null, o, null, plan.target ?? null, null));
    }
    let carrier: Agent | null = null;
    const level = (d: Agent) => !!carrier && (carrier.pos.x - d.pos.x) * dir > -1;
    const t = () => +sim.t.toFixed(2);
    let contacted = false;
    while (sim.phase === 'live' && sim.t < 8) {
      sim.tick();
      if (sim.carrier && sim.carrier !== sim.qb && sim.carrier.team === 'O') carrier = sim.carrier;
      // The first tick with a carrier contact: who still has each down man then.
      const first = contacted ? undefined : sim.events.find(e => e.type === 'carrier_contact');
      if (first) {
        contacted = true;
        for (const j of jobs) if (j.dl) j.dlAtContact = first.b === j.dl.idx ? 'made it'
          : sim.engagements.find(e => e.defender === j.dl)?.blocker.slot ?? null;
      }
      for (const j of jobs) {
        if (j.released < 0 && (j.combo ? j.combo.released : true)) {
          j.released = t();
          // The member who leaves the double (either may), at the tick the combination releases.
          const leaver = [j.climber, j.keeper].find(m => m?.behavior instanceof RunBlocker && m.behavior.plan.departure) ?? j.climber;
          if (j.lb) j.releaseDistance = +Math.hypot(leaver.pos.x - j.lb.pos.x, leaver.pos.y - j.lb.pos.y).toFixed(2);
        }
        if (j.lb && j.lbArrive < 0) {
          const e = sim.engagements.find(e => e.defender === j.lb);
          if (e && j.workedAt < 0) { j.workedAt = t(); j.workedBy = e.blocker.slot; }
          for (const m of [j.climber, j.keeper]) if (m) j.close = Math.min(j.close, Math.hypot(m.pos.x - j.lb.pos.x, m.pos.y - j.lb.pos.y));
          if (level(j.lb)) j.lbArrive = t();
        }
        if (j.dl && j.dlArrive < 0) {
          if (sim.events.some(e => e.type === 'carrier_contact' && e.b === j.dl!.idx)) j.dlHit = true;
          if (level(j.dl)) { j.dlArrive = t(); j.dlHeld = sim.engagements.find(e => e.defender === j.dl)?.blocker.slot ?? null; }
        }
      }
    }
    const result = sim.run(); // finishes the play naturally
    const first = sim.events.find(e => e.type === 'carrier_contact');
    return { id: p.id, concept: p.concept, front: p.front, ms: Math.round(performance.now() - started), yards: result.yards,
      first: first && first.b !== undefined ? { slot: sim.agents[first.b].slot, t: first.t } : null,
      jobs: jobs.map(j => ({ keeper: j.keeper?.slot ?? null, climber: j.climber.slot, dl: j.dl?.slot ?? null, lb: j.lb?.slot ?? null,
        released: j.released, releaseDistance: j.releaseDistance, lbWorked: j.lb ? j.workedAt >= 0 && (j.lbArrive < 0 || j.workedAt <= j.lbArrive) : null,
        workedBy: j.workedBy, workedAt: j.workedAt, lbArrive: j.lbArrive, closest: Number.isFinite(j.close) ? +j.close.toFixed(2) : null,
        // The runner may never reach the down man's level (tackled short): reported, not scored as protection.
        dlProtected: j.dl ? (j.dlArrive < 0 ? null : !j.dlHit && j.dlHeld !== null) : null, dlHeld: j.dlHeld, dlArrive: j.dlArrive,
        // Scored at the runner's first contact instead: a block that breaks up after the play is decided does not count.
        // Null: no carrier contact (the play ended without one).
        dlProtectedAtContact: j.dl ? (j.dlAtContact === undefined ? null : j.dlAtContact !== null && j.dlAtContact !== 'made it') : null,
        dlAtContact: j.dlAtContact ?? null })) };
  });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(rows, null, 1));
  const all = rows.flatMap(r => r.jobs);
  console.log(`backers worked before runner ${all.filter(j => j.lbWorked).length}/${all.filter(j => j.lb).length}; `
    + `keepers holding at runner arrival ${all.filter(j => j.dlProtected).length}/${all.filter(j => j.dlProtected !== null).length}; `
    + `at first carrier contact ${all.filter(j => j.dlProtectedAtContact).length}/${all.filter(j => j.dlProtectedAtContact !== null).length}; `
    + `yards ${rows.reduce((s, r) => s + (r.yards ?? 0), 0).toFixed(1)}; ${rows.reduce((s, r) => s + r.ms, 0)} ms`);
}

if (mode === 'capture' && input) capture();
else if (mode === 'measure' && input && output) measure();
else throw new Error('Usage: zone-climb-ordinary.ts capture <set.bin> | measure <set.bin> <out.json>');
