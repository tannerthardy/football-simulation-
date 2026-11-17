/** Replay export metadata and packing; no changes to simulated play behavior. */
import type { PlayLog } from '../src/game/game.js';
import { PASS_BY_ID, RUN_CONCEPTS } from '../src/playbook/concepts.js';
import type { ReplayLevel } from '../src/sim/types.js';
import { packArt, type ArtSheet } from './play-art.js';

export function replayOptions(args: string[]) {
  let seed = 7;
  let seedSet = false;
  let games = 1;
  let out = 'out/replay.html';
  let document = false;
  let telemetry: ReplayLevel = 'light';
  let runOnly = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--doc') document = true;
    else if (arg === '--run-only') runOnly = true;
    else if (arg === '--out' || arg === '--games' || arg === '--telemetry') {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
      if (arg === '--out') out = value;
      else if (arg === '--games') games = Number(value);
      else {
        if (!['light', 'standard', 'full'].includes(value)) throw new Error('--telemetry must be light, standard or full');
        telemetry = value as ReplayLevel;
      }
    } else if (!arg.startsWith('--') && !seedSet) {
      seed = Number(arg);
      seedSet = true;
    } else throw new Error(`Unknown replay argument: ${arg}`);
  }
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Seed must be an integer from 0 to 4294967295');
  if (!Number.isInteger(games) || games < 1 || games > 50) throw new Error('--games must be an integer from 1 to 50');
  if (seed + games - 1 > 0xffffffff) throw new Error('Game seeds exceed 4294967295');
  return { seed, games, out, document, telemetry, runOnly };
}

const KIND_LABEL: Record<PlayLog['kind'], string> = {
  run: 'Run', pass: 'Pass', punt: 'Punt', fg: 'Field goal', xp: 'Extra point', kickoff: 'Kickoff',
  kneel: 'Kneel', penalty: 'Penalty', two: 'Two-point try',
};
const SHOWN_EVENTS = new Set(['pressure', 'pitch', 'pitch_catch', 'handoff', 'throw', 'throwaway', 'catch', 'drop', 'pbu', 'interception', 'shed', 'sack', 'tackle', 'tackle_wrap', 'carrier_contact', 'missed_tackle', 'broken_tackle', 'fumble', 'recovery', 'touchdown', 'safety', 'out_of_bounds', 'scramble', 'slide', 'block_contact', 'block_exchange', 'block_collect', 'block_threat', 'block_abandon', 'block_log', 'block_climb', 'squeeze']);
/** Frame coordinates in hundredths: tenths at 10 Hz alias anyone slower than
 * about 1 yd/s into stop-and-go steps on playback (tracking and the sim both
 * carry 0.01 yd). The viewer reads the scale from the frames. */
const FRAME_SCALE = 100;
const scaled = (v: number) => Math.round(v * FRAME_SCALE);
const r2 = (v: number) => Math.round(v * 100) / 100;

export function replayConcept(p: PlayLog) {
  const id = p.plan?.concept;
  if (!id) return { id: p.kind, name: KIND_LABEL[p.kind], family: 'other' };
  const pass = PASS_BY_ID[id];
  if (pass) return { id, name: pass.name, family: pass.family };
  if (p.kind !== 'run') return { id, name: id, family: 'other' };
  const run = RUN_CONCEPTS.find((c) => c.scheme === id);
  const family = ['insideZone', 'outsideZone', 'wideZone', 'splitZone'].includes(id) ? 'zone'
    : ['power', 'counter', 'duo', 'trap'].includes(id) ? 'gap' : 'other-run';
  return { id, name: run?.name ?? (id === 'qbDraw' ? 'QB Draw' : id), family };
}

export function packReplayPlay(p: PlayLog, game: number, art?: ArtSheet) {
  const base = {
    id: `G${game + 1}-P${String(p.index + 1).padStart(3, '0')}`, game, index: p.index, kind: p.kind,
    q: p.quarter, clk: p.clock, off: p.offense, down: p.down, dist: p.distance, yl: p.yardline,
    call: p.call, def: p.defense, text: p.text, yds: r2(p.yards), score: p.score, kindLabel: KIND_LABEL[p.kind],
    read: p.stats?.qbRead, plan: p.plan, concept: replayConcept(p), outcome: p.outcome,
    nullified: !!p.nullified, firstDown: !!p.firstDown,
    targetId: p.stats?.target, receiverId: p.stats?.receiver, rusherId: p.stats?.rusher,
    retainedSnap: p.stats?.retainedSnap, segments: p.segments,
    flags: {
      td: !p.nullified && p.outcome === 'touchdown',
      to: !p.nullified && !!(p.stats?.interceptedBy || p.stats?.fumbleLost),
      sack: !p.nullified && !!p.stats?.sacked,
      big: !p.nullified && p.yards >= 20,
      complete: !p.nullified && !!p.stats?.completed,
      stuff: !p.nullified && p.kind === 'run' && p.yards <= 0,
      contact: !!p.replay?.events.some((e) => ['carrier_contact', 'tackle_wrap', 'tackle'].includes(e.type)),
      broken: (p.stats?.brokenTackles ?? 0) > 0,
      oob: p.outcome === 'oob',
      pressure: false,
    },
  };
  const rp = p.replay;
  if (!rp || rp.frames.length < 2) return base;
  const s = p.stats;
  const stats: Record<string, number | boolean> = {};
  if (s?.timeToThrow !== undefined) stats.ttt = r2(s.timeToThrow);
  if (s?.airYards !== undefined) stats.air = r2(s.airYards);
  if (s?.completedAirYards !== undefined && s.completed) stats.completedAir = r2(s.completedAirYards);
  if (s?.yac !== undefined && s.completed) stats.yac = r2(s.yac);
  if (s?.separation !== undefined && s.completed) stats.sep = r2(s.separation);
  if (s?.yardsBeforeContact !== undefined && s.rusher) stats.ybc = r2(s.yardsBeforeContact);
  if (s?.pressured) stats.pressured = true;
  if (p.kind === 'pass') {
    const qb = rp.players.findIndex(a => a.team === 'O' && a.slot === 'QB');
    const end = rp.events.find(e => ['throw', 'throwaway', 'sack', 'scramble'].includes(e.type))?.t ?? Infinity;
    const defenders = rp.players.flatMap((a, i) => a.team === 'D' ? [i] : []);
    if (qb >= 0) for (const f of rp.frames) {
      if (f.t < 0.5 || f.t > end + 1e-6) continue;
      if (defenders.some(i => Math.hypot(f.agents[i * 3] - f.agents[qb * 3], f.agents[i * 3 + 1] - f.agents[qb * 3 + 1]) < 2)) {
        stats.pressure2yd = true; stats.ttp = r2(f.t); break;
      }
    }
  }
  return {
    ...base, flags: { ...base.flags, pressure: !p.nullified && stats.pressure2yd === true }, los: rp.los, fd: rp.firstDownX,
    roster: rp.players.map((a) => [a.team, a.slot, a.name, a.jersey]),
    weights: rp.players.map(a => a.weightLb ?? null),
    profiles: rp.profiles,
    art: art ? packArt(art, rp.players) : undefined,
    telemetry: rp.telemetry,
    eventDetails: rp.events.map(e => ({ ...e, t: r2(e.t), pos: e.pos ? { ...e.pos } : undefined })),
    stats,
    ev: rp.events.filter((e) => SHOWN_EVENTS.has(e.type)).map((e) => [r2(e.t), e.type]),
    frames: {
      t: rp.frames.map((f) => f.t),
      scale: FRAME_SCALE,
      p: rp.frames.flatMap((f) => f.agents.map(scaled)),
      b: rp.frames.flatMap((f) => f.ball.map(scaled)),
      c: rp.frames.map((f) => f.carrier),
      s: rp.frames.flatMap((f) => (f.carrierPosture ?? [0, 0]).map(scaled)),
    },
  };
}
