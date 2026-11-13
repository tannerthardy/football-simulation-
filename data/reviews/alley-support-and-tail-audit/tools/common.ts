import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

export const EXPECTED = '601b66e8e30123b20e1c5cfe9c5c883f41219180a5eaf26be8a477dff89b2a5b';
export const sha = (x: any) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
export const fileSha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
export function sourceSha(root: string) {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
  const names = walk(join(root, 'src')).map(f => relative(root, f)).sort();
  const hash = createHash('sha256');
  for (const name of names) hash.update(name).update('\0').update(readFileSync(join(root, name))).update('\0');
  return hash.digest('hex');
}
export function canonical(sim: any, value: any, expandRoot = false): any {
  const agents = new Map(sim.agents.map((a: any) => [a, a.idx]));
  const bodies = new Map(sim.agents.map((a: any) => [a.body, a.idx]));
  const seen = new Map<object, string>();
  const visit = (v: any, path: string, expand = false): any => {
    if (typeof v === 'number' && !Number.isFinite(v)) return { number: String(v) };
    if (v === undefined) return { undefined: true };
    if (v === null || typeof v !== 'object') return typeof v === 'function' ? '[function]' : v;
    if (!expand && v === sim) return { sim: true };
    if (!expand && agents.has(v)) return { agent: agents.get(v) };
    if (!expand && bodies.has(v)) return { body: bodies.get(v) };
    if (seen.has(v)) return { ref: seen.get(v) };
    seen.set(v, path);
    if (v instanceof Map) return { map: [...v].map(([k, val], i) => [visit(k, `${path}.${i}.key`), visit(val, `${path}.${i}.val`)]) };
    if (v instanceof Set) return { set: [...v].map((x, i) => visit(x, `${path}.${i}`)) };
    if (ArrayBuffer.isView(v)) return { typed: v.constructor.name, data: Array.from(v as any) };
    if (Array.isArray(v)) return v.map((x, i) => visit(x, `${path}.${i}`));
    return Object.fromEntries(Object.keys(v).sort().filter(k => typeof v[k] !== 'function').map(k => [k, visit(v[k], `${path}.${k}`)]));
  };
  return visit(value, 'root', expandRoot);
}
export function snapshot(sim: any, Rng: any): any {
  return {
    t: sim.t, worldTime: sim.world.time, phase: sim.phase, outcome: sim.outcome, endSpot: canonical(sim, sim.endSpot),
    agents: sim.agents.map((a: any) => ({ idx: a.idx, team: a.team, slot: a.slot, player: canonical(sim, a.player),
      profile: canonical(sim, a.profile), body: canonical(sim, a.body, true), mind: canonical(sim, a.mind, true),
      recognition: canonical(sim, a.recog, true), behavior: canonical(sim, a.behavior, true),
      agentFields: canonical(sim, Object.fromEntries(Object.entries(a).filter(([k]) => !['player', 'profile', 'body', 'mind', 'recog', 'behavior'].includes(k)))) })),
    rng: canonical(sim, sim.rng, true), intents: canonical(sim, sim.intents), cmds: canonical(sim, sim.cmds),
    qbMind: canonical(sim, sim.qbMind, true), ball: canonical(sim, sim.ball), engagements: canonical(sim, sim.engagements),
    bond: canonical(sim, sim.bond), touchedAt: canonical(sim, sim.touchedAt), dives: canonical(sim, sim.dives), lunges: canonical(sim, sim.lunges),
    joints: canonical(sim, sim.world.joints), lastStep: canonical(sim, sim.lastStep), stats: canonical(sim, sim.stats), events: canonical(sim, sim.events),
    perception: canonical(sim, sim.perception, true), handoffAt: sim.handoffAt, throwAt: sim.throwAt, catchAt: sim.catchAt,
    catchX: sim.catchX, firstContactX: sim.firstContactX, possession: sim.possession, penalty: canonical(sim, sim.penalty),
    segments: canonical(sim, sim.segments), crossedLOS: sim.crossedLOS, scrambled: sim.scrambled, scrambleDrill: sim.scrambleDrill,
    nextRng: Object.assign(new Rng(0), sim.rng).nextU32(),
  };
}
export const rawResult = (r: any) => ({ ...r, frames: undefined, telemetry: undefined });
export const stripReplay = ({ replay, ...row }: any) => row;
export function gameSignature(game: any) { return sha({ score: game.score, log: game.log.map(stripReplay), quarterScores: game.quarterScores }); }
