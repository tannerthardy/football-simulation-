/**
 * Error budget: which part of the simulation's play outcomes accounts for how
 * much of the scoring gap to the NFL?
 *
 * A drive model plays drives from outcome tables by game state (down,
 * distance bucket, field zone): the play mix (pass share), run outcomes, and
 * dropback outcomes split into sack rate, scramble rate, interception rate,
 * completion rate and yards per completion. Each component comes from either
 * the NFL table (scripts/data/bdb2025_outcomes.py) or the simulation's table
 * (collected from full games), so the gap in points per drive can be split
 * among components with Shapley values (interactions shared fairly). The
 * fourth-down/field-goal rule and drive start are fixed and identical for
 * every variant, so this isolates offensive execution and play mix — not
 * special teams, penalties or clock.
 *
 *   npx tsx scripts/error-budget.ts collect <games> <seed> <leagues> <sim.json>
 *   npx tsx scripts/error-budget.ts budget <nfl.json> <sim.json> [drives]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam, type Team } from '../src/league/team.js';

type Kind = 'run' | 'sack' | 'int' | 'inc' | 'comp' | 'scramble';
interface Cell { n: number; kinds: Partial<Record<Kind, number>>; yards: Partial<Record<Kind, Record<string, number>>>; fumbleLost: Partial<Record<Kind, number>> }
interface Table { source: string; policy: Record<string, { pass: number; plays: number }>; cells: Record<string, Cell> }

const distBucket = (d: number) => (d <= 2 ? '1-2' : d <= 6 ? '3-6' : d <= 10 ? '7-10' : '11+');
const zoneOf = (own: number) => (own < 20 ? 'own' : own < 80 ? 'mid' : own < 95 ? 'rz' : 'goal');

// ------------------------------------------------------------ collect

function collect(games: number, seed: number, leagues: number, outPath: string): void {
  const rng = new Rng(seed);
  const names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];
  const t: Table = { source: `simulation: ${games} games, ${leagues} leagues, seed ${seed}`, policy: {}, cells: {} };
  const per = Math.ceil(games / leagues);
  let teams: Team[] = [];
  for (let g = 0; g < games; g++) {
    if (g % per === 0) {
      const lr = rng.fork(`league-${g / per}`);
      teams = names.map((n) => {
        const tr = lr.fork(n);
        return generateTeam(tr, n, n.slice(0, 3).toUpperCase(), { strength: tr.range(0.35, 0.75) });
      });
    }
    const i = rng.int(0, 7);
    let j = rng.int(0, 6);
    if (j >= i) j++;
    const res = simulateGame(teams[i], teams[j], { seed: rng.nextU32() });
    for (const p of res.log) {
      if ((p.kind !== 'run' && p.kind !== 'pass') || p.nullified || !p.stats) continue;
      const st = p.stats;
      const state = `${p.down}|${distBucket(p.distance)}|${zoneOf(p.yardline)}`;
      const pol = (t.policy[state] ??= { pass: 0, plays: 0 });
      pol.plays++;
      if (p.kind === 'pass') pol.pass++;
      let kind: Kind;
      if (p.kind === 'run') kind = 'run';
      else if (st.sacked) kind = 'sack';
      else if (st.scramble) kind = 'scramble';
      else if (st.interceptedBy) kind = 'int';
      else if (st.completed) kind = 'comp';
      else kind = p.yards < 0 ? 'sack' : 'inc';
      const key = `${p.kind === 'run' ? 'run' : 'pass'}|${state}`;
      const c = (t.cells[key] ??= { n: 0, kinds: {}, yards: {}, fumbleLost: {} });
      c.n++;
      c.kinds[kind] = (c.kinds[kind] ?? 0) + 1;
      const y = String(Math.round(p.yards));
      const yk = (c.yards[kind] ??= {});
      yk[y] = (yk[y] ?? 0) + 1;
      if (st.fumbleLost && st.fumbledBy) c.fumbleLost[kind] = (c.fumbleLost[kind] ?? 0) + 1;
    }
  }
  writeFileSync(outPath, JSON.stringify(t));
  const n = Object.values(t.cells).reduce((s, c) => s + c.n, 0);
  console.log(`${n} plays in ${Object.keys(t.cells).length} cells -> ${outPath}`);
}

// ------------------------------------------------------------ model

/** Distributions for one source, with fallback to coarser states when a cell is sparse. */
class Source {
  private readonly cache = new Map<string, Cell>();
  constructor(private readonly t: Table) {}

  private merged(type: string, down: string, dist: string, zone: string): Cell {
    const key = `${type}|${down}|${dist}|${zone}`;
    let c = this.cache.get(key);
    if (c) return c;
    c = { n: 0, kinds: {}, yards: {}, fumbleLost: {} };
    for (const [k, v] of Object.entries(this.t.cells)) {
      const [ty, d, ds, z] = k.split('|');
      if (ty !== type || (down !== '*' && d !== down) || (dist !== '*' && ds !== dist) || (zone !== '*' && z !== zone)) continue;
      c.n += v.n;
      for (const [kk, n] of Object.entries(v.kinds)) c.kinds[kk as Kind] = (c.kinds[kk as Kind] ?? 0) + (n ?? 0);
      for (const [kk, n] of Object.entries(v.fumbleLost)) c.fumbleLost[kk as Kind] = (c.fumbleLost[kk as Kind] ?? 0) + (n ?? 0);
      for (const [kk, h] of Object.entries(v.yards)) {
        const dst = (c.yards[kk as Kind] ??= {});
        for (const [y, n] of Object.entries(h ?? {})) dst[y] = (dst[y] ?? 0) + n;
      }
    }
    this.cache.set(key, c);
    return c;
  }

  /** The finest cell with at least `min` plays (of `kind`, if given). */
  cell(type: string, down: number, dist: string, zone: string, kind?: Kind, min = 40): Cell {
    const d = String(Math.min(down, 4));
    const tries: Array<[string, string, string]> = [[d, dist, zone], [d, dist, '*'], ['*', dist, zone], ['*', dist, '*'], ['*', '*', zone], ['*', '*', '*']];
    for (const [a, b, z] of tries) {
      const c = this.merged(type, a, b, z);
      if ((kind ? (c.kinds[kind] ?? 0) : c.n) >= min) return c;
    }
    return this.merged(type, '*', '*', '*');
  }

  passShare(down: number, dist: string, zone: string): number {
    const k = `${Math.min(down, 4)}|${dist}|${zone}`;
    const p = this.t.policy[k];
    if (p && p.plays >= 40) return p.pass / p.plays;
    let pass = 0;
    let plays = 0;
    for (const [kk, v] of Object.entries(this.t.policy)) {
      const [d, ds] = kk.split('|');
      if (d === String(Math.min(down, 4)) && ds === dist) {
        pass += v.pass;
        plays += v.plays;
      }
    }
    return plays ? pass / plays : 0.58;
  }
}

function sampleHist(h: Record<string, number> | undefined, u: number): number {
  if (!h) return 0;
  let total = 0;
  for (const n of Object.values(h)) total += n;
  let r = u * total;
  for (const [y, n] of Object.entries(h)) {
    r -= n;
    if (r <= 0) return Number(y);
  }
  return 0;
}

const COMPONENTS = ['policy', 'run', 'sack', 'scramble', 'int', 'completion', 'compYards'] as const;
type Component = (typeof COMPONENTS)[number];

const FG = [[20, 0.99], [30, 0.96], [40, 0.89], [50, 0.75], [55, 0.62], [60, 0.4], [70, 0]] as const;
function fgProb(d: number): number {
  for (let i = 1; i < FG.length; i++) if (d <= FG[i][0]) {
    const [d0, p0] = FG[i - 1];
    const [d1, p1] = FG[i];
    return p0 + ((p1 - p0) * (d - d0)) / (d1 - d0);
  }
  return 0;
}

interface DriveStats { points: number; td: number; fg: number; turnover: number; plays: number; yards: number }

/** Play `drives` drives with each component from `sim` if in `useSim`, else from `nfl`. */
function playDrives(nfl: Source, sim: Source, useSim: Set<Component>, drives: number, seed: number): DriveStats {
  const src = (c: Component) => (useSim.has(c) ? sim : nfl);
  const rng = new Rng(seed);
  const s: DriveStats = { points: 0, td: 0, fg: 0, turnover: 0, plays: 0, yards: 0 };
  for (let k = 0; k < drives; k++) {
    // Common random numbers: each drive's draws come from its own stream.
    const r = rng.fork(k);
    let y = 25;
    let down = 1;
    let dist = 10;
    for (let guard = 0; guard < 40; guard++) {
      const db = distBucket(dist);
      const z = zoneOf(y);
      if (down === 4) {
        const go = (dist <= 1 && y >= 35) || (dist <= 2 && y >= 60) || (dist <= 3 && y >= 92);
        if (!go) {
          const fgDist = 100 - y + 17;
          if (fgDist <= 57) {
            if (r.next() < fgProb(fgDist)) {
              s.points += 3;
              s.fg++;
            } else r.next();
          } else r.next();
          break;
        }
      }
      const u = [r.next(), r.next(), r.next(), r.next()];
      const pass = u[0] < src('policy').passShare(down, db, z);
      let yds: number;
      let lost: boolean;
      if (!pass) {
        const c = src('run').cell('run', down, db, z);
        yds = sampleHist(c.yards.run, u[1]);
        lost = u[2] < (c.fumbleLost.run ?? 0) / Math.max(1, c.kinds.run ?? 0);
      } else {
        const rate = (c: Cell, kind: Kind) => (c.kinds[kind] ?? 0) / Math.max(1, c.n);
        const sackC = src('sack').cell('pass', down, db, z);
        const scrC = src('scramble').cell('pass', down, db, z);
        const pSack = rate(sackC, 'sack');
        const pScr = rate(scrC, 'scramble');
        // Among throws: interception and completion rates from their sources.
        const thrown = (c: Cell) => (c.kinds.int ?? 0) + (c.kinds.inc ?? 0) + (c.kinds.comp ?? 0);
        const intC = src('int').cell('pass', down, db, z);
        const cmpC = src('completion').cell('pass', down, db, z);
        const pInt = (intC.kinds.int ?? 0) / Math.max(1, thrown(intC));
        const pComp = (cmpC.kinds.comp ?? 0) / Math.max(1, thrown(cmpC));
        const v = u[1];
        if (v < pSack) {
          yds = sampleHist(sackC.yards.sack, u[2]);
          lost = u[3] < (sackC.fumbleLost.sack ?? 0) / Math.max(1, sackC.kinds.sack ?? 0);
        } else if (v < pSack + pScr) {
          yds = sampleHist(scrC.yards.scramble, u[2]);
          lost = false;
        } else {
          const w = (v - pSack - pScr) / Math.max(1e-9, 1 - pSack - pScr);
          if (w < pInt) {
            yds = 0;
            lost = true;
          } else if (w < pInt + pComp) {
            const yc = src('compYards').cell('pass', down, db, z, 'comp');
            yds = sampleHist(yc.yards.comp, u[2]);
            lost = u[3] < (yc.fumbleLost.comp ?? 0) / Math.max(1, yc.kinds.comp ?? 0);
          } else {
            yds = 0;
            lost = false;
          }
        }
      }
      s.plays++;
      if (lost) {
        s.turnover++;
        break;
      }
      yds = Math.min(yds, 100 - y);
      s.yards += yds;
      y += yds;
      if (y >= 100) {
        s.points += 6.95;
        s.td++;
        break;
      }
      if (y <= 0) {
        s.points -= 2;
        break;
      }
      if (yds >= dist) {
        down = 1;
        dist = Math.min(10, 100 - y);
      } else {
        down++;
        dist -= yds;
        if (down > 4) break;
      }
    }
  }
  return s;
}

function budget(nflPath: string, simPath: string, drives: number): void {
  const nfl = new Source(JSON.parse(readFileSync(nflPath, 'utf8')) as Table);
  const sim = new Source(JSON.parse(readFileSync(simPath, 'utf8')) as Table);
  const n = COMPONENTS.length;
  const value = new Map<number, number>();
  const stats = new Map<number, DriveStats>();
  for (let mask = 0; mask < 1 << n; mask++) {
    const set = new Set<Component>(COMPONENTS.filter((_, i) => mask & (1 << i)));
    const st = playDrives(nfl, sim, set, drives, 11);
    stats.set(mask, st);
    value.set(mask, st.points / drives);
  }
  const fact = (k: number): number => (k <= 1 ? 1 : k * fact(k - 1));
  const per = (st: DriveStats) => ({ pts: (st.points / drives).toFixed(2), td: ((100 * st.td) / drives).toFixed(1), to: ((100 * st.turnover) / drives).toFixed(1), plays: (st.plays / drives).toFixed(1), ypp: (st.yards / st.plays).toFixed(2) });
  const all = (1 << n) - 1;
  console.log(`${drives} drives per variant from the own 25; NFL table vs simulation table`);
  console.log('all NFL      ', per(stats.get(0)!));
  console.log('all sim      ', per(stats.get(all)!));
  const gap = value.get(all)! - value.get(0)!;
  console.log(`gap ${gap >= 0 ? '+' : ''}${gap.toFixed(2)} points/drive. Shapley share by component (and one-at-a-time swaps):`);
  const rows: Array<[string, number, number, number]> = [];
  for (let i = 0; i < n; i++) {
    let phi = 0;
    for (let mask = 0; mask <= all; mask++) {
      if (mask & (1 << i)) continue;
      const k = popcount(mask);
      phi += ((fact(k) * fact(n - k - 1)) / fact(n)) * (value.get(mask | (1 << i))! - value.get(mask)!);
    }
    const onlyThis = value.get(1 << i)! - value.get(0)!;
    const fixThis = value.get(all)! - value.get(all & ~(1 << i))!;
    rows.push([COMPONENTS[i], phi, onlyThis, fixThis]);
  }
  rows.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  console.log('component'.padEnd(12) + 'shapley'.padStart(9) + '  NFL+this sim'.padStart(15) + '  sim, fix this'.padStart(16));
  for (const [c, phi, only, fix] of rows) console.log(`${c.padEnd(12)}${phi.toFixed(3).padStart(9)}${only.toFixed(3).padStart(15)}${(-fix).toFixed(3).padStart(16)}`);
}

function popcount(x: number): number {
  let c = 0;
  while (x) {
    c += x & 1;
    x >>= 1;
  }
  return c;
}

// ------------------------------------------------------------ drives

/**
 * Drive-level comparison with scripts/data/bdb2025_drives.py: drives per
 * team-game, plays per drive, average start, points per drive (offense score
 * change from the drive's first snap to the next drive's), by start zone.
 */
function drives(games: number, seed: number, leagues: number): void {
  const rng = new Rng(seed);
  const names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];
  const per = Math.ceil(games / leagues);
  let teams: Team[] = [];
  interface Drive { start: number; plays: number; points: number; end: string }
  const all: Drive[] = [];
  let nonOffense = 0;
  let totalPoints = 0;
  for (let g = 0; g < games; g++) {
    if (g % per === 0) {
      const lr = rng.fork(`league-${g / per}`);
      teams = names.map((n) => {
        const tr = lr.fork(n);
        return generateTeam(tr, n, n.slice(0, 3).toUpperCase(), { strength: tr.range(0.35, 0.75) });
      });
    }
    const i = rng.int(0, 7);
    let j = rng.int(0, 6);
    if (j >= i) j++;
    const res = simulateGame(teams[i], teams[j], { seed: rng.nextU32() });
    totalPoints += res.score.home + res.score.away;
    const side = (abbr: string) => (abbr === res.home.abbr ? 'home' : 'away');
    let cur: (Drive & { team: string; half: number; score0: number }) | null = null;
    const close = (endScore: { home: number; away: number }, how: string) => {
      if (!cur) return;
      cur.points = Math.max(0, endScore[side(cur.team)] - cur.score0);
      cur.end = how;
      all.push(cur);
    };
    let lastKind = '';
    for (const p of res.log) {
      if (p.kind === 'run' || p.kind === 'pass' || p.kind === 'kneel') {
        const half = p.quarter <= 2 ? 1 : p.quarter <= 4 ? 2 : 3;
        if (!cur || cur.team !== p.offense || cur.half !== half) {
          close(p.score, lastKind);
          cur = { team: p.offense, half, start: p.yardline, plays: 0, points: 0, end: '', score0: p.score[side(p.offense)] };
        }
        cur.plays++;
      }
      lastKind = p.kind;
    }
    close(res.score, lastKind);
  }
  const offensePoints = all.reduce((s, d) => s + d.points, 0);
  nonOffense = totalPoints - offensePoints;
  const tg = games * 2;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const zones: Array<[string, (s: number) => boolean]> = [['inside 20', (s) => s < 20], ['20-39', (s) => s >= 20 && s < 40], ['40-59', (s) => s >= 40 && s < 60], ['60+', (s) => s >= 60]];
  console.log(`${games} games: drives/team-game ${(all.length / tg).toFixed(2)}, plays/drive ${mean(all.map((d) => d.plays)).toFixed(2)}, avg start ${mean(all.map((d) => d.start)).toFixed(1)}, points/drive ${mean(all.map((d) => d.points)).toFixed(2)}, offense points/team-game ${(offensePoints / tg).toFixed(2)}, other points/team-game ${(nonOffense / tg).toFixed(2)}`);
  for (const [k, f] of zones) {
    const ds = all.filter((d) => f(d.start));
    console.log(`  start ${k.padEnd(10)} share ${((100 * ds.length) / all.length).toFixed(1)}%  points/drive ${mean(ds.map((d) => d.points)).toFixed(2)}`);
  }
  const ends = new Map<string, number>();
  for (const d of all) ends.set(d.end, (ends.get(d.end) ?? 0) + 1);
  console.log('  drive ended with:', [...ends.entries()].map(([k, v]) => `${k || 'end'} ${((100 * v) / all.length).toFixed(1)}%`).join(', '));
}

const [mode, ...args] = process.argv.slice(2);
if (mode === 'drives') drives(Number(args[0] ?? 32), Number(args[1] ?? 7), Number(args[2] ?? 4));
else if (mode === 'collect') collect(Number(args[0] ?? 32), Number(args[1] ?? 7), Number(args[2] ?? 4), args[3] ?? 'out/budget/sim-outcomes.json');
else if (mode === 'budget') budget(args[0], args[1], Number(args[2] ?? 20000));
else console.log('usage: error-budget.ts collect <games> <seed> <leagues> <out> | budget <nfl.json> <sim.json> [drives]');
