/** Diagnostic only. Run through scripts/baseline.mjs; no production ratings change.
 * node --import tsx scripts/roster-audit.ts profiles|encounters|contexts|games|native|quality
 *   --out out/roster-audit --teams 64 --pairs 12 --reps 8 --seed 90210
 * native additionally requires --input out/roster-audit/native-contexts.json.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { Rng } from '../src/core/rng.js';
import { CENTER_Y } from '../src/core/field.js';
import { clamp } from '../src/core/vec.js';
import { generateTeam, pickOffense, pickDefense, type Team } from '../src/league/team.js';
import { Game } from '../src/game/game.js';
import { generatePlayer } from '../src/players/generator.js';
import { derivePhysical, solveSprint } from '../src/players/physical.js';
import { bestRoles, overallAt } from '../src/players/roles.js';
import { ALL_POSITIONS, type Player, type Position } from '../src/players/types.js';
import { fatigueFactor } from '../src/physics/kinematics.js';
import { supportParams } from '../src/physics/support.js';
import { OFF_PERSONNEL, DEF_PERSONNEL, type OffSlot, type DefSlot, type PersonnelId, type DefPersonnelId } from '../src/playbook/types.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';
import { chase } from '../src/sim/behaviors/common.js';
import { ScoutingReport } from '../src/sim/recognition.js';
import { CoverageScouting } from '../src/sim/qbmind.js';
import { sourceVersion } from './source-version.js';

export const hash = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const mean = (xs: number[]): number | null => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
export function distribution(xs: number[]) {
  if (xs.some(x => !Number.isFinite(x))) throw new Error('Nonfinite audit measurement');
  const sorted = [...xs].sort((a, b) => a - b), m = mean(xs);
  const q = (p: number) => sorted.length ? sorted[Math.floor(p * (sorted.length - 1))] : null;
  return { n: xs.length, mean: m, sd: xs.length > 1 ? Math.sqrt(xs.reduce((s, x) => s + (x - m!) ** 2, 0) / (xs.length - 1)) : null,
    min: sorted[0] ?? null, p10: q(.1), p50: q(.5), p90: q(.9), max: sorted.at(-1) ?? null };
}
function correlation(xs: number[], ys: number[]): number | null {
  const mx = mean(xs), my = mean(ys);
  if (mx === null || my === null || xs.length !== ys.length) return null;
  let xy = 0, xx = 0, yy = 0;
  xs.forEach((x, i) => { xy += (x - mx) * (ys[i] - my); xx += (x - mx) ** 2; yy += (ys[i] - my) ** 2; });
  return xx && yy ? xy / Math.sqrt(xx * yy) : null;
}
export function capabilities(player: Player, energy = 1): Record<string, number> {
  const p = derivePhysical(player), s = supportParams(p), fat = fatigueFactor(energy);
  return { ...Object.fromEntries(Object.entries(player.ratings).map(([k, v]) => [k, v])),
    ...Object.fromEntries(Object.entries(player.measurables).map(([k, v]) => [k, v])),
    vmax: p.vmax, acceleration0: p.vmax / p.tau, brake: p.brake, lateral: p.lateral,
    backpedal: p.backpedal, reactionTime: p.reactionTime, stepSpeed: s.stepSpeed,
    bend: s.bend, getUp: s.getUp, massKg: p.massKg, power: p.power,
    armForce: s.armForce, pushForce: s.pushForce, traction: s.traction, baseRadius: s.baseRadius,
    gripAtHalfQuality: s.armForce * (.3 + 2.5 * .5 ** 2) * (.6 + .6 * player.ratings.tackling / 100),
    energy, effectiveVmax: p.vmax * fat, stopDistanceAt7: 7 ** 2 / (2 * p.brake * fat), overall: overallAt(player) };
}
const grouped = <T>(xs: T[], key: (x: T) => string): Record<string, T[]> => {
  const out: Record<string, T[]> = {};
  for (const x of xs) (out[key(x)] ??= []).push(x);
  return out;
};
function metrics(players: Player[]) {
  const vectors = players.map(p => capabilities(p));
  return Object.fromEntries(Object.keys(vectors[0] ?? {}).map(k => [k, distribution(vectors.map(v => v[k]))]));
}
export type Arm = 'original' | 'balance+25' | 'balance+45' | 'tackling+15' | 'strength+15' | 'fresh';
export const ARMS: Arm[] = ['original', 'balance+25', 'balance+45', 'tackling+15', 'strength+15', 'fresh'];
/** Freeze assignment/identity and isolate one rating. Fresh replaces profiles at
 * each listed position, retaining identity, familiarity, age and experience. */
export function intervene(setup: PlaySetup, arm: Arm, key: string): PlaySetup {
  const copy = structuredClone(setup);
  copy.defense = Object.fromEntries(Object.entries(copy.defense).map(([slot, p]) => {
    const ratings = p.ratings;
    if (arm.startsWith('balance') && ['LB', 'CB', 'S'].includes(p.position))
      ratings.balance = clamp(ratings.balance + (arm === 'balance+25' ? 25 : 45), 1, 99);
    if (arm === 'tackling+15') ratings.tackling = clamp(ratings.tackling + 15, 1, 99);
    if (arm === 'strength+15') ratings.strength = clamp(ratings.strength + 15, 1, 99);
    if (arm === 'fresh') {
      const fresh = generatePlayer(new Rng(`${key}:D:${slot}`), p.position, { quality: .645, age: p.age, id: p.id });
      p.measurables = fresh.measurables; p.ratings = fresh.ratings; p.archetype = fresh.archetype;
    }
    return [slot, p];
  }));
  return copy;
}
function team(seed: string, abbr: string, strength = .55): Team {
  return generateTeam(new Rng(seed), abbr, abbr, { strength, offScheme: 'spread', defScheme: '4-3' });
}
export function setupFor(seed: number, pair: number, playSeed: number, concept = 'slant_flat', coverage = 'cover3'): PlaySetup {
  const offense = pickOffense(team(`${seed}:pair:${pair}:O`, 'AUDO'), '11');
  const defense = pickDefense(team(`${seed}:pair:${pair}:D`, 'AUDD'), 'nickel');
  const run = RUN_BY_ID[concept];
  if (!run && !PASS_BY_ID[concept]) throw new Error(`Unknown concept ${concept}`);
  return { offense, defense,
    offCall: run ? { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run, label: concept }
      : { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID[concept], label: concept },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: coverage },
    los: 35, ballY: CENTER_Y, firstDownX: 45, seed: playSeed, audibles: false };
}
interface Options { out: string; seed: number; teams: number; pairs: number; reps: number; input?: string; checkpoint?: string; candidate?: boolean }
export function auditBudget(mode: string, opts: Pick<Options, 'teams' | 'pairs' | 'reps'>) {
  return { profiles: mode === 'profiles' ? opts.teams * 3 * 53 : mode === 'quality' ? opts.teams * 3 * ALL_POSITIONS.length : 0,
    snaps: mode === 'encounters' ? opts.pairs * opts.reps * 3 * 2 * 2 * ARMS.length
      : mode === 'contexts' ? opts.pairs * opts.reps * 4 * 3 : 0,
    games: mode === 'games' ? opts.pairs * opts.reps : 0 };
}
function profiles(opts: Options) {
  const selectionFailures: unknown[] = [];
  const all: Array<{ strength: number; seed: string; team: Team }> = [], exposures: Array<{
    team: string; strength: number; package: string; side: string; condition: string; slot: string;
    id: string; listedPosition: Position; nominalPosition: Position; energy: number; overallAtSlot: number;
    bestRoleAtSlot: string; capabilities: Record<string, number>
  }> = [];
  const selected: Array<{ strength: number; cohort: string; player: Player }> = [];
  for (const strength of [.25, .55, .85]) for (let i = 0; i < opts.teams; i++) {
    const seed = `${opts.seed}:profiles:${strength}:${i}`, t = team(seed, `A${strength * 100}-${i}`, strength);
    all.push({ strength, seed, team: t });
    const firstOff = pickOffense(t, '11'), firstDef = pickDefense(t, 'base43');
    const active = new Set([...Object.values(firstOff), ...Object.values(firstDef)].map(p => p!.id));
    for (const p of t.roster) {
      selected.push({ strength, cohort: 'roster', player: p });
      selected.push({ strength, cohort: active.has(p.id) ? 'selected-11-base43' : 'bench-11-base43', player: p });
    }
    const energy = new Map(t.roster.map(p => [p.id, active.has(p.id) ? .55 : 1]));
    for (const condition of ['fresh', 'tired-starters', 'unavailable-starters']) {
      const av = condition === 'fresh' ? {} : condition === 'tired-starters' ? { energy } : { unavailable: active };
      for (const side of ['O', 'D']) for (const pkg of Object.keys(side === 'O' ? OFF_PERSONNEL : DEF_PERSONNEL)) {
        let chosen: Partial<Record<OffSlot | DefSlot, Player>>;
        try { chosen = side === 'O' ? pickOffense(t, pkg as PersonnelId, av) : pickDefense(t, pkg as DefPersonnelId, av); }
        catch (error) { selectionFailures.push({ team: t.abbr, strength, side, package: pkg, condition, error: String(error) }); continue; }
        if (Object.keys(chosen).length !== 11 || new Set(Object.values(chosen).map(p => p!.id)).size !== 11)
          throw new Error(`Incomplete or duplicate selection: ${t.abbr}/${pkg}/${condition}`);
        for (const [slot, p] of Object.entries(chosen) as Array<[string, Player]>) {
          const nominal = side === 'D' ? DEF_PERSONNEL[pkg as DefPersonnelId][slot as DefSlot]!
            : ({ QB: 'QB', LT: 'OT', RT: 'OT', LG: 'OG', RG: 'OG', C: 'C' } as Record<string, Position>)[slot]
              ?? OFF_PERSONNEL[pkg as PersonnelId][slot as keyof typeof OFF_PERSONNEL[PersonnelId]]!;
          const e = condition === 'tired-starters' ? energy.get(p.id)! : 1;
          exposures.push({ team: t.abbr, strength, package: pkg, side, condition, slot, id: p.id,
            listedPosition: p.position, nominalPosition: nominal, energy: e, overallAtSlot: overallAt(p, nominal),
            bestRoleAtSlot: bestRoles(p, nominal)[0].role.id, capabilities: capabilities(p, e) });
        }
      }
    }
  }
  const byPosition = Object.fromEntries(Object.entries(grouped(selected, x => `${x.strength}/${x.cohort}/${x.player.position}`))
    .map(([k, rs]) => [k, metrics(rs.map(r => r.player))]));
  const bySlot = Object.fromEntries(Object.entries(grouped(exposures, x => `${x.strength}/${x.condition}/${x.package}/${x.slot}`))
    .map(([k, rs]) => [k, { n: rs.length, listedPositions: Object.fromEntries(Object.entries(grouped(rs, r => r.listedPosition)).map(([p, v]) => [p, v.length])),
      outOfPosition: rs.filter(r => r.listedPosition !== r.nominalPosition).length,
      energy: distribution(rs.map(r => r.energy)), balance: distribution(rs.map(r => r.capabilities.balance)),
      effectiveVmax: distribution(rs.map(r => r.capabilities.effectiveVmax)), fit: distribution(rs.map(r => r.overallAtSlot)) }]));
  const correlations = Object.fromEntries(ALL_POSITIONS.map(pos => {
    const ps = selected.filter(r => r.strength === .55 && r.cohort === 'roster' && r.player.position === pos).map(r => r.player);
    return [pos, { n: ps.length, weightForty: correlation(ps.map(p => p.measurables.weightLb), ps.map(p => p.measurables.forty)),
      balanceShuttle: correlation(ps.map(p => p.ratings.balance), ps.map(p => p.measurables.shuttle)),
      tacklingPursuit: correlation(ps.map(p => p.ratings.tackling), ps.map(p => p.ratings.pursuit)),
      sprintBound: ps.filter(p => { const { tau } = solveSprint(p.measurables.tenSplit, p.measurables.forty); return tau <= .0500001 || tau >= 2.999999; }).length,
      cappedRatings: ps.reduce((n, p) => n + Object.values(p.ratings).filter(v => v === 1 || v === 99).length, 0) }];
  }));
  const units = all.map(({ strength, team: t }) => {
    const os = pickOffense(t, '11'), ds = pickDefense(t, 'nickel');
    const unit = (ps: Player[], field: string) => mean(ps.map(p => capabilities(p)[field]))!;
    const ol = ['LT', 'RT', 'LG', 'RG', 'C'].map(s => os[s as OffSlot]);
    const dl = ['DE_W', 'DE_S', 'DT_W', 'DT_S'].map(s => ds[s as DefSlot]!);
    return { team: t.abbr, strength, offFit: unit(Object.values(os), 'overall'), defFit: unit(Object.values(ds) as Player[], 'overall'),
      qbFit: overallAt(os.QB), olPower: unit(ol, 'power'), dlPower: unit(dl, 'power'),
      olBlock: unit(ol, 'runBlock'), dlShed: unit(dl, 'blockShedding'),
      wrSpeed: unit(Object.values(os).filter(p => p.position === 'WR'), 'vmax'),
      dbSpeed: unit(Object.values(ds).filter(p => ['CB', 'S'].includes(p!.position)) as Player[], 'vmax') };
  });
  const unitDistributions = Object.fromEntries([.25, .55, .85].map(strength => {
    const rs = units.filter(u => u.strength === strength);
    return [strength, Object.fromEntries(Object.keys(rs[0]).filter(k => !['team', 'strength'].includes(k))
      .map(k => [k, distribution(rs.map(r => (r as unknown as Record<string, number>)[k]))]))];
  }));
  return { summary: { teams: all.length, players: all.reduce((n, x) => n + x.team.roster.length, 0),
    exposures: exposures.length, selectionFailures, byPosition, bySlot, correlations, unitDistributions }, raw: { rosters: all, exposures, units } };
}

interface Outcome { pair: number; cell: string; rep: number; arm: Arm; seed: number; yards: number;
  tackled: number; censored: number; escaped: number; grips: number; broken: number; missed: number;
  fumbled?: number; yac?: number; completed?: number; attempted?: number; sack?: number; explosiveYac?: number; duration: number }
function summaries(rows: Outcome[]) {
  const fields = ['yards', 'tackled', 'censored', 'escaped', 'grips', 'broken', 'missed', 'fumbled', 'yac', 'completed', 'attempted', 'sack', 'explosiveYac', 'duration'] as const;
  const describe = (rs: Outcome[]): Record<typeof fields[number], ReturnType<typeof distribution>> =>
    Object.fromEntries(fields.map(k => [k, distribution(rs.flatMap(r => r[k] === undefined ? [] : [r[k]!]))])) as Record<typeof fields[number], ReturnType<typeof distribution>>;
  const cells = Object.fromEntries(Object.entries(grouped(rows, r => `${r.arm}/${r.cell}`)).map(([k, rs]) => [k, describe(rs)]));
  const base = new Map(rows.filter(r => r.arm === 'original').map(r => [`${r.pair}/${r.cell}/${r.rep}`, r]));
  const paired = Object.fromEntries(ARMS.filter(a => a !== 'original').map(arm => {
    const rs = rows.filter(r => r.arm === arm), ds = rs.map(r => {
      const b = base.get(`${r.pair}/${r.cell}/${r.rep}`)!;
      return { ...r, yards: r.yards - b.yards, tackled: r.tackled - b.tackled, censored: r.censored - b.censored,
        yac: r.yac === undefined || b.yac === undefined ? undefined : r.yac - b.yac };
    });
    return [arm, { n: rs.length, gainedTackles: ds.filter(r => r.tackled > 0).length, lostTackles: ds.filter(r => r.tackled < 0).length,
      deltaYards: distribution(ds.map(r => r.yards)), bothCompletedDeltaYac: distribution(ds.flatMap(r => r.yac === undefined ? [] : [r.yac])),
      byPairDeltaYards: distribution(Object.values(grouped(ds, r => String(r.pair))).map(v => mean(v.map(r => r.yards))!)) }];
  }));
  const pairVariation = Object.fromEntries(Object.entries(grouped(rows.filter(r => r.arm === 'original'), r => r.cell)).map(([k, rs]) => {
    const pairs = Object.entries(grouped(rs, r => String(r.pair))).map(([pair, v]) => ({ pair: Number(pair), ...describe(v) }));
    return [k, { pairs, pairMeanYards: distribution(pairs.map(p => p.yards.mean!)), pairTackleRate: distribution(pairs.map(p => p.tackled.mean!)) }];
  }));
  return { n: rows.length, cells, paired, pairVariation };
}
export function encounter(setup: PlaySetup, slot: DefSlot, angle: number, speed: number, side: 1 | -1) {
  const sim = new PlaySim(setup), c = sim.slot('Z')!, d = sim.slot(slot)!;
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + a.idx * .1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 };
    a.downUntil = 99; a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  c.downUntil = d.downUntil = -1;
  sim.t = sim.world.time = 2;
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 2; sim.catchX = 50;
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: speed, y: 0 }; c.body.facing = 0;
  const theta = angle * Math.PI / 180;
  d.body.pos = { x: 50 + 4 * Math.cos(theta) + speed * .4, y: CENTER_Y + side * 4 * Math.sin(theta) };
  d.body.facing = Math.atan2(c.pos.y - d.pos.y, c.pos.x - d.pos.x);
  d.body.vel = { x: Math.cos(d.body.facing) * 4, y: Math.sin(d.body.facing) * 4 };
  c.behavior = { kind: 'idle', update: () => ({ vel: { x: speed, y: 0 } }) };
  d.behavior = { kind: 'idle', update: () => chase(sim, d, c) };
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, c.idx);
  const seen = new Set<object>();
  let escaped = 0;
  while (sim.phase === 'live' && sim.t < 7) {
    sim.tick();
    for (const joint of sim.world.joints) if (joint.kind === 'grasp' && joint.b === c.body) seen.add(joint);
    const live = sim.world.joints.some(j => j.kind === 'grasp' && j.b === c.body && !j.broken);
    if (!live && c.pos.x > d.pos.x && Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y) > 3
      && c.vel.x > d.vel.x && sim.t > 2.3) { escaped = 1; break; }
  }
  const tackled = Number(sim.outcome === 'tackle');
  // Escapes stop before a whistle; their advances have a different exposure
  // duration. Compare completion/escape/censor counts, not pooled mean advance.
  return { yards: (sim.endSpot?.x ?? c.pos.x) - 50, tackled, escaped, censored: Number(!tackled && !escaped),
    grips: seen.size, broken: sim.stats.brokenTackles, missed: sim.stats.missedTackles, duration: sim.t - 2,
    fumbled: Number(!!sim.stats.fumbledBy),
    actors: [c, d].map(a => ({ id: a.player.id, slot: a.slot, position: a.player.position, profile: a.profile,
      ratings: a.player.ratings, energy: a.body.energy })) };
}
function encounters(opts: Options) {
  const rows: Outcome[] = [], inputs: unknown[] = [];
  for (let pair = 0; pair < opts.pairs; pair++) {
    const base = setupFor(opts.seed, pair, 0); inputs.push(base);
    for (const slot of ['FS', 'CB_S', 'LB_M'] as DefSlot[]) for (const angle of [45, 135])
      for (const side of [1, -1] as const) for (let rep = 0; rep < opts.reps; rep++) {
        const seed = new Rng(`${opts.seed}:encounter:${rep}`).key;
        for (const arm of ARMS) {
          const s = intervene({ ...base, seed }, arm, `${opts.seed}:fresh:${pair}`);
          const result = encounter(s, slot, angle, 6, side);
          rows.push({ pair, cell: `${slot}/${angle}/${side}`, rep, arm, seed, ...result });
        }
      }
    console.log(`encounters pair ${pair + 1}/${opts.pairs}`);
  }
  return { summary: summaries(rows), raw: { inputs, rows } };
}
function contexts(opts: Options) {
  const rows: Outcome[] = [], inputs: unknown[] = [];
  for (let pair = 0; pair < opts.pairs; pair++) {
    for (const [concept, coverage] of [['slant_flat', 'cover3'], ['mesh', 'cover1'], ['iz_strong', 'cover3'], ['oz_strong', 'cover3']]) {
      const base = setupFor(opts.seed, pair, 0, concept, coverage); inputs.push({ pair, concept, coverage, setup: base });
      for (let rep = 0; rep < opts.reps; rep++) {
        const seed = new Rng(`${opts.seed}:context:${rep}`).key;
        for (const arm of ['original', 'balance+25', 'tackling+15'] as Arm[]) {
          const sim = new PlaySim(intervene({ ...base, seed }, arm, `${opts.seed}:fresh:${pair}`)), r = sim.run();
          rows.push({ pair, cell: `${concept}/${coverage}`, rep, arm, seed, yards: r.offenseYards,
            tackled: Number(r.outcome === 'tackle'), censored: Number(r.outcome === 'timeout'), escaped: Number(r.outcome === 'touchdown'),
            grips: r.events.filter(e => e.type === 'tackle_wrap').length, broken: r.stats.brokenTackles, missed: r.stats.missedTackles,
            yac: r.stats.completed ? r.stats.yac : undefined, completed: Number(r.stats.completed), attempted: Number(r.stats.attempted),
            sack: Number(r.stats.sacked), explosiveYac: r.stats.completed ? Number((r.stats.yac ?? 0) >= 15) : undefined, duration: r.duration });
        }
      }
    }
    console.log(`contexts pair ${pair + 1}/${opts.pairs}`);
  }
  return { summary: summaries(rows), raw: { inputs, rows } };
}
function games(opts: Options) {
  const rows: unknown[] = [], snaps: unknown[] = [], inputs: unknown[] = [], clips: unknown[] = [];
  for (let pair = 0; pair < opts.pairs; pair++) {
    const home = team(`${opts.seed}:game-pair:${pair}:H`, 'AUH'), away = team(`${opts.seed}:game-pair:${pair}:A`, 'AUA');
    // Fixed schemes and tendencies make this a roster panel. Both directions
    // are present in each game; game seeds are crossed with every pair.
    home.coach = { aggression: .5, passRate: .58, blitzRate: .25, manRate: .4, shadow: false, disguise: .25, matchRate: .6,
      coverageSystem: 'single-high', checkPick: 0 };
    away.coach = structuredClone(home.coach); inputs.push({ pair, home, away });
    for (let rep = 0; rep < opts.reps; rep++) {
      const seed = new Rng(`${opts.seed}:game:${rep}`).key;
      let game: Game, offCall: PlaySetup['offCall'], defCall: PlaySetup['defCall'], prefs: PlaySetup['manPrefs'];
      const selected = new Set<string>();
      game = new Game(home, away, { seed, hooks: { playResult(sim, kind) {
        if (kind === 'scrimmage') snaps.push({ pair, rep, index: snaps.length, agents: sim.agents.map(a => ({
          team: a.team, slot: a.slot, behavior: a.behavior.kind, id: a.player.id, position: a.player.position,
          energy: a.body.energy, ratings: a.player.ratings, measurables: a.player.measurables, profile: a.profile })) });
        if (kind !== 'scrimmage' || rep > 0 || selected.size >= 2) return undefined;
        const off = sim.qb.player.id.startsWith(home.abbr) ? 'home' : 'away', def = off === 'home' ? 'away' : 'home';
        const scout = Reflect.get(game, 'scouting')[def] as ScoutingReport;
        const covScout = Reflect.get(game, 'coverageScouting')[off] as CoverageScouting;
        const setup = structuredClone({ offense: Object.fromEntries(sim.offense.map(a => [a.slot, a.player])),
          defense: Object.fromEntries(sim.defense.map(a => [a.slot, a.player])), offCall, defCall, manPrefs: prefs,
          los: sim.los, ballY: sim.ballY, firstDownX: sim.firstDownX, seed: sim.rng.key,
          energy: [...Reflect.get(game, 'energy')], hurry: sim.hurry, down: sim.snapContext.down, audibles: true,
          scouting: { strength: Reflect.get(scout, 'strength'), cells: [...Reflect.get(scout, 'cells')] }, coverageScouting: { ...covScout } });
        const result = sim.run(), yac = result.stats.yac;
        const category = result.stats.completed && yac !== undefined ? yac >= 15 ? 'explosive'
          : yac <= 8 && result.outcome === 'tackle' ? 'ordinary' : null : null;
        if (category && !selected.has(category)) {
          selected.add(category);
          const signature = hash({ result: { ...result, frames: undefined, telemetry: undefined },
            bodies: sim.agents.map(a => a.body), rng: sim.rng, perception: sim.perception });
          clips.push({ id: `pair${pair}-seed${seed}-P${Reflect.get(game, 'playIndex') + 1}-${category}`, setup, result, signature });
        }
        return result;
      } } });
      for (const oc of Object.values(Reflect.get(game, 'oc')) as Array<{ call: (...args: never[]) => PlaySetup['offCall'] }>) {
        const original = oc.call.bind(oc); oc.call = (...args) => { offCall = original(...args); return offCall; };
      }
      for (const dc of Object.values(Reflect.get(game, 'dc')) as Array<{ call: (...args: never[]) => { call: PlaySetup['defCall']; prefs: PlaySetup['manPrefs'] } }>) {
        const original = dc.call.bind(dc); dc.call = (...args) => { const r = original(...args); defCall = r.call; prefs = r.prefs; return r; };
      }
      const result = game.play(), official = result.log.filter(p => !p.nullified && ['run', 'pass'].includes(p.kind));
      const catches = official.filter(p => p.stats?.completed && p.stats.yac !== undefined);
      const runs = official.filter(p => p.kind === 'run' || p.stats?.scramble);
      const passes = official.filter(p => p.kind === 'pass');
      rows.push({ pair, rep, seed, score: result.score, pointsPerTeam: (result.score.home + result.score.away) / 2,
        plays: official.length, catches: catches.length, yac: distribution(catches.map(p => p.stats!.yac!)),
        explosiveYac: catches.filter(p => p.stats!.yac! >= 15).length, rushes: runs.length,
        rushYards: distribution(runs.map(p => p.yards)), stuffs: runs.filter(p => p.yards <= 0).length,
        dropbacks: passes.length, sacks: passes.filter(p => p.stats!.sacked).length });
      console.log(`game pair ${pair + 1}/${opts.pairs}, rep ${rep + 1}/${opts.reps}: ${result.score.home}-${result.score.away}, ${catches.length} catches`);
    }
  }
  mkdirSync(opts.out, { recursive: true });
  writeFileSync(join(opts.out, 'native-contexts.json'), JSON.stringify({ source: sourceVersion(), clips }) + '\n');
  return { summary: { games: rows.length, savedClips: clips.length, rows }, raw: { inputs, snaps } };
}
function native(opts: Options) {
  if (!opts.input) throw new Error('native requires --input saved contexts');
  type Saved = Omit<PlaySetup, 'energy' | 'scouting' | 'coverageScouting'> & {
    energy: [string, number][]; scouting: { strength: number; cells: [string, { n: number; passes: number; expected: number }][] };
    coverageScouting: Record<string, unknown> };
  const input = JSON.parse(readFileSync(opts.input, 'utf8')) as { source: string; clips: Array<{ id: string; setup: Saved; result: unknown; signature: string }> };
  if (input.source !== sourceVersion()) throw new Error('Saved contexts have another runtime');
  const variants = [...ARMS.map(arm => ({ arm, stage: 'pre-snap' })),
    ...(['balance+25', 'tackling+15', 'strength+15'] as Arm[]).map(arm => ({ arm, stage: 'after-catch' }))];
  const catchPrefixes = new Map<string, string>();
  const rows = input.clips.flatMap(clip => variants.map(({ arm, stage }) => {
    const original = { ...clip.setup, scouting: undefined, coverageScouting: undefined, energy: new Map(clip.setup.energy) };
    const candidate = intervene(original, arm, `${opts.seed}:${clip.id}`);
    const s = stage === 'pre-snap' ? candidate : structuredClone(original);
    const scout = new ScoutingReport(clip.setup.scouting.strength);
    Reflect.set(scout, 'cells', new Map(structuredClone(clip.setup.scouting.cells)));
    s.scouting = scout; s.coverageScouting = Object.assign(new CoverageScouting(), structuredClone(clip.setup.coverageScouting));
    s.record = false;
    const sim = new PlaySim(s);
    let applied = false;
    if (stage === 'after-catch' || arm === 'original') {
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        tick();
        if (!applied && sim.events.some(e => e.type === 'catch' && e.a !== undefined && sim.agents[e.a].team === 'O')) {
          const prefix = hash({ bodies: sim.agents.map(a => a.body), rng: sim.rng, perception: sim.perception, events: sim.events });
          if (arm === 'original') catchPrefixes.set(clip.id, prefix);
          else {
            if (catchPrefixes.get(clip.id) !== prefix) throw new Error(`Pre-catch state changed: ${clip.id}/${arm}`);
            for (const a of sim.defense) {
              const changed = candidate.defense[a.slot as DefSlot]!;
              Object.assign(a.player.ratings, changed.ratings);
              // Preserve the body's achieved momentum, support deviation, fatigue,
              // acquired information and hold state. Only future capacities change.
              Object.assign(a.profile, derivePhysical(a.player));
            }
          }
          applied = true;
        }
      };
    }
    const result = sim.run();
    if (stage === 'after-catch' && !applied) throw new Error(`Saved catch was not reached: ${clip.id}`);
    const signature = hash({ result: { ...result, frames: undefined, telemetry: undefined },
      bodies: sim.agents.map(a => a.body), rng: sim.rng, perception: sim.perception });
    if (arm === 'original' && signature !== clip.signature) throw new Error(`Native identity failure: ${clip.id}`);
    return { id: clip.id, arm, stage, applied, catchPrefixVerified: stage === 'after-catch', signature,
      originalVerified: arm === 'original', result: { ...result, frames: undefined, telemetry: undefined } };
  }));
  return { summary: { inputSha256: hash(input), source: input.source,
    rows: rows.map(r => ({ id: r.id, arm: r.arm, stage: r.stage, originalVerified: r.originalVerified,
      catchPrefixVerified: r.catchPrefixVerified, outcome: r.result.outcome,
      yac: r.result.stats.yac, missed: r.result.stats.missedTackles, broken: r.result.stats.brokenTackles })) }, raw: { input, rows } };
}

function quality(opts: Options) {
  const players: Array<{ position: Position; quality: number; seed: string; player: Player }> = [];
  for (const position of ALL_POSITIONS) for (let i = 0; i < opts.teams; i++) for (const q of [.35, .65, .9]) {
    const seed = `${opts.seed}:quality:${position}:${i}`;
    players.push({ position, quality: q, seed, player: generatePlayer(new Rng(seed), position, { quality: q, age: 26, id: `${position}-${i}` }) });
  }
  const byPosition = Object.fromEntries(Object.entries(grouped(players, r => `${r.position}/${r.quality}`))
    .map(([k, rs]) => [k, metrics(rs.map(r => r.player))]));
  const paired = Object.fromEntries(ALL_POSITIONS.map(pos => {
    const lo = players.filter(p => p.position === pos && p.quality === .35);
    const hi = players.filter(p => p.position === pos && p.quality === .9);
    const l = lo.map(p => capabilities(p.player)), h = hi.map(p => capabilities(p.player));
    return [pos, Object.fromEntries(Object.keys(l[0]).map(k => [k, distribution(l.map((v, i) => h[i][k] - v[k]))]))];
  }));
  return { summary: { players: players.length, method: 'Same RNG, age, archetype draw and identity at each quality; no lineup selection.', byPosition, paired }, raw: { players } };
}

async function main() {
  const args = process.argv.slice(2), mode = args.shift();
  const opts: Options = { out: 'out/roster-audit', seed: 90210, teams: 64, pairs: 12, reps: 8 };
  let plan = false;
  const supplied = new Set<string>();
  while (args.length) {
    const key = args.shift()!.replace(/^--/, '');
    if (key === 'plan') { plan = true; continue; }
    if (key === 'candidate') { opts.candidate = true; continue; }
    const value = args.shift(); supplied.add(key);
    if (!['out', 'seed', 'teams', 'pairs', 'reps', 'input', 'checkpoint'].includes(key) || !value) throw new Error(`Unknown or incomplete option ${key}`);
    if (['out', 'input', 'checkpoint'].includes(key)) Reflect.set(opts, key, value);
    else { const n = Number(value); if (!Number.isSafeInteger(n) || n < 0 || (key !== 'seed' && !n)) throw new Error(`Invalid ${key}`); Reflect.set(opts, key, n); }
  }
  const runners = { profiles, encounters, contexts, games, native, quality };
  if (!mode || !(mode in runners)) throw new Error('Mode must be profiles, encounters, contexts, games, native or quality');
  if (opts.candidate && !['profiles', 'quality'].includes(mode)) throw new Error('--candidate is for cheap profiles/quality; use roster-screen for candidate snaps');
  const budget = auditBudget(mode, opts);
  if (plan) { console.log(JSON.stringify({ mode, options: opts, budget, simulations: 0 }, null, 2)); return; }
  if (['encounters', 'contexts', 'games'].includes(mode) && (!supplied.has('pairs') || !supplied.has('reps')))
    throw new Error('Specify --pairs and --reps; use --plan to inspect cost without simulation');
  if ((budget.snaps > 32 || budget.games > 0 || mode === 'native') && !opts.checkpoint?.trim())
    throw new Error('Broad audit requires --checkpoint "reason"; use the bounded roster-screen for candidate screening');
  const source = sourceVersion(), baseline = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
  if (process.versions.node !== baseline.nodeVersion || (source !== baseline.sourceSha256 && !opts.candidate))
    throw new Error('Use pinned Node and runtime via scripts/baseline.mjs');
  for (const [k, v] of Object.entries(baseline.flags)) if ((process.env[k] ?? null) !== v)
    throw new Error(`Flag mismatch: ${k}; run through scripts/baseline.mjs`);
  const start = performance.now(), output = runners[mode as keyof typeof runners](opts);
  if (source !== sourceVersion()) throw new Error('Source changed during audit');
  const metadata = { mode, options: opts, commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    source, node: process.version, flags: baseline.flags, collectorSha256: createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex'),
    elapsedSeconds: (performance.now() - start) / 1000, rawSha256: hash(output.raw) };
  mkdirSync(opts.out, { recursive: true });
  writeFileSync(join(opts.out, `${mode}.raw.json.gz`), gzipSync(JSON.stringify({ metadata, ...output.raw })));
  writeFileSync(join(opts.out, `${mode}.json`), JSON.stringify({ metadata, ...output.summary }, null, 2) + '\n');
  console.log(`Wrote ${mode}: ${metadata.elapsedSeconds.toFixed(1)}s, raw ${metadata.rawSha256}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error); process.exitCode = 1; });
