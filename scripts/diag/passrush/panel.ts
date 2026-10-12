/** 1v1 edge rusher vs tackle panel. Compare arms by running each source (or
 * env flag) in its own process with the same seeds; ARM names the output.
 *
 * ARM=base node --import tsx scripts/diag/passrush/panel.ts [--seeds 30] [--substeps N] [--out out/passrush/x.json]
 *
 * Identical starting geometry, players and seeds in both arms; the rusher's
 * moves are scripted identically. Measures rotation, hand loads, speed,
 * balance, hand continuity, pressure timing and whether he reaches the QB.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { World } from '../../../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { Agent, RushMove } from '../../../src/sim/agent.js';
import { rushScripts } from '../../../src/sim/engagement.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seeds = Number(arg('--seeds', '30')), substeps = arg('--substeps', '');
const ARM = process.env.ARM ?? 'base';
const out = arg('--out', `out/passrush/${ARM}${substeps ? '-s' + substeps : ''}.json`);
if (substeps) {
  const step = World.prototype.step;
  World.prototype.step = function (intents, dt) { Object.defineProperty(this, 'substeps', { value: Number(substeps), configurable: true }); return step.call(this, intents, dt); };
}

const offense = generateTeam(new Rng(51), 'Panel O', 'PO', { strength: .55 });
const defense = generateTeam(new Rng(52), 'Panel D', 'PD', { strength: .55 });

export const SCENARIOS: Record<string, RushMove[]> = {
  speed: ['speed', 'speed', 'speed', 'speed'],
  chop: ['club', 'speed', 'speed', 'speed'],
  chopSpin: ['club', 'spin', 'speed', 'speed'],
  bull: ['bull', 'bull', 'bull', 'bull'],
};

export const MATCHUPS: Record<string, { tackle: number; rusher: number }> = { even: { tackle: 75, rusher: 75 }, rusherEdge: { tackle: 65, rusher: 90 } };

function rep(script: RushMove[], seed: number, matchup: { tackle: number; rusher: number }) {
  const formation = FORMATION_BY_ID.ace_11;
  const off = pickOffense(offense, formation.personnel), def = pickDefense(defense, 'base43');
  const set = (p: any, r: Record<string, number>) => ({ ...p, ratings: { ...p.ratings, ...r } });
  (off as any).RT = set((off as any).RT, { handTechnique: matchup.tackle, passBlock: matchup.tackle, runBlock: matchup.tackle, balance: matchup.tackle });
  for (const s of ['DE_S', 'DE_W']) if ((def as any)[s]) (def as any)[s] = set((def as any)[s], { passRushFinesse: matchup.rusher, blockShedding: matchup.rusher, passRushPower: matchup.rusher, balance: matchup.rusher });
  const sim = new PlaySim({
    offense: off, defense: def,
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.smash, label: 'panel' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'panel' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
  });
  const T = sim.slot('RT')!, qb = sim.qb;
  const R = [...sim.defense].filter((d) => d.slot.startsWith('DE')).sort((p, q) => Math.abs(p.pos.y - T.pos.y) - Math.abs(q.pos.y - T.pos.y))[0];
  const side = Math.sign(T.pos.y - CENTER_Y) || 1;
  for (const a of sim.agents) {
    if (a === T || a === R) continue;
    a.body.pos = { x: 80 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  qb.body.pos = { x: 33, y: CENTER_Y };
  T.body.pos = { x: 38.4, y: CENTER_Y + side * 3.2 }; T.body.vel = { x: -1, y: side * .3 }; T.body.facing = Math.atan2(side, 1) * .5;
  R.body.pos = { x: 39.25, y: CENTER_Y + side * 4.0 }; R.body.vel = { x: -4.5, y: -side * .2 }; R.body.facing = Math.PI;
  sim.t = sim.world.time = .6;
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const e = sim.engage(T, R, 'pass', null);
  if (!e) throw new Error('no engagement');
  rushScripts.set(e, [...script]);
  const m = { rotated: 0, maxYawRate: 0, speed: [] as number[], handNormal: 0, handTangent: 0, loadedTicks: 0,
    hands2: 0, hands1: 0, hands0: 0, engagedTicks: 0, ticks: 0, rusherDown: false, tackleDown: false,
    pressureT: null as number | null, reachedT: null as number | null, minQb: Infinity, losses: 0, regains: 0,
    beatT: null as number | null, minAvail: 1,
    moves: [] as Array<{ t: number; move: string; ok: boolean }>, downT: null as number | null, downCause: '' as string, downMove: '' as string };
  let lastMoveUntil = -1;
  let lastFacing = R.facing;
  const tick = sim as unknown as { tick(): void };
  while (sim.phase === 'live' && sim.t < 4.0) {
    tick.tick();
    const d = Math.atan2(Math.sin(R.facing - lastFacing), Math.cos(R.facing - lastFacing)); lastFacing = R.facing;
    m.rotated += Math.abs(d); m.maxYawRate = Math.max(m.maxYawRate, Math.abs(d) / sim.dt);
    m.speed.push(Math.hypot(R.vel.x, R.vel.y)); m.ticks++;
    if (R.engagement) {
      m.engagedTicks++;
      const j = R.engagement.hands;
      const n = Math.abs(j?.normalForce ?? 0), tt = Math.abs(j?.tangentForce ?? 0);
      m.handNormal += n; m.handTangent += tt; if (n + tt > 1) m.loadedTicks++;
      if ((j?.push ?? 0) > 1) m.hands2++; else m.hands0++;
    } else if (m.beatT === null && sim.t > .7) m.beatT = sim.t;
    const en = R.engagement;
    if (en && en.moveUntil !== lastMoveUntil && en.moveUntil > sim.t) { lastMoveUntil = en.moveUntil; m.moves.push({ t: sim.t, move: String(en.move), ok: !!en.moveOk }); }
    if (R.body.support?.state !== 'up' && !m.rusherDown) {
      m.rusherDown = true; m.downT = sim.t; m.downCause = `${R.body.support?.state}/${R.body.support?.cause ?? '-'}`;
      m.downMove = m.moves.length ? `${m.moves.at(-1)!.move}:${m.moves.at(-1)!.ok ? 'ok' : 'fail'}@${(sim.t - m.moves.at(-1)!.t).toFixed(2)}s` : 'none';
    }
    if (T.body.support?.state !== 'up') m.tackleDown = true;
    const dq = Math.hypot(R.pos.x - qb.pos.x, R.pos.y - qb.pos.y);
    m.minQb = Math.min(m.minQb, dq);
    if (m.pressureT === null && dq < 2.5) m.pressureT = sim.t;
    if (m.reachedT === null && dq < 1.2) m.reachedT = sim.t;
  }
  const q = (v: number[], f: number) => [...v].sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] ?? 0;
  return { ...m, speed: undefined, speedP50: q(m.speed, .5), speedLate: q(m.speed.slice(-20), .5),
    handNormal: m.handNormal / Math.max(1, m.engagedTicks), handTangent: m.handTangent / Math.max(1, m.engagedTicks) };
}

const results: Record<string, ReturnType<typeof rep>[]> = {};
for (const [mname, matchup] of Object.entries(MATCHUPS)) for (const [name, script] of Object.entries(SCENARIOS)) {
  const key = `${mname}/${name}`;
  results[key] = [];
  for (let s = 0; s < seeds; s++) results[key].push(rep(script, 1000 + s, matchup));
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ arm: ARM, substeps: substeps || 'adaptive', results }));
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
const rate = (v: boolean[]) => v.filter(Boolean).length / Math.max(1, v.length);
console.log(`${ARM} substeps ${substeps || 'adaptive'}`);
for (const [name, rs] of Object.entries(results)) {
  const pt = rs.map((r) => r.pressureT).filter((x): x is number => x !== null);
  console.log(`  ${name.padEnd(20)} pressure ${rate(rs.map((r) => r.pressureT !== null)).toFixed(2)} (t med ${pt.length ? [...pt].sort()[Math.floor(pt.length / 2)].toFixed(2) : '-'}) reached ${rate(rs.map((r) => r.reachedT !== null)).toFixed(2)} | rotation ${mean(rs.map((r) => r.rotated)).toFixed(2)} rad, peak yaw ${mean(rs.map((r) => r.maxYawRate)).toFixed(1)} rad/s | speed med ${mean(rs.map((r) => r.speedP50)).toFixed(2)} | hand N ${mean(rs.map((r) => r.handNormal)).toFixed(0)} T ${mean(rs.map((r) => r.handTangent)).toFixed(0)} | 2/1/0 hands ${mean(rs.map((r) => r.hands2 / Math.max(1, r.engagedTicks))).toFixed(2)}/${mean(rs.map((r) => r.hands1 / Math.max(1, r.engagedTicks))).toFixed(2)}/${mean(rs.map((r) => r.hands0 / Math.max(1, r.engagedTicks))).toFixed(2)} losses ${mean(rs.map((r) => r.losses)).toFixed(2)} regains ${mean(rs.map((r) => r.regains)).toFixed(2)} | engaged ${mean(rs.map((r) => r.engagedTicks * .05)).toFixed(2)} s | down R/T ${rate(rs.map((r) => r.rusherDown)).toFixed(2)}/${rate(rs.map((r) => r.tackleDown)).toFixed(2)} | min to QB ${mean(rs.map((r) => r.minQb)).toFixed(2)}`);
}

if (process.argv.includes('--trace')) {
  for (const [name, rs] of Object.entries(results)) {
    const byMove: Record<string, [number, number]> = {};
    for (const r of rs) for (const mv of r.moves) { const k = byMove[mv.move] ??= [0, 0]; k[0]++; if (mv.ok) k[1]++; }
    console.log(`  ${name.padEnd(20)} moves ${Object.entries(byMove).map(([k, [n, ok]]) => `${k} ${ok}/${n}`).join(', ')}`);
    for (const r of rs.filter((x) => x.rusherDown)) console.log(`      down t=${r.downT?.toFixed(2)} ${r.downCause} last move ${r.downMove} engaged=${r.engagedTicks * .05}`);
  }
}
