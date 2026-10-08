/**
 * Distil the NFL Big Data Bowl 2026 analytics data (2023 season, all pass
 * plays, weeks 1–18) into calibration targets. The raw data stays out of the
 * repository (competition rules); only aggregates are written.
 *
 *   npx tsx scripts/data/bdb2026.ts <dir with supplementary_data.csv and train/> [data/bdb2026-summary.json]
 *
 * Play level (supplementary): coverage mix (overall and by situation), and
 * completion / yards / EPA by coverage, targeted route and depth; play
 * action, drop types and depths, formations, receiver alignments, box counts.
 * Tracking (input = snap to throw; output = ball in the air): time to throw,
 * per-play max speed and acceleration by position, receiver speed at the
 * throw, cushion at the snap, separation at the throw and at arrival,
 * closing during the flight, ball flight time by distance, QB drop depth.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const dir = resolve(process.argv[2] ?? '.');
const outPath = resolve(process.argv[3] ?? 'data/bdb2026-summary.json');

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
  if (cell.length || row.length) rows.push([...row, cell]);
  const head = rows.shift()!;
  return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
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
const share = (vals: string[], top = 12) => {
  const c: Record<string, number> = {};
  for (const v of vals) c[v] = (c[v] ?? 0) + 1;
  return Object.fromEntries(Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, top).map(([k, v]) => [k, pct(v, vals.length)]));
};

// ------------------------------------------------------------------ play level

const sup = parseCsv(readFileSync(`${dir}/supplementary_data.csv`, 'utf8')).filter((p) => p.play_nullified_by_penalty !== 'Y');
const playKey = (g: string, p: string) => `${g}-${p}`;
const supBy = new Map(sup.map((p) => [playKey(p.game_id, p.play_id), p]));
const n = (v: string) => (v === '' || v === 'NA' ? NaN : Number(v));

interface Agg { n: number; c: number; int: number; yds: number; epa: number; air: number[] }
const agg = (): Agg => ({ n: 0, c: 0, int: 0, yds: 0, epa: 0, air: [] });
const add = (a: Agg, p: Record<string, string>) => {
  a.n++;
  if (p.pass_result === 'C') a.c++;
  if (p.pass_result === 'IN') a.int++;
  a.yds += n(p.yards_gained) || 0;
  a.epa += n(p.expected_points_added) || 0;
  const al = n(p.pass_length);
  if (Number.isFinite(al)) a.air.push(al);
};
const fin = (a: Agg) => ({ share: 0, n: a.n, completionPct: pct(a.c, a.n), intPct: pct(a.int, a.n), yardsPerAtt: r2(a.yds / a.n), epaPerAtt: r2(a.epa / a.n), airYards: r2(mean(a.air)) });

const byCov: Record<string, Agg> = {};
const byRoute: Record<string, Agg> = {};
const byRouteMZ: Record<string, Agg> = {};
const byDepth: Record<string, Agg> = {};
const pa: Record<string, Agg> = { PA: agg(), 'no PA': agg() };
for (const p of sup) {
  add((byCov[p.team_coverage_type] ??= agg()), p);
  add((byRoute[p.route_of_targeted_receiver] ??= agg()), p);
  add((byRouteMZ[`${p.route_of_targeted_receiver} vs ${p.team_coverage_man_zone === 'MAN_COVERAGE' ? 'man' : 'zone'}`] ??= agg()), p);
  const al = n(p.pass_length);
  const k = al < 0 ? 'behind' : al < 10 ? '0-9' : al < 20 ? '10-19' : '20+';
  add((byDepth[k] ??= agg()), p);
  add(pa[p.play_action === 'TRUE' ? 'PA' : 'no PA'], p);
}
const finAll = (m: Record<string, Agg>) => Object.fromEntries(Object.entries(m).sort((a, b) => b[1].n - a[1].n).map(([k, a]) => [k, { ...fin(a), share: pct(a.n, sup.length) }]));

const sitOf = (p: Record<string, string>) => {
  const d = Number(p.down);
  const t = Number(p.yards_to_go);
  const ytg = p.yardline_side === p.possession_team ? 100 - Number(p.yardline_number) : Number(p.yardline_number);
  if (ytg <= 10) return 'red zone (≤10)';
  if (ytg <= 20) return 'red zone (11–20)';
  if (d === 1) return '1st';
  if (d === 2) return t >= 7 ? '2nd-long' : '2nd-short/medium';
  return t >= 7 ? '3rd/4th-long' : t >= 3 ? '3rd/4th-medium' : '3rd/4th-short';
};
const sitCov: Record<string, string[]> = {};
for (const p of sup) (sitCov[sitOf(p)] ??= []).push(p.team_coverage_type);

const dropDist: Record<string, number[]> = {};
for (const p of sup) {
  const v = n(p.dropback_distance);
  if (Number.isFinite(v)) (dropDist[p.dropback_type] ??= []).push(v);
}

const plays = {
  passPlays: sup.length,
  completionPct: pct(sup.filter((p) => p.pass_result === 'C').length, sup.length),
  intPct: pct(sup.filter((p) => p.pass_result === 'IN').length, sup.length),
  manPct: pct(sup.filter((p) => p.team_coverage_man_zone === 'MAN_COVERAGE').length, sup.length),
  coverage: finAll(byCov),
  coverageBySituation: Object.fromEntries(Object.entries(sitCov).map(([k, v]) => [k, { plays: v.length, mix: share(v, 8) }])),
  targetedRoute: finAll(byRoute),
  routeVsManZone: finAll(byRouteMZ),
  depth: finAll(byDepth),
  playAction: { ratePct: pct(pa.PA.n, sup.length), PA: fin(pa.PA), noPA: fin(pa['no PA']) },
  dropbackType: share(sup.map((p) => p.dropback_type)),
  dropbackDistance: Object.fromEntries(Object.entries(dropDist).map(([k, v]) => [k, summary(v)])),
  formation: share(sup.map((p) => p.offense_formation)),
  receiverAlignment: share(sup.map((p) => p.receiver_alignment)),
  boxCount: share(sup.map((p) => p.defenders_in_the_box)),
  passLocation: share(sup.map((p) => p.pass_location_type)),
};

// ------------------------------------------------------------------ tracking

const GROUP: Record<string, string> = { WR: 'WR', TE: 'TE', RB: 'RB', FB: 'RB', QB: 'QB', CB: 'CB', FS: 'S', SS: 'S', S: 'S', ILB: 'LB', MLB: 'LB', OLB: 'LB', LB: 'LB', DE: 'DL', DT: 'DL', NT: 'DL' };
const maxS: Record<string, number[]> = {};
const maxA: Record<string, number[]> = {};
const ttt: number[] = [];
const routeSpeedAtThrow: number[] = [];
const targetSpeedAtThrow: number[] = [];
const cushion: number[] = [];
const sepThrow: number[] = [];
const sepThrowByCov: Record<string, number[]> = {};
const sepArrive: number[] = [];
const sepArriveByCov: Record<string, number[]> = {};
const closing: number[] = [];
const flightByDist: Record<string, number[]> = {};
const qbDepth: number[] = [];
const defFlightSpeed: number[] = [];

const trainDir = `${dir}/train`;
const weeks = readdirSync(trainDir).filter((f) => f.startsWith('input_')).sort();
for (const wf of weeks) {
  const lines = readFileSync(`${trainDir}/${wf}`, 'utf8').split('\n');
  const head = lines[0].split(',');
  const ix = (k: string) => head.indexOf(k);
  const I = { g: ix('game_id'), p: ix('play_id'), id: ix('nfl_id'), f: ix('frame_id'), dirn: ix('play_direction'), los: ix('absolute_yardline_number'), pos: ix('player_position'), side: ix('player_side'), role: ix('player_role'), x: ix('x'), y: ix('y'), s: ix('s'), a: ix('a'), nout: ix('num_frames_output'), bx: ix('ball_land_x'), by: ix('ball_land_y') };
  // play → player → frames
  const playsT = new Map<string, Map<string, string[][]>>();
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(',');
    if (c.length !== head.length) continue;
    const k = playKey(c[I.g], c[I.p]);
    let pm = playsT.get(k);
    if (!pm) playsT.set(k, (pm = new Map()));
    let fr = pm.get(c[I.id]);
    if (!fr) pm.set(c[I.id], (fr = []));
    fr.push(c);
  }
  // Ball-in-air positions for predicted players.
  const outLines = readFileSync(`${trainDir}/${wf.replace('input_', 'output_')}`, 'utf8').split('\n');
  const oh = outLines[0].split(',');
  const O = { g: oh.indexOf('game_id'), p: oh.indexOf('play_id'), id: oh.indexOf('nfl_id'), f: oh.indexOf('frame_id'), x: oh.indexOf('x'), y: oh.indexOf('y') };
  const outT = new Map<string, Map<string, Array<{ f: number; x: number; y: number }>>>();
  for (let i = 1; i < outLines.length; i++) {
    const c = outLines[i].split(',');
    if (c.length !== oh.length) continue;
    const k = playKey(c[O.g], c[O.p]);
    let pm = outT.get(k);
    if (!pm) outT.set(k, (pm = new Map()));
    let fr = pm.get(c[O.id]);
    if (!fr) pm.set(c[O.id], (fr = []));
    fr.push({ f: Number(c[O.f]), x: Number(c[O.x]), y: Number(c[O.y]) });
  }

  for (const [k, pm] of playsT) {
    const play = supBy.get(k);
    if (!play) continue;
    const cov = play.team_coverage_type;
    let nFrames = 0;
    let target: string[][] | null = null;
    let passer: string[][] | null = null;
    const defenders: string[][][] = [];
    for (const [, fr] of pm) {
      fr.sort((a, b) => Number(a[I.f]) - Number(b[I.f]));
      nFrames = Math.max(nFrames, fr.length);
      const g = GROUP[fr[0][I.pos]];
      const role = fr[0][I.role];
      if (role === 'Targeted Receiver') target = fr;
      if (role === 'Passer') passer = fr;
      if (fr[0][I.side] === 'Defense') defenders.push(fr);
      if (!g) continue;
      const vmax = Math.max(...fr.map((r) => Number(r[I.s])));
      const amax = Math.max(...fr.map((r) => Number(r[I.a])));
      if (vmax > 2) (maxS[g] ??= []).push(vmax);
      if (vmax > 3) (maxA[g] ??= []).push(amax);
      if (role === 'Other Route Runner' || role === 'Targeted Receiver') routeSpeedAtThrow.push(Number(fr[fr.length - 1][I.s]));
    }
    if (play.dropback_type === 'TRADITIONAL') ttt.push(nFrames / 10);
    if (passer) {
      const last = passer[passer.length - 1];
      const los = Number(last[I.los]);
      const dirSign = last[I.dirn] === 'right' ? 1 : -1;
      qbDepth.push((los - Number(last[I.x])) * dirSign);
    }
    if (!target || !defenders.length) continue;
    const near = (fi: number, fr: string[][]) => {
      const t = fr[Math.min(fi, fr.length - 1)];
      let best = Infinity;
      for (const d of defenders) {
        const dr = d[Math.min(fi, d.length - 1)];
        best = Math.min(best, Math.hypot(Number(dr[I.x]) - Number(t[I.x]), Number(dr[I.y]) - Number(t[I.y])));
      }
      return best;
    };
    cushion.push(near(0, target));
    const sT = near(target.length - 1, target);
    sepThrow.push(sT);
    (sepThrowByCov[cov] ??= []).push(sT);
    targetSpeedAtThrow.push(Number(target[target.length - 1][I.s]));

    // Ball in the air.
    const om = outT.get(k);
    const tid = target[0][I.id];
    const tOut = om?.get(tid);
    const nOut = Number(target[0][I.nout]);
    if (passer) {
      const pl = passer[passer.length - 1];
      const dist = Math.hypot(Number(target[0][I.bx]) - Number(pl[I.x]), Number(target[0][I.by]) - Number(pl[I.y]));
      const b = dist < 10 ? '<10' : dist < 20 ? '10-19' : dist < 30 ? '20-29' : dist < 40 ? '30-39' : '40+';
      if (nOut > 0) (flightByDist[b] ??= []).push(nOut / 10);
    }
    if (om && tOut && tOut.length) {
      tOut.sort((a, b) => a.f - b.f);
      const lastT = tOut[tOut.length - 1];
      let best = Infinity;
      for (const [id, fr] of om) {
        if (id === tid) continue;
        const side = pm.get(id)?.[0][I.side];
        if (side !== 'Defense') continue;
        fr.sort((a, b) => a.f - b.f);
        const d = fr[fr.length - 1];
        best = Math.min(best, Math.hypot(d.x - lastT.x, d.y - lastT.y));
        for (let i = 1; i < fr.length; i++) defFlightSpeed.push(Math.hypot(fr[i].x - fr[i - 1].x, fr[i].y - fr[i - 1].y) / 0.1);
      }
      if (Number.isFinite(best)) {
        sepArrive.push(best);
        (sepArriveByCov[cov] ??= []).push(best);
        closing.push(sT - best);
      }
    }
  }
  process.stderr.write(`${wf} done\n`);
}

const mph = (v: number) => r2((v * 3600) / 1760);
const tracking = {
  note: 'Input frames run from the snap to the throw (traditional dropbacks for time to throw). Speeds yd/s, NGS-smoothed s and a.',
  timeToThrow: summary(ttt),
  qbDepthAtThrow: summary(qbDepth),
  maxSpeedPerPlay: Object.fromEntries(Object.entries(maxS).map(([g, v]) => [g, { ...summary(v), p50mph: mph(quant(v, 0.5)), p90mph: mph(quant(v, 0.9)) }])),
  maxAccelPerPlay: Object.fromEntries(Object.entries(maxA).map(([g, v]) => [g, summary(v)])),
  routeRunnerSpeedAtThrow: summary(routeSpeedAtThrow),
  targetSpeedAtThrow: summary(targetSpeedAtThrow),
  targetCushionAtSnap: summary(cushion),
  separationAtThrow: { ...summary(sepThrow), byCoverage: Object.fromEntries(Object.entries(sepThrowByCov).map(([k, v]) => [k, r2(mean(v))])) },
  separationAtArrival: { ...summary(sepArrive), byCoverage: Object.fromEntries(Object.entries(sepArriveByCov).map(([k, v]) => [k, r2(mean(v))])) },
  closingDuringFlight: summary(closing),
  defenderSpeedInFlight: summary(defFlightSpeed),
  ballFlightTimeByDistance: Object.fromEntries(Object.entries(flightByDist).sort().map(([k, v]) => [k, summary(v)])),
};

const out = { source: 'NFL Big Data Bowl 2026 analytics data (2023 season, pass plays, weeks 1–18); aggregates only', plays, tracking };
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(tracking, null, 1));
