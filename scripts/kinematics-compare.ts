/**
 * Measure simulated games the same way scripts/data/bdb2017.ts measures real
 * tracking, and print them side by side with data/bdb2017-summary.json.
 *   npx tsx scripts/kinematics-compare.ts [games] [seed]
 */
import { readFileSync } from 'node:fs';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';

const [gamesStr = '4', seedStr = '5'] = process.argv.slice(2);
const real = JSON.parse(readFileSync('data/bdb2017-summary.json', 'utf8'));
const rng = new Rng(Number(seedStr));

const GROUP: Record<string, string> = {
  QB: 'QB', RB: 'RB', FB: 'RB', X: 'WR', Z: 'WR', H: 'WR', Y: 'TE', F: 'TE',
  LT: 'OL', LG: 'OL', C: 'OL', RG: 'OL', RT: 'OL',
  DE_S: 'DL', DE_W: 'DL', DT_S: 'DL', DT_W: 'DL', NT: 'DL',
  LB_S: 'LB', LB_M: 'LB', LB_W: 'LB', CB_S: 'CB', CB_W: 'CB', NB: 'CB', DB: 'CB', FS: 'S', SS: 'S',
};
const quant = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] : NaN;
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

const maxSpeed: Record<string, number[]> = {};
const maxAccel: Record<string, number[]> = {};
const ttt: number[] = [];
const pressureT: number[] = [];
let pressured = 0;
let dropbacks = 0;
const pocket: number[] = [];
const wrAtThrow: number[] = [];
const dl05: number[] = [];
const dl10: number[] = [];
const toLos: number[] = [];
const sep: number[] = [];

for (let g = 0; g < Number(gamesStr); g++) {
  const home = generateTeam(rng, 'H', 'HOM', { strength: 0.55 });
  const away = generateTeam(rng, 'A', 'AWY', { strength: 0.55 });
  const res = simulateGame(home, away, { seed: rng.nextU32(), record: true });
  for (const p of res.log) {
    const rp = p.replay;
    if (!rp || (p.kind !== 'run' && p.kind !== 'pass')) continue;
    const F = rp.frames;
    const n = rp.players.length;
    const speedAt = (k: number, i: number) => {
      const a = F[Math.max(0, k - 1)].agents;
      const b = F[Math.min(F.length - 1, k + 1)].agents;
      const dt = F[Math.min(F.length - 1, k + 1)].t - F[Math.max(0, k - 1)].t || 0.1;
      return Math.hypot(b[i * 3] - a[i * 3], b[i * 3 + 1] - a[i * 3 + 1]) / dt;
    };
    const frameAt = (t: number) => {
      let k = 0;
      while (k < F.length - 1 && F[k].t < t) k++;
      return k;
    };
    for (let i = 0; i < n; i++) {
      const grp = GROUP[rp.players[i].slot];
      if (!grp) continue;
      let vmax = 0;
      let amax = 0;
      for (let k = 1; k < F.length - 1; k++) vmax = Math.max(vmax, speedAt(k, i));
      for (let k = 2; k < F.length - 2; k++) {
        const dt = F[k + 1].t - F[k - 1].t || 0.2;
        amax = Math.max(amax, (speedAt(k + 1, i) - speedAt(k - 1, i)) / dt);
      }
      if (vmax > 2) {
        (maxSpeed[grp] ??= []).push(vmax);
        (maxSpeed[`${grp}:${p.kind}`] ??= []).push(vmax);
      }
      if (vmax > 3) (maxAccel[grp] ??= []).push(Math.min(amax, 12));
    }
    const los = rp.los;
    const qbI = rp.players.findIndex((pl) => pl.slot === 'QB');
    const ev = rp.events;
    const throwE = ev.find((e) => e.type === 'throw' || e.type === 'throwaway');
    const sackE = ev.find((e) => e.type === 'sack');
    if (p.kind === 'pass' && !p.stats?.scramble) {
      dropbacks++;
      if (throwE) ttt.push(throwE.t);
      const end = throwE?.t ?? sackE?.t ?? F[F.length - 1].t;
      // From 0.5 s, as in the real-data extraction (under center the nose starts close).
      for (let k = frameAt(0.5); k < F.length && F[k].t <= end; k++) {
        const ag = F[k].agents;
        const qx = ag[qbI * 3];
        const qy = ag[qbI * 3 + 1];
        let near = false;
        for (let i = 0; i < n; i++) if (rp.players[i].team === 'D' && Math.hypot(ag[i * 3] - qx, ag[i * 3 + 1] - qy) < 2) near = true;
        if (near) {
          pressured++;
          pressureT.push(F[k].t);
          break;
        }
      }
      if (end > 2.5) {
        const k = frameAt(2.5);
        const ol = rp.players.map((pl, i) => [pl, i] as const).filter(([pl]) => GROUP[pl.slot] === 'OL');
        pocket.push(mean(ol.map(([, i]) => los - F[k].agents[i * 3])));
      }
      if (throwE) {
        const k = frameAt(throwE.t);
        rp.players.forEach((pl, i) => {
          if (GROUP[pl.slot] === 'WR') wrAtThrow.push(speedAt(k, i));
        });
      }
      const k05 = frameAt(0.5);
      const k10 = frameAt(1.0);
      rp.players.forEach((pl, i) => {
        if (GROUP[pl.slot] !== 'DL') return;
        dl05.push(speedAt(k05, i));
        dl10.push(los - F[k10].agents[i * 3]);
      });
      if (p.stats?.separation !== undefined && p.stats.attempted && !p.stats.throwaway) sep.push(p.stats.separation);
    }
    if (p.kind === 'run') {
      const ho = ev.find((e) => e.type === 'handoff');
      const ci = ho?.b ?? ho?.a;
      if (ho && ci !== undefined) {
        for (const f of F) {
          if (f.t < ho.t) continue;
          if (f.agents[ci * 3] >= los) {
            toLos.push(f.t);
            break;
          }
        }
      }
    }
  }
}

const mph = (v: number) => ((v * 3600) / 1760).toFixed(1);
const row = (name: string, sim: string, nfl: string) => console.log(`${name.padEnd(34)} ${sim.padStart(24)}   ${nfl}`);
console.log(`${'metric'.padEnd(34)} ${'sim'.padStart(24)}   NFL 2017 (BDB)`);
for (const g of ['WR:pass', 'WR:run', 'CB:pass', 'CB:run', 'S:pass', 'S:run', 'LB:pass', 'LB:run', 'RB:pass', 'RB:run', 'TE:pass', 'TE:run', 'DL:pass', 'DL:run', 'OL:pass', 'OL:run', 'QB']) {
  const s = maxSpeed[g] ?? [];
  const r = real.tracking.maxSpeedPerPlay[g];
  row(`max speed/play ${g} (mph p50/p90/max)`, `${mph(quant(s, 0.5))} / ${mph(quant(s, 0.9))} / ${mph(quant(s, 1))}`, r ? `${r.p50mph} / ${r.p90mph} / ${r.maxMph}` : '—');
}
for (const g of ['WR', 'CB', 'RB', 'LB', 'DL', 'OL']) {
  const s = maxAccel[g] ?? [];
  const r = real.tracking.maxAccelPerPlay[g];
  row(`max accel/play ${g} (yd/s² p50/p90)`, `${quant(s, 0.5).toFixed(2)} / ${quant(s, 0.9).toFixed(2)}`, r ? `${r.p50} / ${r.p90}` : '—');
}
const t = real.tracking;
row('time to throw (p50 / mean)', `${quant(ttt, 0.5).toFixed(2)} / ${mean(ttt).toFixed(2)}`, `${t.timeToThrow.p50} / ${t.timeToThrow.mean}`);
row('defender within 2 yd of QB', `${((100 * pressured) / dropbacks).toFixed(1)}%`, `${t.pressure.defenderWithin2ydPct}%`);
row('time to that pressure (p50)', `${quant(pressureT, 0.5).toFixed(2)}`, `${t.pressure.timeToPressure.p50}`);
row('pocket depth at 2.5 s (p50)', `${quant(pocket, 0.5).toFixed(2)}`, `${t.pocketDepthAt2_5s.p50}`);
row('WR speed at throw (p50 / p90)', `${quant(wrAtThrow, 0.5).toFixed(2)} / ${quant(wrAtThrow, 0.9).toFixed(2)}`, `${t.wrSpeedAtThrow.p50} / ${t.wrSpeedAtThrow.p90}`);
row('DL speed at 0.5 s (p50 / p90)', `${quant(dl05, 0.5).toFixed(2)} / ${quant(dl05, 0.9).toFixed(2)}`, `${t.dlSpeedAt0_5s.p50} / ${t.dlSpeedAt0_5s.p90}`);
row('DL depth past LOS at 1.0 s (p50)', `${quant(dl10, 0.5).toFixed(2)}`, `${t.dlDepthAt1_0s.p50}`);
row('run: time to reach LOS (p50)', `${quant(toLos, 0.5).toFixed(2)}`, `${t.runTimeToLos.p50}`);
row('separation at arrival (mean, all)', `${mean(sep).toFixed(2)}`, `${t.separationAtArrival.mean}`);
