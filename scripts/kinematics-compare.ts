/**
 * Measure simulated games the way the real tracking data was measured and
 * print them side by side:
 *   - pass game vs. the 2026 Big Data Bowl (2023 season, data/bdb2026-summary.json)
 *   - trenches and runs vs. the 2025 Big Data Bowl (2022 season, data/bdb2025-summary.json)
 *   npx tsx scripts/kinematics-compare.ts [games] [seed]
 */
import { readFileSync } from 'node:fs';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';

const [gamesStr = '4', seedStr = '5'] = process.argv.slice(2);
const r26 = JSON.parse(readFileSync('data/bdb2026-summary.json', 'utf8'));
const r25 = JSON.parse(readFileSync('data/bdb2025-summary.json', 'utf8'));
const rng = new Rng(Number(seedStr));

const GROUP: Record<string, string> = {
  QB: 'QB', RB: 'RB', FB: 'RB', X: 'WR', Z: 'WR', H: 'WR', Y: 'TE', F: 'TE',
  LT: 'OL', LG: 'OL', C: 'OL', RG: 'OL', RT: 'OL',
  DE_S: 'DL', DE_W: 'DL', DT_S: 'DL', DT_W: 'DL', NT: 'DL',
  LB_S: 'LB', LB_M: 'LB', LB_W: 'LB', CB_S: 'CB', CB_W: 'CB', NB: 'CB', DB: 'CB', FS: 'S', SS: 'S',
};
const COV: Record<string, string> = { 'Cover 0': 'COVER_0_MAN', 'Cover 1': 'COVER_1_MAN', '2-Man': 'COVER_2_MAN', 'Tampa 2': 'COVER_2_ZONE', 'Cover 2': 'COVER_2_ZONE', 'Cover 3': 'COVER_3_ZONE', 'Cover 4': 'COVER_4_ZONE', 'Cover 6': 'COVER_6_ZONE' };
const covOf = (label: string) => {
  const real = label.split('(shows')[0];
  for (const [k, v] of Object.entries(COV)) if (real.includes(k)) return v;
  return 'NA';
};
const quant = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] : NaN;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const push = (m: Record<string, number[]>, k: string, v: number) => (m[k] ??= []).push(v);

const preMaxS: Record<string, number[]> = {};
const preMaxA: Record<string, number[]> = {};
const runMaxS: Record<string, number[]> = {};
const ttt: number[] = [];
const qbDepth: number[] = [];
const tgtSpeed: number[] = [];
const cushion: number[] = [];
const sepT: number[] = [];
const sepA: number[] = [];
const sepTc: Record<string, number[]> = {};
const sepAc: Record<string, number[]> = {};
const closing: number[] = [];
const flight: Record<string, number[]> = {};
const pressureT: number[] = [];
let pressured = 0;
let dropbacks = 0;
const pocket: number[] = [];
const dl05: number[] = [];
const dl10: number[] = [];
const ybc: number[] = [];
const toLos: number[] = [];
const handoffT: number[] = [];
const runMaxA: Record<string, number[]> = {};

for (let g = 0; g < Number(gamesStr); g++) {
  const home = generateTeam(rng, 'H', 'HOM', { strength: 0.55 });
  const away = generateTeam(rng, 'A', 'AWY', { strength: 0.55 });
  const res = simulateGame(home, away, { seed: rng.nextU32(), record: true });
  for (const p of res.log) {
    const rp = p.replay;
    if (!rp || (p.kind !== 'run' && p.kind !== 'pass')) continue;
    const F = rp.frames;
    const n = rp.players.length;
    const los = rp.los;
    const T = F.map((f) => f.t);
    const frameAt = (t: number) => {
      let k = 0;
      while (k < F.length - 1 && T[k] < t) k++;
      return k;
    };
    // Speed per frame (0.2 s central difference of positions); a 0.5 s moving
    // average before differencing for acceleration (NGS-style smoothing).
    const speeds = (i: number) => {
      const s: number[] = [];
      for (let k = 0; k < F.length; k++) {
        const a = Math.max(0, k - 1);
        const b = Math.min(F.length - 1, k + 1);
        const dt = T[b] - T[a] || 0.1;
        s.push(Math.hypot(F[b].agents[i * 3] - F[a].agents[i * 3], F[b].agents[i * 3 + 1] - F[a].agents[i * 3 + 1]) / dt);
      }
      return s;
    };
    const smooth = (s: number[]) => s.map((_, k) => mean(s.slice(Math.max(0, k - 2), k + 3)));
    const ev = rp.events;
    const throwE = ev.find((e) => e.type === 'throw');
    const sackE = ev.find((e) => e.type === 'sack');
    const qbI = rp.players.findIndex((pl) => pl.slot === 'QB');

    if (p.kind === 'pass' && !p.stats?.scramble) {
      dropbacks++;
      const end = throwE?.t ?? sackE?.t ?? T[T.length - 1];
      const kEnd = frameAt(end);
      for (let i = 0; i < n; i++) {
        const grp = GROUP[rp.players[i].slot];
        if (!grp || grp === 'OL' || grp === 'DL') continue;
        const s = speeds(i).slice(0, kEnd + 1);
        const vmax = Math.max(...s);
        if (vmax > 2) push(preMaxS, grp, vmax);
        const ss = smooth(s);
        let amax = 0;
        for (let k = 1; k < ss.length - 1; k++) amax = Math.max(amax, (ss[k + 1] - ss[k - 1]) / (T[k + 1] - T[k - 1] || 0.2));
        if (vmax > 3) push(preMaxA, grp, amax);
      }
      if (throwE) {
        ttt.push(throwE.t);
        qbDepth.push(los - F[kEnd].agents[qbI * 3]);
        const ti = throwE.b;
        if (ti !== undefined && p.stats?.attempted && !p.stats.throwaway) {
          const near = (k: number) => {
            let best = Infinity;
            for (let j = 0; j < n; j++) if (rp.players[j].team === 'D') best = Math.min(best, Math.hypot(F[k].agents[j * 3] - F[k].agents[ti * 3], F[k].agents[j * 3 + 1] - F[k].agents[ti * 3 + 1]));
            return best;
          };
          tgtSpeed.push(speeds(ti)[kEnd]);
          cushion.push(near(0));
          const st = near(kEnd);
          sepT.push(st);
          push(sepTc, covOf(p.defense), st);
          const arr = ev.find((e) => ['catch', 'pbu', 'incomplete', 'interception', 'drop'].includes(e.type) && e.t >= throwE.t);
          if (arr) {
            const kA = frameAt(arr.t);
            const sa = near(kA);
            sepA.push(sa);
            push(sepAc, covOf(p.defense), sa);
            closing.push(st - sa);
            const qx = F[kEnd].agents[qbI * 3];
            const qy = F[kEnd].agents[qbI * 3 + 1];
            const dist = Math.hypot(F[kA].agents[ti * 3] - qx, F[kA].agents[ti * 3 + 1] - qy);
            const b = dist < 10 ? '<10' : dist < 20 ? '10-19' : dist < 30 ? '20-29' : dist < 40 ? '30-39' : '40+';
            push(flight, b, arr.t - throwE.t);
          }
        }
      }
      // Trench timing, measured as in the 2017 extraction.
      for (let k = frameAt(0.5); k < F.length && T[k] <= end; k++) {
        const ag = F[k].agents;
        let near = false;
        for (let i = 0; i < n; i++) if (rp.players[i].team === 'D' && Math.hypot(ag[i * 3] - ag[qbI * 3], ag[i * 3 + 1] - ag[qbI * 3 + 1]) < 2) near = true;
        if (near) {
          pressured++;
          pressureT.push(T[k]);
          break;
        }
      }
      if (end > 2.5) {
        const k = frameAt(2.5);
        const ol = rp.players.map((pl, i) => [pl, i] as const).filter(([pl]) => GROUP[pl.slot] === 'OL');
        pocket.push(mean(ol.map(([, i]) => los - F[k].agents[i * 3])));
      }
      const k05 = frameAt(0.5), k10 = frameAt(1.0);
      rp.players.forEach((pl, i) => {
        if (GROUP[pl.slot] === 'DL') {
          dl05.push(speeds(i)[k05]);
          dl10.push(los - F[k10].agents[i * 3]);
        }
      });
    }
    if (p.kind === 'run') {
      for (let i = 0; i < n; i++) {
        const grp = GROUP[rp.players[i].slot];
        if (!grp) continue;
        const sp = speeds(i);
        const vmax = Math.max(...sp);
        if (vmax > 2) push(runMaxS, grp, vmax);
        const ss = smooth(sp);
        let amax = 0;
        for (let k = 1; k < ss.length - 1; k++) amax = Math.max(amax, (ss[k + 1] - ss[k - 1]) / (T[k + 1] - T[k - 1] || 0.2));
        if (vmax > 3) push(runMaxA, grp, amax);
      }
      const ho = ev.find((e) => e.type === 'handoff');
      if (ho) handoffT.push(ho.t);
      // First contact on the carrier, located where he was (as tracking's first_contact).
      const fc = ev.find((e) => e.type === 'carrier_contact' && e.pos);
      if (fc?.pos) ybc.push(fc.pos.x - los);
      const ci = ho?.b ?? ho?.a;
      if (ho && ci !== undefined) {
        for (const f of F) if (f.t >= ho.t && f.agents[ci * 3] >= los) {
          toLos.push(f.t);
          break;
        }
      }
    }
  }
}

const f2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '—');
const mph = (v: number) => ((v * 3600) / 1760).toFixed(1);
const row = (name: string, sim: string, nfl: string) => console.log(`${name.padEnd(38)} ${sim.padStart(18)}   ${nfl}`);
const t26 = r26.tracking;
console.log(`${'PASS GAME (vs 2023 tracking)'.padEnd(38)} ${'sim'.padStart(18)}   NFL`);
row('time to throw p50 / mean', `${f2(quant(ttt, 0.5))} / ${f2(mean(ttt))}`, `${t26.timeToThrow.p50} / ${t26.timeToThrow.mean}`);
row('QB depth at throw p50', f2(quant(qbDepth, 0.5)), `${t26.qbDepthAtThrow.p50}`);
for (const g of ['WR', 'TE', 'RB', 'CB', 'S', 'LB']) {
  const s = preMaxS[g] ?? [];
  const r = t26.maxSpeedPerPlay[g];
  row(`pre-throw max speed ${g} mph p50/p90`, `${mph(quant(s, 0.5))} / ${mph(quant(s, 0.9))}`, `${r.p50mph} / ${r.p90mph}`);
}
for (const g of ['WR', 'TE', 'RB', 'CB', 'S', 'LB']) {
  const s = preMaxA[g] ?? [];
  const r = t26.maxAccelPerPlay[g];
  row(`pre-throw max accel ${g} p50/p90`, `${f2(quant(s, 0.5))} / ${f2(quant(s, 0.9))}`, `${r.p50} / ${r.p90}`);
}
row('target speed at throw p50', f2(quant(tgtSpeed, 0.5)), `${t26.targetSpeedAtThrow.p50}`);
row('target cushion at snap p50', f2(quant(cushion, 0.5)), `${t26.targetCushionAtSnap.p50}`);
row('separation at throw mean / p50', `${f2(mean(sepT))} / ${f2(quant(sepT, 0.5))}`, `${t26.separationAtThrow.mean} / ${t26.separationAtThrow.p50}`);
row('separation at arrival mean / p50', `${f2(mean(sepA))} / ${f2(quant(sepA, 0.5))}`, `${t26.separationAtArrival.mean} / ${t26.separationAtArrival.p50}`);
row('closing during flight mean', f2(mean(closing)), `${t26.closingDuringFlight.mean}`);
for (const c of ['COVER_1_MAN', 'COVER_3_ZONE', 'COVER_2_ZONE', 'COVER_4_ZONE', 'COVER_6_ZONE', 'COVER_0_MAN']) {
  row(`  sep throw/arrival ${c}`, `${f2(mean(sepTc[c] ?? []))} / ${f2(mean(sepAc[c] ?? []))}`, `${t26.separationAtThrow.byCoverage[c]} / ${t26.separationAtArrival.byCoverage[c]}`);
}
for (const b of ['<10', '10-19', '20-29', '30-39', '40+']) {
  const r = t26.ballFlightTimeByDistance[b];
  row(`  ball flight ${b} yd (mean s)`, `${f2(mean(flight[b] ?? []))} (n${(flight[b] ?? []).length})`, r ? `${r.mean}` : '—');
}
const t25 = r25.tracking;
const L25 = r25.labels;
console.log(`\n${'TRENCHES & RUNS (vs 2022 tracking)'.padEnd(38)} ${'sim'.padStart(18)}   NFL`);
row('defender within 2 yd of QB', `${((100 * pressured) / dropbacks).toFixed(1)}%`, `${t25.pressure.defenderWithin2ydPct}%`);
row('time to that pressure p50', f2(quant(pressureT, 0.5)), `${t25.pressure.timeToPressure.p50}`);
row('pocket depth at 2.5 s p50', f2(quant(pocket, 0.5)), `${t25.pocketDepthAt2_5s.p50}`);
row('DL speed at 0.5 s p50 / p90', `${f2(quant(dl05, 0.5))} / ${f2(quant(dl05, 0.9))}`, `${t25.dlSpeedAt0_5s.p50} / ${t25.dlSpeedAt0_5s.p90}`);
row('DL depth past LOS at 1.0 s p10/p50/p90', `${f2(quant(dl10, 0.1))} / ${f2(quant(dl10, 0.5))} / ${f2(quant(dl10, 0.9))}`, `${t25.dlDepthAt1_0s.p10} / ${t25.dlDepthAt1_0s.p50} / ${t25.dlDepthAt1_0s.p90}`);
row('run: handoff time p50', f2(quant(handoffT, 0.5)), `${t25.runHandoffTime.p50}`);
row('run: time to reach LOS p50', f2(quant(toLos, 0.5)), `${t25.runTimeToLos.p50}`);
for (const g of ['RB', 'WR', 'CB', 'S', 'LB', 'DL', 'OL']) {
  const s = runMaxS[g] ?? [];
  const a = runMaxA[g] ?? [];
  const r = t25.maxSpeedPerPlay[`${g}:run`];
  const ra = t25.maxAccelPerPlay[`${g}:run`];
  row(`run-play max speed ${g} mph p50/p90`, `${mph(quant(s, 0.5))} / ${mph(quant(s, 0.9))}`, r ? `${r.p50mph} / ${r.p90mph}` : '—');
  row(`run-play max accel ${g} p50/p90`, `${f2(quant(a, 0.5))} / ${f2(quant(a, 0.9))}`, ra ? `${ra.p50} / ${ra.p90}` : '—');
}
row('run: yards before first contact p10/p50/p90 (mean)', `${f2(quant(ybc, 0.1))} / ${f2(quant(ybc, 0.5))} / ${f2(quant(ybc, 0.9))} (${f2(mean(ybc))})`, `${t25.runYardsBeforeContact.p10} / ${t25.runYardsBeforeContact.p50} / ${t25.runYardsBeforeContact.p90} (${t25.runYardsBeforeContact.mean})`);
console.log(`\nNFL 2022 run game: ${L25.running.ypc} YPC, ${L25.running.stuffPct}% stuffed, ${L25.running.pct10plus}% 10+; YBC (first contact) mean ${t25.runYardsBeforeContact.mean}`);
