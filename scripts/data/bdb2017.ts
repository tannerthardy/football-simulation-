/**
 * Distil the public 2019 Big Data Bowl release (2017 season, weeks 1–6) into
 * the calibration targets this engine needs.
 *
 *   git clone --depth 1 https://github.com/nfl-football-ops/Big-Data-Bowl <dir>
 *   npx tsx scripts/data/bdb2017.ts [<dir>/Data] [data/bdb2017-summary.json]
 *
 * Tracking (one game, all 22 players at 10 Hz): in-game top speed and
 * acceleration by position, time to throw, time to first pressure, pocket
 * depth, separation when the ball arrives, receiver speed at the throw.
 * Plays (all 91 games): completion and air yards by depth, YAC, sacks,
 * scrambles, run outcomes, box counts, pass rushers, and formation /
 * personnel / pass rate by situation (for the play callers).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const dataDir = resolve(process.argv[2] ?? '../nfl-football-ops/big-data-bowl/Data');
const outPath = resolve(process.argv[3] ?? 'data/bdb2017-summary.json');

// ------------------------------------------------------------------ csv

function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const head = rows.shift()!;
  return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const num = (v: string | undefined): number | null => (v === undefined || v === '' || v === 'NA' ? null : Number(v));
const quant = (xs: number[], q: number): number => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))];
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const r2 = (v: number) => Math.round(v * 100) / 100;
const summary = (xs: number[]) => ({ n: xs.length, mean: r2(mean(xs)), p10: r2(quant(xs, 0.1)), p50: r2(quant(xs, 0.5)), p90: r2(quant(xs, 0.9)), max: r2(quant(xs, 1)) });

// ------------------------------------------------------------------ load

const plays = parseCsv(readFileSync(`${dataDir}/plays.csv`, 'utf8'));
const players = parseCsv(readFileSync(`${dataDir}/players.csv`, 'utf8'));
const games = parseCsv(readFileSync(`${dataDir}/games.csv`, 'utf8'));
const posOf = new Map(players.map((p) => [p.nflId, p.PositionAbbr]));
const GROUP: Record<string, string> = {
  QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', T: 'OL', G: 'OL', C: 'OL', OT: 'OL', OG: 'OL',
  DE: 'DL', DT: 'DL', NT: 'DL', OLB: 'LB', ILB: 'LB', MLB: 'LB', LB: 'LB', CB: 'CB', SS: 'S', FS: 'S', S: 'S', DB: 'CB',
};

// ------------------------------------------------------------------ plays (all games)

const isPass = (p: Record<string, string>) => ['C', 'I', 'IN', 'S', 'R'].includes(p.PassResult);
const scrimmage = plays.filter((p) => p.isSTPlay === 'FALSE' && p.down !== '0');
const dropbacks = scrimmage.filter(isPass);
const attempts = dropbacks.filter((p) => ['C', 'I', 'IN'].includes(p.PassResult));
const runs = scrimmage.filter((p) => !isPass(p) && p.PassResult === 'NA' && p.isPenalty === 'FALSE' && !/kneels|spiked|Aborted|FUMBLES/i.test(p.playDescription) && num(p.PlayResult) !== null);

const airBuckets: Record<string, { n: number; c: number }> = {};
for (const p of attempts) {
  const ay = num(p.PassLength);
  if (ay === null) continue;
  const k = ay < 0 ? 'behind' : ay < 10 ? '0-9' : ay < 20 ? '10-19' : '20+';
  const b = (airBuckets[k] ??= { n: 0, c: 0 });
  b.n++;
  if (p.PassResult === 'C') b.c++;
}
const airAll = attempts.map((p) => num(p.PassLength)).filter((v): v is number => v !== null);
const yac = attempts.filter((p) => p.PassResult === 'C').map((p) => num(p.YardsAfterCatch)).filter((v): v is number => v !== null);
const runYds = runs.map((p) => num(p.PlayResult)!);

const passing = {
  dropbacks: dropbacks.length,
  completionPct: r2((100 * attempts.filter((p) => p.PassResult === 'C').length) / attempts.length),
  sackPct: r2((100 * dropbacks.filter((p) => p.PassResult === 'S').length) / dropbacks.length),
  scramblePct: r2((100 * dropbacks.filter((p) => p.PassResult === 'R').length) / dropbacks.length),
  intPct: r2((100 * attempts.filter((p) => p.PassResult === 'IN').length) / attempts.length),
  airYards: summary(airAll),
  byDepth: Object.fromEntries(Object.entries(airBuckets).map(([k, b]) => [k, { share: r2((100 * b.n) / airAll.length), completionPct: r2((100 * b.c) / b.n) }])),
  yac: { ...summary(yac), pct20plus: r2((100 * yac.filter((v) => v >= 20).length) / yac.length) },
};
const running = {
  carries: runs.length,
  ypc: r2(mean(runYds)),
  stuffPct: r2((100 * runYds.filter((v) => v <= 0).length) / runYds.length),
  pct10plus: r2((100 * runYds.filter((v) => v >= 10).length) / runYds.length),
  yards: summary(runYds),
};

const dist = (xs: Array<number | null>) => {
  const out: Record<string, number> = {};
  const v = xs.filter((x): x is number => x !== null);
  for (const x of v) out[x] = (out[x] ?? 0) + 1;
  for (const k of Object.keys(out)) out[k] = r2((100 * out[k]) / v.length);
  return out;
};
const defense = {
  boxOnRuns: dist(runs.map((p) => num(p.defendersInTheBox))),
  boxOnPasses: dist(dropbacks.map((p) => num(p.defendersInTheBox))),
  passRushers: dist(dropbacks.map((p) => num(p.numberOfPassRushers))),
  personnel: dist([]) as Record<string, number>,
};
const defPers: Record<string, number> = {};
for (const p of scrimmage) defPers[p['personnel.defense']] = (defPers[p['personnel.defense']] ?? 0) + 1;
defense.personnel = Object.fromEntries(Object.entries(defPers).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => [k, r2((100 * v) / scrimmage.length)]));

// Situations for play calling.
const sitKey = (p: Record<string, string>) => {
  const d = Number(p.down);
  const togo = Number(p.yardsToGo);
  const dd = d === 1 ? '1st' : d === 2 ? (togo >= 7 ? '2nd-long' : togo >= 3 ? '2nd-medium' : '2nd-short') : d === 3 || d === 4 ? (togo >= 7 ? '3rd-long' : togo >= 3 ? '3rd-medium' : '3rd-short') : 'other';
  return dd;
};
const yardsToGoal = (p: Record<string, string>) => {
  const n = Number(p.yardlineNumber);
  return p.yardlineSide === p.possessionTeam ? 100 - n : n;
};
const bySit: Record<string, { n: number; pass: number; formation: Record<string, number>; personnel: Record<string, number> }> = {};
const tally = (key: string, p: Record<string, string>) => {
  const b = (bySit[key] ??= { n: 0, pass: 0, formation: {}, personnel: {} });
  b.n++;
  if (isPass(p)) b.pass++;
  b.formation[p.offenseFormation] = (b.formation[p.offenseFormation] ?? 0) + 1;
  b.personnel[p['personnel.offense']] = (b.personnel[p['personnel.offense']] ?? 0) + 1;
};
for (const p of [...runs, ...dropbacks]) {
  tally(sitKey(p), p);
  const ytg = yardsToGoal(p);
  if (ytg <= 5) tally('goal-to-go (≤5)', p);
  else if (ytg <= 20) tally('red zone (6–20)', p);
  if (ytg >= 90) tally('backed up (own 10)', p);
}
const top = (m: Record<string, number>, n: number, total: number) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, r2((100 * v) / total)]));
const situations = Object.fromEntries(
  Object.entries(bySit).map(([k, b]) => [k, { plays: b.n, passPct: r2((100 * b.pass) / b.n), formation: top(b.formation, 4, b.n), personnel: top(b.personnel, 4, b.n) }]),
);

// ------------------------------------------------------------------ tracking (one game)

const playById = new Map(plays.map((p) => [`${p.gameId}-${p.playId}`, p]));
const trackingFiles = ['tracking_gameId_2017090700.csv'].filter((f) => {
  try {
    readFileSync(`${dataDir}/${f}`, { flag: 'r' });
    return true;
  } catch {
    return false;
  }
});
interface Row { t: number; x: number; y: number; s: number; event: string; nflId: string; name: string; team: string; frame: number }
const maxSpeed: Record<string, number[]> = {};
const maxAccel: Record<string, number[]> = {};
const ttt: number[] = [];
const pressureT: number[] = [];
let pressuredBeforeThrow = 0;
let pressureDropbacks = 0;
const pocketDepth: number[] = [];
const separation: number[] = [];
const wrSpeedAtThrow: number[] = [];
const dlSpeed05: number[] = [];
const dlDepth10: number[] = [];
const timeToLos: number[] = [];

for (const file of trackingFiles) {
  const rows = parseCsv(readFileSync(`${dataDir}/${file}`, 'utf8'));
  const gameId = rows[0]?.gameId;
  const game = games.find((g) => g.gameId === gameId)!;
  const byPlay = new Map<string, Row[]>();
  for (const r of rows) {
    const k = r.playId;
    let a = byPlay.get(k);
    if (!a) byPlay.set(k, (a = []));
    a.push({ t: 0, x: Number(r.x), y: Number(r.y), s: Number(r.s), event: r.event, nflId: r.nflId, name: r.displayName, team: r.team, frame: Number(r['frame.id']) });
  }
  for (const [playId, prow] of byPlay) {
    const play = playById.get(`${gameId}-${playId}`);
    if (!play || play.isSTPlay !== 'FALSE') continue;
    const offTeam = play.possessionTeam === game.homeTeamAbbr ? 'home' : 'away';
    const frames = new Map<number, Row[]>();
    for (const r of prow) {
      let f = frames.get(r.frame);
      if (!f) frames.set(r.frame, (f = []));
      f.push(r);
    }
    const frameIds = [...frames.keys()].sort((a, b) => a - b);
    const eventFrame = (ev: string) => frameIds.find((f) => frames.get(f)!.some((r) => r.event === ev));
    const snap = eventFrame('ball_snap');
    if (snap === undefined) continue;
    const endF = frameIds[frameIds.length - 1];
    const ball = (f: number) => frames.get(f)!.find((r) => r.team === 'ball');
    const ball0 = ball(snap);
    if (!ball0) continue;
    const offAt0 = frames.get(snap)!.filter((r) => r.team === offTeam);
    const dir = Math.sign(ball0.x - mean(offAt0.map((r) => r.x))) || 1;
    const los = ball0.x;

    // Per-player kinematics after the snap.
    const byPlayer = new Map<string, Row[]>();
    for (const f of frameIds) {
      if (f < snap) continue;
      for (const r of frames.get(f)!) {
        if (r.team === 'ball') continue;
        let a = byPlayer.get(r.nflId);
        if (!a) byPlayer.set(r.nflId, (a = []));
        a.push(r);
      }
    }
    for (const [id, tr] of byPlayer) {
      const g = GROUP[posOf.get(id) ?? ''];
      if (!g || tr.length < 10) continue;
      const vmax = Math.max(...tr.map((r) => r.s));
      if (vmax > 2) {
        (maxSpeed[g] ??= []).push(vmax);
        (maxSpeed[`${g}:${isPass(play) ? 'pass' : 'run'}`] ??= []).push(vmax);
      }
      let amax = 0;
      for (let i = 1; i < tr.length - 1; i++) amax = Math.max(amax, (tr[i + 1].s - tr[i - 1].s) / 0.2);
      if (vmax > 3) (maxAccel[g] ??= []).push(Math.min(amax, 12));
    }

    const at = (f: number) => frames.get(f) ?? [];
    const qbRow = (f: number) => at(f).find((r) => r.team === offTeam && posOf.get(r.nflId) === 'QB');
    const pf = eventFrame('pass_forward');
    const sack = eventFrame('qb_sack');
    if (isPass(play) && play.PassResult !== 'R') {
      const endPocket = pf ?? sack ?? endF;
      if (pf !== undefined) ttt.push((pf - snap) / 10);
      pressureDropbacks++;
      // From 0.5 s: under center, the nose starts within 2 yd of the QB.
      for (let f = snap + 5; f <= endPocket; f++) {
        const qb = qbRow(f);
        if (!qb) continue;
        const near = at(f).some((r) => r.team !== offTeam && r.team !== 'ball' && Math.hypot(r.x - qb.x, r.y - qb.y) < 2);
        if (near) {
          pressureT.push((f - snap) / 10);
          pressuredBeforeThrow++;
          break;
        }
      }
      const f25 = snap + 25;
      if (endPocket > f25) {
        const ol = at(f25).filter((r) => r.team === offTeam && GROUP[posOf.get(r.nflId) ?? ''] === 'OL');
        if (ol.length >= 4) pocketDepth.push(mean(ol.map((r) => (los - r.x) * dir)));
      }
      if (pf !== undefined) {
        for (const r of at(pf)) if (r.team === offTeam && GROUP[posOf.get(r.nflId) ?? ''] === 'WR') wrSpeedAtThrow.push(r.s);
        // Target from the play description, separation when the ball arrives.
        const m = play.playDescription.match(/pass (?:short|deep) (?:left|middle|right) to ([A-Z][a-z]*\.? ?[A-Za-z'.-]+)/);
        const arr = eventFrame('pass_arrived');
        if (m && arr !== undefined) {
          const last = m[1].split('.').pop()!.trim();
          const tgt = at(arr).find((r) => r.team === offTeam && r.name.split(' ').slice(-1)[0] === last);
          if (tgt) {
            const sep = Math.min(...at(arr).filter((r) => r.team !== offTeam && r.team !== 'ball').map((r) => Math.hypot(r.x - tgt.x, r.y - tgt.y)));
            if (Number.isFinite(sep)) separation.push(sep);
          }
        }
      }
      for (const r of at(snap + 5)) if (r.team !== offTeam && GROUP[posOf.get(r.nflId) ?? ''] === 'DL') dlSpeed05.push(r.s);
      for (const r of at(snap + 10)) if (r.team !== offTeam && GROUP[posOf.get(r.nflId) ?? ''] === 'DL') dlDepth10.push((los - r.x) * dir);
    }
    // Runs: time for the ball carrier to reach the line.
    const ho = eventFrame('handoff');
    if (ho !== undefined && !isPass(play)) {
      const b = ball(ho);
      const carrier = b ? at(ho).filter((r) => r.team === offTeam).sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0] : null;
      if (carrier) {
        for (let f = ho; f <= endF; f++) {
          const c = at(f).find((r) => r.nflId === carrier.nflId);
          if (c && (c.x - los) * dir >= 0) {
            timeToLos.push((f - snap) / 10);
            break;
          }
        }
      }
    }
  }
}

const mph = (v: number) => r2((v * 3600) / 1760);
const tracking = {
  games: trackingFiles.length,
  note: 'Speeds in yd/s (mph alongside). Per-play maxima for players who moved; accelerations from 0.2 s central differences.',
  maxSpeedPerPlay: Object.fromEntries(Object.entries(maxSpeed).map(([g, v]) => [g, { ...summary(v), p50mph: mph(quant(v, 0.5)), p90mph: mph(quant(v, 0.9)), maxMph: mph(quant(v, 1)) }])),
  maxAccelPerPlay: Object.fromEntries(Object.entries(maxAccel).map(([g, v]) => [g, summary(v)])),
  timeToThrow: summary(ttt),
  pressure: { dropbacks: pressureDropbacks, defenderWithin2ydPct: r2((100 * pressuredBeforeThrow) / Math.max(1, pressureDropbacks)), timeToPressure: summary(pressureT) },
  pocketDepthAt2_5s: summary(pocketDepth),
  separationAtArrival: summary(separation),
  wrSpeedAtThrow: summary(wrSpeedAtThrow),
  dlSpeedAt0_5s: summary(dlSpeed05),
  dlDepthAt1_0s: summary(dlDepth10),
  runTimeToLos: summary(timeToLos),
};

const out = {
  source: 'NFL Big Data Bowl 2019 public release (2017 season, weeks 1–6): github.com/nfl-football-ops/Big-Data-Bowl',
  plays: { games: games.length, scrimmagePlays: scrimmage.length },
  passing,
  running,
  defense,
  situations,
  tracking,
};
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 1).slice(0, 6000));
