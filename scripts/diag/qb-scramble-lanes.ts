/** Read-only tap on QBPass.shouldScramble in an ordinary game: for every call, the lane
 * table the QB used (live defenders, constant 0.8*vmax self arrival) next to two
 * references: the QB's own consumed defender estimates, and a fresh full-effort
 * start from the QB's actual velocity. Draws no RNG and changes no behavior.
 *   node --import tsx scripts/diag/qb-scramble-lanes.ts --seed 53 --out out/qb-requal
 * Recipe is the ordinary53 one: new Rng(seed) -> Ironmen, Comets (strength .55),
 * Game seed = seed, stop after `cohort` non-nullified run/pass plays or `max-steps` steps. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Rng } from '../../src/core/rng.js';
import { FIELD_WIDTH } from '../../src/core/field.js';
import { Game, type GameResult, type PlaySetupContext } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import { sprintTime, timeToReach } from '../../src/physics/reach.js';
import { QBPass } from '../../src/sim/behaviors/qb.js';
import { QBMind } from '../../src/sim/qbmind.js';
import type { PlaySim } from '../../src/sim/playsim.js';
import { PlaySim as PlaySimClass } from '../../src/sim/playsim.js';
import { bytesHash, captureSetup, executionIdentity, firstDifference, readSavedPlay, restoreSetup } from './saved-play.js';

const MARGIN = 0.35; // qb.ts shouldScramble: lane open if margin > MARGIN
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const eligible = (p: { kind: string; nullified?: boolean }) => (p.kind === 'run' || p.kind === 'pass') && !p.nullified;

type Row = Record<string, unknown>;
interface PlayTap { index: number; id: string; setupSha256: string; calls: Row[]; scramble: { t: number } | null }

/** Install the read-only wrappers; `attach` binds one PlaySim to its play record. */
function makeTap() {
  const simPlay = new WeakMap<PlaySim, PlayTap>();
  const estimates = new WeakMap<PlaySim, Map<string, { pos: unknown; vel: unknown }>>(); // key `${t}:${idx}`
  const qbProto = QBPass.prototype as any, mindProto = QBMind.prototype as any;
  const origScramble = qbProto.shouldScramble, origEstimate = mindProto.estimate;
  {
    mindProto.estimate = function (this: any, d: any) {
      const p = origEstimate.call(this, d);
      const sim: PlaySim = this.sim;
      let m = estimates.get(sim); if (!m) estimates.set(sim, m = new Map());
      m.set(`${sim.t}:${d.idx}`, { pos: { ...p.pos }, vel: { ...p.vel } });
      return p;
    };
    qbProto.shouldScramble = function (this: any, a: any, sim: PlaySim, panic: boolean) {
      const play = simPlay.get(sim);
      const before = { x: a.pos.x, y: a.pos.y }, speed = Math.hypot(a.vel.x, a.vel.y);
      const result = origScramble.call(this, a, sim, panic);
      if (!play) return result;
      const est = estimates.get(sim);
      const vmax = a.profile.vmax, tau = a.profile.tau;
      const lanes = [-4, -2, 0, 2, 4].map(dy => ({ x: Math.max(before.x + 4, sim.los + 1), y: clamp(before.y + dy, 1, FIELD_WIDTH - 1) }));
      if (panic) for (const side of [-1, 1]) lanes.push({ x: before.x + 1, y: clamp(before.y + side * 5.5, 1, FIELD_WIDTH - 1) });
      const mobility = 0.5 * clamp((5.0 - a.player.measurables.forty) / 0.6, 0, 1) + 0.5 * a.r('elusiveness');
      const rows = lanes.map(q => {
        const dist = Math.hypot(q.x - before.x, q.y - before.y);
        const ux = (q.x - before.x) / (dist || 1), uy = (q.y - before.y) / (dist || 1);
        const selfNative = dist / (vmax * 0.8);
        const selfFull = sprintTime(dist, Math.max(0, a.vel.x * ux + a.vel.y * uy), vmax, tau);
        const arrive = (view: boolean) => {
          let best = { tt: Infinity, slot: '' }, known = 0;
          for (const d of sim.defense) {
            if (d.isDown(sim.t)) continue;
            const e = view ? est?.get(`${sim.t}:${d.idx}`) : undefined;
            if (e) known++;
            const p = (e ?? d) as { pos: any; vel: any };
            const tt = timeToReach({ pos: p.pos, vel: p.vel, profile: d.profile, speedScale: d.speedScale }, q, 1) + (d.engagement ? 0.5 : 0);
            if (tt < best.tt) best = { tt, slot: d.slot };
          }
          return { ...best, known };
        };
        const live = arrive(false), seen = arrive(true);
        const m = (self: number, o: { tt: number }) => o.tt - self;
        return { q, dist, selfNative, selfFull,
          liveNative: { margin: m(selfNative, live), limiter: live.slot },
          consumedNative: { margin: m(selfNative, seen), limiter: seen.slot, estimatesUsed: seen.known },
          liveFull: { margin: m(selfFull, live), limiter: live.slot },
          consumedFull: { margin: m(selfFull, seen), limiter: seen.slot } };
      });
      const open = (k: 'liveNative' | 'consumedNative' | 'liveFull' | 'consumedFull') => rows.filter(r => r[k].margin > MARGIN).length;
      play.calls.push({ t: sim.t, panic, result, readIdx: this.readIdx, mobility, qb: { pos: before, speed, vmax, tau },
        threshold: MARGIN, open: { liveNative: open('liveNative'), consumedNative: open('consumedNative'), liveFull: open('liveFull'), consumedFull: open('consumedFull') },
        lanes: rows });
      if (result && !play.scramble) play.scramble = { t: sim.t };
      return result;
    };
  }
  return {
    attach(sim: PlaySim, index: number, setupSha256: string): PlayTap {
      const play: PlayTap = { index, id: `G1-P${String(index + 1).padStart(3, '0')}`, setupSha256, calls: [], scramble: null };
      simPlay.set(sim, play);
      return play;
    },
    uninstall() { qbProto.shouldScramble = origScramble; mindProto.estimate = origEstimate; },
  };
}

function playGame(seed: number, cohort: number, maxSteps: number, tap: boolean) {
  const rng = new Rng(seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const plays = new Map<number, PlayTap>();
  const t = tap ? makeTap() : null;
  let pending: { context: PlaySetupContext; setupSha256: string } | null = null;
  const hooks = t ? {
    playSetup(setup: any, context: PlaySetupContext) {
      pending = context.kind === 'scrimmage' ? { context, setupSha256: bytesHash(captureSetup(setup)) } : null;
    },
    playResult(sim: PlaySim) {
      if (!pending) return undefined;
      plays.set(pending.context.index, t.attach(sim, pending.context.index, pending.setupSha256));
      return undefined;
    },
  } : undefined;
  try {
    const game = new Game(home, away, { seed, record: true, recordLevel: 'full', hooks });
    game.kickoffToStart();
    let steps = 0;
    while (steps < maxSteps && !game.state.over) {
      game.step(); steps++;
      if (game.result().log.filter(eligible).length >= cohort) break;
    }
    return { result: game.result() as GameResult, steps, plays };
  } finally { t?.uninstall(); }
}

/** Same constructor bytes as a saved play (e.g. the ordinary53 packet), run on today's source. */
function playSaved(files: string[], out: string) {
  const identity = executionIdentity(), rows: Row[] = [];
  for (const file of files) {
    const saved = readSavedPlay(file);
    const run = (tap: boolean) => {
      const t = tap ? makeTap() : null;
      try {
        const sim = new PlaySimClass(restoreSetup(saved.setup));
        const play = t?.attach(sim, saved.context.index, saved.setupSha256) ?? null;
        return { play, result: sim.run() };
      } finally { t?.uninstall(); }
    };
    const off = run(false), on = run(true);
    const diff = firstDifference(off.result, on.result);
    if (diff) throw new Error(`Tap changed ${saved.game.playId}: ${JSON.stringify(diff)}`);
    const o = saved.original.result;
    rows.push({ id: saved.game.playId, file, setupSha256: saved.setupSha256, call: saved.film.call,
      packet: { commit: saved.identity.commit, node: saved.identity.node, outcome: o.outcome, yards: o.yards, scramble: !!o.stats.scramble },
      today: { outcome: on.result.outcome, yards: on.result.yards, scramble: !!on.result.stats.scramble,
        shouldScrambleCalls: on.play!.calls.length, firstOpenCallAt: on.play!.scramble?.t ?? null,
        scrambleEventAt: (on.result.events.find(e => e.type === 'scramble') as { t?: number } | undefined)?.t ?? null },
      calls: on.play!.calls });
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/qb-scramble-lanes-saved.json`, JSON.stringify({ identity: { ...identity, nodeNeeded: '22.23.3' },
    neutrality: 'play result identical with tap on/off (firstDifference null)', threshold: MARGIN, plays: rows }, null, 1));
  for (const r of rows as any[]) console.log(`${r.id} ${r.call}\n  packet(${r.packet.commit.slice(0, 7)}): ${r.packet.outcome} ${r.packet.yards.toFixed(2)} scramble=${r.packet.scramble}\n  today: ${r.today.outcome} ${r.today.yards.toFixed(2)} scramble=${r.today.scramble} calls=${r.today.shouldScrambleCalls} firstOpenCall=${r.today.firstOpenCallAt} scrambleEvent=${r.today.scrambleEventAt}`);
}

function main() {
  const { values: v } = parseArgs({ options: { seed: { type: 'string', default: '53' }, cohort: { type: 'string', default: '6' },
    'max-steps': { type: 'string', default: '20' }, saved: { type: 'string', multiple: true }, out: { type: 'string', default: 'out/qb-requal' } } });
  if (v.saved?.length) return playSaved(v.saved, v.out!);
  const seed = Number(v.seed), cohort = Number(v.cohort), maxSteps = Number(v['max-steps']);
  const identity = executionIdentity();
  const on = playGame(seed, cohort, maxSteps, true);
  const off = playGame(seed, cohort, on.steps, false);
  const diff = firstDifference(off.result, on.result);
  if (diff) throw new Error(`Tap changed the game: ${JSON.stringify(diff)}`);
  const ledger = on.result.log.map(p => {
    const t = on.plays.get(p.index);
    return { id: `G1-P${String(p.index + 1).padStart(3, '0')}`, kind: p.kind, nullified: !!p.nullified, selected: false,
      call: p.call, defense: p.defense, outcome: p.outcome, yards: p.yards, setupSha256: t?.setupSha256,
      shouldScrambleCalls: t?.calls.length ?? 0, firstOpenCallAt: t?.scramble?.t ?? null,
      scrambleEventAt: ((p.replay?.events ?? []).find((e: { type: string }) => e.type === 'scramble') as { t?: number } | undefined)?.t ?? null, scrambledStat: !!(p.stats as any)?.scramble };
  });
  let n = 0;
  for (const row of ledger) if (eligible(row) && n++ < cohort) row.selected = true;
  mkdirSync(v.out!, { recursive: true });
  const file = `${v.out}/qb-scramble-lanes.json`;
  writeFileSync(file, JSON.stringify({ identity: { ...identity, nodeNeeded: '22.23.3' }, recipe: { seed, cohort, maxSteps, steps: on.steps },
    neutrality: 'game result identical with tap on/off (firstDifference null)', threshold: MARGIN, ledger,
    plays: Object.fromEntries([...on.plays.values()].filter(p => p.calls.length).map(p => [p.id, p])) }, null, 1));
  for (const r of ledger.filter(r => r.selected || r.shouldScrambleCalls))
    console.log(`${r.id} ${r.selected ? '*' : ' '} ${r.kind} ${r.call} | ${r.outcome} ${r.yards?.toFixed(2)} setup ${r.setupSha256?.slice(0, 8)} calls ${r.shouldScrambleCalls} firstOpenCall@${r.firstOpenCallAt} scrambleEvent@${r.scrambleEventAt}`);
  console.log(`wrote ${file}; steps ${on.steps}; tap neutral`);
}
main();
