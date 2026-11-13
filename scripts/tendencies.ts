/**
 * The simulation's play-calling tendencies, measured the same way as the NFL
 * extractor (scripts/data/bdb2025_tendencies.py): personnel usage and pass
 * rate by personnel, defensive personnel against each offensive group, run
 * concept shares and concentration by team, whether teams call more of what
 * works for them, play-action and single-high rates by team, and runs by
 * situation.
 *   npx tsx scripts/tendencies.ts [games] [seed] [leagues]
 */
import { Rng } from '../src/core/rng.js';
import { simulateGame, type PlayLog } from '../src/game/game.js';
import { generateTeam, type Team } from '../src/league/team.js';

const [gamesStr = '32', seedStr = '7', leaguesStr] = process.argv.slice(2);
const games = Number(gamesStr);
const leagues = Math.max(1, Number(leaguesStr ?? Math.ceil(games / 8)));
const rng = new Rng(Number(seedStr));
const names = ['Ironmen', 'Comets', 'Wolves', 'Rangers', 'Pilots', 'Barons', 'Hornets', 'Mariners'];

interface Row { team: string; defteam: string; pers: string; defpers: string; pass: boolean; concept: string | null; yds: number; pa: boolean; shell: string; down: number; ytg: number; sack: boolean }
const rows: Row[] = [];
const perLeague = Math.ceil(games / leagues);
let teams: Team[] = [];
for (let g = 0; g < games; g++) {
  if (g % perLeague === 0) {
    const lr = rng.fork(`league-${g / perLeague}`);
    // League-qualified abbreviations keep teams from different leagues apart.
    teams = names.map((n) => {
      const tr = lr.fork(n);
      return generateTeam(tr, n, `${n.slice(0, 3).toUpperCase()}${g / perLeague}`, { strength: tr.range(0.35, 0.75) });
    });
  }
  const i = rng.int(0, 7);
  let j = rng.int(0, 6);
  if (j >= i) j++;
  const res = simulateGame(teams[i], teams[j], { seed: rng.nextU32() });
  for (const p of res.log as PlayLog[]) {
    if ((p.kind !== 'run' && p.kind !== 'pass') || p.nullified || !p.plan) continue;
    const def = p.offense === res.home.abbr ? res.away.abbr : res.home.abbr;
    const toGo = 100 - p.yardline;
    rows.push({
      team: p.offense,
      defteam: def,
      pers: p.plan.personnel,
      defpers: p.plan.defPersonnel === 'nickel' ? 'nickel' : p.plan.defPersonnel === 'dime' ? 'dime+' : 'base',
      pass: p.kind === 'pass',
      concept: p.kind === 'run' && !p.stats?.scramble ? p.plan.concept : null,
      yds: p.yards,
      pa: p.plan.playAction,
      shell: p.plan.shell,
      down: p.down,
      ytg: Math.min(p.distance, toGo),
      sack: !!p.stats?.sacked,
    });
  }
}

const pct = (n: number, d: number) => Math.round((1000 * n) / Math.max(1, d)) / 10;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};
const count = <T>(xs: T[]) => {
  const m = new Map<T, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
};
const teamIds = [...new Set(rows.map((r) => r.team))];
const out: Record<string, unknown> = { source: `simulation, ${games} games over ${leagues} leagues`, plays: rows.length };

// Offensive personnel.
const pc = count(rows.map((r) => r.pers));
const groups = [...pc.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
const teamPers = new Map(teamIds.map((t) => {
  const tr = rows.filter((r) => r.team === t);
  const c = count(tr.map((r) => r.pers));
  return [t, Object.fromEntries(groups.map((g) => [g, pct(c.get(g) ?? 0, tr.length)]))] as const;
}));
out.offensePersonnel = {
  league: Object.fromEntries(groups.map((g) => [g, pct(pc.get(g)!, rows.length)])),
  passRate: Object.fromEntries(groups.map((g) => [g, pct(rows.filter((r) => r.pers === g && r.pass).length, pc.get(g)!)])),
  teamRange: Object.fromEntries(groups.map((g) => {
    const v = [...teamPers.values()].map((x) => x[g]);
    return [g, { min: Math.min(...v), max: Math.max(...v), sd: Math.round(sd(v) * 10) / 10 }];
  })),
};

// Defensive personnel against each offensive group.
const dp: Record<string, unknown> = {};
for (const op of ['11', '12', '21']) {
  const sub = rows.filter((r) => r.pers === op);
  const byTeam = teamIds.map((t) => sub.filter((r) => r.defteam === t)).filter((x) => x.length >= 15);
  const base = byTeam.map((x) => pct(x.filter((r) => r.defpers === 'base').length, x.length));
  dp[op] = {
    league: { base: pct(sub.filter((r) => r.defpers === 'base').length, sub.length), nickel: pct(sub.filter((r) => r.defpers === 'nickel').length, sub.length), 'dime+': pct(sub.filter((r) => r.defpers === 'dime+').length, sub.length) },
    baseTeamRange: { min: Math.min(...base), max: Math.max(...base), sd: Math.round(sd(base) * 10) / 10 },
  };
}
out.defensePersonnelVs = dp;

// Run concepts.
const runs = rows.filter((r) => r.concept);
const cc = count(runs.map((r) => r.concept!));
const concepts = [...cc.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
const share = new Map(teamIds.map((t) => {
  const tr = runs.filter((r) => r.team === t);
  const c = count(tr.map((r) => r.concept!));
  return [t, { n: tr.length, s: Object.fromEntries(concepts.map((k) => [k, (c.get(k) ?? 0) / Math.max(1, tr.length)])) }] as const;
}));
out.runConcepts = {
  league: Object.fromEntries(concepts.map((k) => [k, pct(cc.get(k)!, runs.length)])),
  teamRange: Object.fromEntries(concepts.map((k) => {
    const v = [...share.values()].filter((x) => x.n >= 20).map((x) => 100 * x.s[k]);
    return [k, { min: Math.round(Math.min(...v) * 10) / 10, max: Math.round(Math.max(...v) * 10) / 10 }];
  })),
  topConceptShareMedian: (() => {
    const v = [...share.values()].filter((x) => x.n >= 20).map((x) => 100 * Math.max(...Object.values(x.s))).sort((a, b) => a - b);
    return Math.round(v[Math.floor(v.length / 2)] * 10) / 10;
  })(),
};

// Selection: usage vs. a concept's yards relative to the team's other runs.
const xs: number[] = [];
const ys: number[] = [];
const ws: number[] = [];
for (const t of teamIds) {
  const tr = runs.filter((r) => r.team === t);
  for (const k of concepts) {
    const on = tr.filter((r) => r.concept === k);
    const offR = tr.filter((r) => r.concept !== k);
    if (on.length < 8 || offR.length < 20) continue;
    xs.push(on.length / tr.length / (cc.get(k)! / runs.length));
    ys.push(mean(on.map((r) => r.yds)) - mean(offR.map((r) => r.yds)));
    ws.push(on.length);
  }
}
const wcorr = (x: number[], y: number[], w: number[]) => {
  const sw = w.reduce((a, b) => a + b, 0);
  const mx = x.reduce((a, v, i) => a + v * w[i], 0) / sw;
  const my = y.reduce((a, v, i) => a + v * w[i], 0) / sw;
  let c = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < x.length; i++) {
    c += w[i] * (x[i] - mx) * (y[i] - my);
    vx += w[i] * (x[i] - mx) ** 2;
    vy += w[i] * (y[i] - my) ** 2;
  }
  return Math.round((c / Math.sqrt(vx * vy)) * 100) / 100;
};
out.runConceptSelection = { teamConceptCells: xs.length, corrRelUsageVsRelYards: wcorr(xs, ys, ws) };

// Play action and coverage shell by team.
const paRates = teamIds.map((t) => {
  const tp = rows.filter((r) => r.team === t && r.pass);
  return pct(tp.filter((r) => r.pa).length, tp.length);
});
const singleHigh = teamIds.map((t) => {
  const tp = rows.filter((r) => r.defteam === t && r.pass && r.shell !== 'zero');
  return pct(tp.filter((r) => r.shell === 'one-high').length, tp.length);
});
out.playAction = { min: Math.min(...paRates), max: Math.max(...paRates), median: [...paRates].sort((a, b) => a - b)[Math.floor(paRates.length / 2)] };
out.singleHigh = { min: Math.min(...singleHigh), max: Math.max(...singleHigh), sd: Math.round(sd(singleHigh) * 10) / 10 };

// Outcomes by run concept, and the sim's stuff rate and yards per carry
// reweighted to the NFL's concept mix (2022; duo ≈ PFF "man", toss ≈ outside
// zone): how much of the gap is which concepts get called.
const NFL_MIX: Record<string, number> = { outsideZone: 28.7, insideZone: 24.0, duo: 16.9, power: 9.4, counter: 6.6, draw: 3.3, trap: 1.9 };
const byConcept = Object.fromEntries(concepts.map((k) => {
  const s = runs.filter((r) => r.concept === k);
  return [k, { carries: s.length, ypc: Math.round(mean(s.map((r) => r.yds)) * 100) / 100, stuff: pct(s.filter((r) => r.yds <= 0).length, s.length) }];
}));
out.runConceptOutcomes = byConcept;
{
  let w = 0;
  let stuff = 0;
  let ypc = 0;
  for (const [k, m] of Object.entries(NFL_MIX)) {
    const key = k === 'outsideZone' ? ['outsideZone', 'wideZone', 'toss'] : k === 'insideZone' ? ['insideZone','splitZone'] : [k];
    const s = runs.filter((r) => key.includes(r.concept!));
    if (!s.length) continue;
    w += m;
    stuff += m * (s.filter((r) => r.yds <= 0).length / s.length);
    ypc += m * mean(s.map((r) => r.yds));
  }
  out.nflMixAdjusted = { use:'Approximate concept-mix sensitivity, not validation: MAN-to-Duo is unverified; outsideZone pools wideZone/toss and insideZone pools splitZone.', stuff: pct(stuff, w), ypc: Math.round((ypc / w) * 100) / 100, raw: { stuff: pct(runs.filter((r) => r.yds <= 0).length, runs.length), ypc: Math.round(mean(runs.map((r) => r.yds)) * 100) / 100 } };
}

// Team-to-team spread of outcomes (offense), sampling noise included.
/** Team SD of a per-play mean, observed and with sampling noise removed. */
const spread = (select: (r: Row) => boolean, value: (r: Row) => number) => {
  const means: number[] = [];
  const noise: number[] = [];
  for (const t of teamIds) {
    const v = rows.filter((r) => r.team === t && select(r)).map(value);
    if (v.length < 2) continue;
    means.push(mean(v));
    noise.push(sd(v) ** 2 / v.length);
  }
  const obs = sd(means) ** 2;
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  return { sd: r3(Math.sqrt(obs)), sdTrue: r3(Math.sqrt(Math.max(0, obs - mean(noise)))), min: r3(Math.min(...means)), max: r3(Math.max(...means)) };
};
out.teamSpread = {
  ypc: spread((r) => !!r.concept, (r) => r.yds),
  stuffPct: spread((r) => !!r.concept, (r) => 100 * Number(r.yds <= 0)),
  sackPct: spread((r) => r.pass, (r) => 100 * Number(r.sack)),
  passRatePct: spread(() => true, (r) => 100 * Number(r.pass)),
  carriesPerTeam: Math.round(runs.length / teamIds.length),
};

// Runs by situation.
const sit = (f: (r: Row) => boolean) => {
  const s = runs.filter(f);
  return { carries: s.length, ypc: Math.round(mean(s.map((r) => r.yds)) * 100) / 100, stuff: pct(s.filter((r) => r.yds <= 0).length, s.length) };
};
out.runsBySituation = {
  '1st & 10': sit((r) => r.down === 1 && r.ytg === 10),
  '2nd/3rd & 1-2': sit((r) => (r.down === 2 || r.down === 3) && r.ytg <= 2),
  '3rd & 7+': sit((r) => r.down === 3 && r.ytg >= 7),
};

for (const [k, v] of Object.entries(out)) console.log(k, JSON.stringify(v));
