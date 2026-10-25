/**
 * Distil the NFL Big Data Bowl 2025 data (2022 season, weeks 1–9, every
 * play, all 22 players) into calibration targets — especially the run game
 * and the trenches, which the 2026 set doesn't track. Aggregates only; the
 * raw data stays out of the repository.
 *
 *   npx tsx scripts/data/bdb2025.ts <dir> [data/bdb2025-summary.json]
 *
 * <dir> holds plays.csv, player_play.csv, players.csv and any number of
 * tracking_week_N.csv files (play/player labels cover all weeks; tracking
 * metrics use whichever weeks are present).
 */
import { createReadStream, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';

const dir = resolve(process.argv[2] ?? '.');
const outPath = resolve(process.argv[3] ?? 'data/bdb2025-summary.json');

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') {
      out.push(cell);
      cell = '';
    } else cell += ch;
  }
  out.push(cell.replace(/\r$/, ''));
  return out;
}
function readCsv(path: string): Array<Record<string, string>> {
  const lines = readFileSync(path, 'utf8').split('\n').filter((l) => l.length);
  const head = splitCsvLine(lines[0]);
  return lines.slice(1).map((l) => {
    const c = splitCsvLine(l);
    return Object.fromEntries(head.map((h, i) => [h, c[i]]));
  });
}

const quant = (xs: number[], q: number) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))];
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const r2 = (v: number) => Math.round(v * 100) / 100;
const summary = (xs: number[]) => ({ n: xs.length, mean: r2(mean(xs)), p10: r2(quant(xs, 0.1)), p50: r2(quant(xs, 0.5)), p90: r2(quant(xs, 0.9)) });
const pct = (a: number, b: number) => r2((100 * a) / Math.max(1, b));
const num = (v: string | undefined) => (v === undefined || v === '' || v === 'NA' ? NaN : Number(v));
const share = (vals: string[], top = 12) => {
  const c: Record<string, number> = {};
  for (const v of vals) c[v] = (c[v] ?? 0) + 1;
  return Object.fromEntries(Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, top).map(([k, v]) => [k, pct(v, vals.length)]));
};

// ------------------------------------------------------------------ labels (all weeks)

const plays = readCsv(`${dir}/plays.csv`).filter((p) => p.playNullifiedByPenalty !== 'Y');
const pp = readCsv(`${dir}/player_play.csv`);
const players = readCsv(`${dir}/players.csv`);
const posOf = new Map(players.map((p) => [p.nflId, p.position]));
const key = (g: string, p: string) => `${g}-${p}`;
const playBy = new Map(plays.map((p) => [key(p.gameId, p.playId), p]));
const ppBy = new Map<string, Array<Record<string, string>>>();
for (const r of pp) {
  const k = key(r.gameId, r.playId);
  let a = ppBy.get(k);
  if (!a) ppBy.set(k, (a = []));
  a.push(r);
}

const isRun = (p: Record<string, string>) => p.isDropback === 'FALSE' && p.qbKneel !== '1' && p.qbSpike !== 'TRUE' && p.qbKneel !== 'TRUE' && Number.isFinite(num(p.yardsGained)) && /rushLocationType/.test('rushLocationType') && p.rushLocationType !== 'NA' && p.rushLocationType !== '';
const runs = plays.filter(isRun);
const dropbacks = plays.filter((p) => p.isDropback === 'TRUE');
const runYds = runs.map((p) => num(p.yardsGained));

const byConcept: Record<string, number[]> = {};
for (const p of runs) (byConcept[p.pff_runConceptPrimary || 'NA'] ??= []).push(num(p.yardsGained));
const concepts = Object.fromEntries(
  Object.entries(byConcept)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([k, v]) => [k, { share: pct(v.length, runs.length), ypc: r2(mean(v)), stuffPct: pct(v.filter((y) => y <= 0).length, v.length), pct10plus: pct(v.filter((y) => y >= 10).length, v.length) }]),
);

// Pass rush (player labels).
let pressured = 0;
const rushersPerPlay: number[] = [];
const ttp: number[] = [];
const getOff: Record<string, number[]> = {};
const pressByRushers: Record<string, { n: number; p: number }> = {};
const blockReps: Record<string, { n: number; allowed: number }> = {};
for (const p of dropbacks) {
  const rows = ppBy.get(key(p.gameId, p.playId)) ?? [];
  const rushers = rows.filter((r) => r.wasInitialPassRusher === '1' || r.wasInitialPassRusher === 'TRUE');
  rushersPerPlay.push(rushers.length);
  const press = rows.filter((r) => r.causedPressure === 'TRUE' || r.causedPressure === '1');
  const t = press.map((r) => num(r.timeToPressureAsPassRusher)).filter(Number.isFinite);
  if (press.length) {
    pressured++;
    if (t.length) ttp.push(Math.min(...t));
  }
  const b = (pressByRushers[Math.min(7, rushers.length)] ??= { n: 0, p: 0 });
  b.n++;
  if (press.length) b.p++;
  for (const r of rushers) {
    const g = num(r.getOffTimeAsPassRusher);
    const pos = posOf.get(r.nflId) ?? '?';
    if (Number.isFinite(g)) (getOff[pos] ??= []).push(g);
  }
  for (const r of rows) {
    const pos = posOf.get(r.nflId) ?? '';
    if (!['T', 'G', 'C', 'TE', 'RB', 'FB'].includes(pos)) continue;
    if (!r.blockedPlayerNFLId1 || r.blockedPlayerNFLId1 === 'NA') continue;
    const k = ['T', 'G', 'C'].includes(pos) ? pos : pos === 'FB' ? 'RB' : pos;
    const a = (blockReps[k] ??= { n: 0, allowed: 0 });
    a.n++;
    if (r.pressureAllowedAsBlocker === '1' || r.pressureAllowedAsBlocker === 'TRUE') a.allowed++;
  }
}

const sitOf = (p: Record<string, string>) => {
  const d = Number(p.down);
  const t = Number(p.yardsToGo);
  const ytg = p.yardlineSide === p.possessionTeam ? 100 - Number(p.yardlineNumber) : Number(p.yardlineNumber);
  if (ytg <= 5) return 'goal-to-go (≤5)';
  if (ytg <= 20) return 'red zone (6–20)';
  if (d === 1) return '1st';
  if (d === 2) return t >= 7 ? '2nd-long' : t >= 3 ? '2nd-medium' : '2nd-short';
  return t >= 7 ? '3rd/4th-long' : t >= 3 ? '3rd/4th-medium' : '3rd/4th-short';
};
const sit: Record<string, { n: number; pass: number; formation: string[]; concepts: string[]; coverage: string[] }> = {};
for (const p of [...runs, ...dropbacks]) {
  const s = (sit[sitOf(p)] ??= { n: 0, pass: 0, formation: [], concepts: [], coverage: [] });
  s.n++;
  if (p.isDropback === 'TRUE') s.pass++;
  else s.concepts.push(p.pff_runConceptPrimary || 'NA');
  s.formation.push(p.offenseFormation);
  s.coverage.push(p.pff_passCoverage);
}

const labels = {
  plays: plays.length,
  running: {
    carries: runs.length,
    ypc: r2(mean(runYds)),
    stuffPct: pct(runYds.filter((y) => y <= 0).length, runYds.length),
    pct10plus: pct(runYds.filter((y) => y >= 10).length, runYds.length),
    yards: summary(runYds),
    concepts,
    location: share(runs.map((p) => p.rushLocationType)),
  },
  passing: {
    dropbacks: dropbacks.length,
    sackPct: pct(dropbacks.filter((p) => p.passResult === 'S').length, dropbacks.length),
    scramblePct: pct(dropbacks.filter((p) => p.passResult === 'R').length, dropbacks.length),
    timeToThrow: summary(dropbacks.map((p) => num(p.timeToThrow)).filter(Number.isFinite)),
    timeToSack: summary(dropbacks.map((p) => num(p.timeToSack)).filter(Number.isFinite)),
    timeInTackleBox: summary(dropbacks.map((p) => num(p.timeInTackleBox)).filter(Number.isFinite)),
    playActionPct: pct(dropbacks.filter((p) => p.playAction === 'TRUE').length, dropbacks.length),
    unblockedPressurePct: pct(dropbacks.filter((p) => p.unblockedPressure === 'TRUE').length, dropbacks.length),
  },
  passRush: {
    pressureRatePct: pct(pressured, dropbacks.length),
    timeToPressure: summary(ttp),
    rushers: share(rushersPerPlay.map(String)),
    pressureRateByRushers: Object.fromEntries(Object.entries(pressByRushers).map(([k, v]) => [k, { share: pct(v.n, dropbacks.length), pressurePct: pct(v.p, v.n) }])),
    getOffTime: Object.fromEntries(Object.entries(getOff).filter(([, v]) => v.length > 200).map(([k, v]) => [k, summary(v)])),
    pressureAllowedPerRep: Object.fromEntries(Object.entries(blockReps).map(([k, v]) => [k, { reps: v.n, allowedPct: pct(v.allowed, v.n) }])),
  },
  situations: Object.fromEntries(
    Object.entries(sit).map(([k, s]) => [k, { plays: s.n, passPct: pct(s.pass, s.n), formation: share(s.formation, 5), runConcepts: share(s.concepts, 6), coverage: share(s.coverage, 6) }]),
  ),
};

// ------------------------------------------------------------------ tracking (weeks present)

const GROUP: Record<string, string> = { QB: 'QB', RB: 'RB', FB: 'RB', WR: 'WR', TE: 'TE', T: 'OL', G: 'OL', C: 'OL', DE: 'DL', DT: 'DL', NT: 'DL', OLB: 'LB', ILB: 'LB', MLB: 'LB', LB: 'LB', CB: 'CB', DB: 'CB', FS: 'S', SS: 'S' };
const maxS: Record<string, number[]> = {};
const maxA: Record<string, number[]> = {};
const handoffT: number[] = [];
const toLos: number[] = [];
const ybc: number[] = [];
const pocket: number[] = [];
const dl05: number[] = [];
const dlDepth10: number[] = [];
const pressT: number[] = [];
let pressN = 0;
let dbN = 0;

interface Row { id: string; f: number; x: number; y: number; s: number; a: number; event: string; club: string; afterSnap: boolean; dirn: string }
function processPlay(k: string, rows: Row[]) {
  const play = playBy.get(k);
  if (!play) return;
  const run = isRun(play);
  const db = play.isDropback === 'TRUE';
  if (!run && !db) return;
  const byId = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.afterSnap) continue;
    let a = byId.get(r.id);
    if (!a) byId.set(r.id, (a = []));
    a.push(r);
  }
  const ball = byId.get('NA');
  const all = [...byId.values()].filter((a) => a[0].id !== 'NA');
  if (!ball || !all.length) return;
  for (const a of all) a.sort((p, q) => p.f - q.f);
  ball.sort((p, q) => p.f - q.f);
  const f0 = ball[0].f;
  const los = ball[0].x;
  const dir = ball[0].dirn === 'left' ? -1 : 1;
  const evFrame = (ev: string) => ball.find((r) => r.event === ev)?.f;
  const at = (a: Row[], f: number) => a[Math.min(a.length - 1, Math.max(0, f - a[0].f))];
  const offClub = play.possessionTeam;

  for (const a of all) {
    const g = GROUP[posOf.get(a[0].id) ?? ''];
    if (!g) continue;
    const vmax = Math.max(...a.map((r) => r.s));
    const amax = Math.max(...a.map((r) => r.a));
    if (vmax > 2) (maxS[`${g}:${run ? 'run' : 'pass'}`] ??= []).push(vmax);
    if (vmax > 3) (maxA[`${g}:${run ? 'run' : 'pass'}`] ??= []).push(amax);
  }
  if (run) {
    const ho = evFrame('handoff');
    if (ho !== undefined) handoffT.push((ho - f0) / 10);
    const carrierId = (ppBy.get(k) ?? []).find((r) => r.hadRushAttempt === '1' || r.hadRushAttempt === 'TRUE')?.nflId;
    const c = carrierId ? byId.get(carrierId) : undefined;
    if (c) {
      const cross = c.find((r) => (r.x - los) * dir >= 0);
      if (cross) toLos.push((cross.f - f0) / 10);
      const fc = evFrame('first_contact');
      if (fc !== undefined) ybc.push((at(c, fc).x - los) * dir);
    }
  }
  if (db) {
    dbN++;
    const end = evFrame('pass_forward') ?? evFrame('qb_sack') ?? evFrame('qb_strip_sack') ?? ball[ball.length - 1].f;
    const qb = all.find((a) => posOf.get(a[0].id) === 'QB' && a[0].club === offClub);
    if (qb) {
      for (let f = f0 + 5; f <= end; f++) {
        const q = at(qb, f);
        const near = all.some((a) => a[0].club !== offClub && Math.hypot(at(a, f).x - q.x, at(a, f).y - q.y) < 2);
        if (near) {
          pressN++;
          pressT.push((f - f0) / 10);
          break;
        }
      }
    }
    if (end - f0 > 25) {
      const ol = all.filter((a) => GROUP[posOf.get(a[0].id) ?? ''] === 'OL' && a[0].club === offClub);
      if (ol.length >= 4) pocket.push(mean(ol.map((a) => (los - at(a, f0 + 25).x) * dir)));
    }
    for (const a of all) {
      if (GROUP[posOf.get(a[0].id) ?? ''] !== 'DL' || a[0].club === offClub) continue;
      dl05.push(at(a, f0 + 5).s);
      dlDepth10.push((los - at(a, f0 + 10).x) * dir);
    }
  }
}

const trackFiles = readdirSync(dir).filter((f) => /^tracking_week_\d+\.csv$/.test(f)).sort();
for (const tf of trackFiles) {
  const rl = createInterface({ input: createReadStream(`${dir}/${tf}`), crlfDelay: Infinity });
  let head: string[] | null = null;
  let I: Record<string, number> = {};
  let cur = '';
  let buf: Row[] = [];
  for await (const line of rl) {
    if (!head) {
      head = splitCsvLine(line);
      I = Object.fromEntries(head.map((h, i) => [h, i]));
      continue;
    }
    const c = line.includes('"') ? splitCsvLine(line) : line.split(',');
    const k = key(c[I.gameId], c[I.playId]);
    if (k !== cur) {
      if (buf.length) processPlay(cur, buf);
      cur = k;
      buf = [];
    }
    buf.push({ id: c[I.nflId], f: Number(c[I.frameId]), x: Number(c[I.x]), y: Number(c[I.y]), s: Number(c[I.s]), a: Number(c[I.a]), event: c[I.event], club: c[I.club], afterSnap: c[I.frameType] !== 'BEFORE_SNAP', dirn: c[I.playDirection] });
  }
  if (buf.length) processPlay(cur, buf);
  process.stderr.write(`${tf} done\n`);
}

const mph = (v: number) => r2((v * 3600) / 1760);
const tracking = {
  weeks: trackFiles.length,
  maxSpeedPerPlay: Object.fromEntries(Object.entries(maxS).sort().map(([g, v]) => [g, { ...summary(v), p50mph: mph(quant(v, 0.5)), p90mph: mph(quant(v, 0.9)) }])),
  maxAccelPerPlay: Object.fromEntries(Object.entries(maxA).sort().map(([g, v]) => [g, summary(v)])),
  runHandoffTime: summary(handoffT),
  runTimeToLos: summary(toLos),
  runYardsBeforeContact: summary(ybc),
  pressure: { dropbacks: dbN, defenderWithin2ydPct: pct(pressN, dbN), timeToPressure: summary(pressT) },
  pocketDepthAt2_5s: summary(pocket),
  dlSpeedAt0_5s: summary(dl05),
  dlDepthAt1_0s: summary(dlDepth10),
};

const out = { source: 'NFL Big Data Bowl 2025 (2022 season, weeks 1–9); aggregates only', labels, tracking };
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 1).slice(0, 9000));
