import { Rng } from '../../src/core/rng.js';
import { generatePlayer } from '../../src/players/generator.js';
import { derivePhysical } from '../../src/players/physical.js';
const rng = new Rng(4);
const mph = (v: number) => (v * 3600) / 1760;
for (const pos of ['WR', 'CB', 'RB', 'S', 'LB', 'TE', 'EDGE', 'QB', 'DT', 'OT', 'OG'] as const) {
  const vs: number[] = [], taus: number[] = [], t10: number[] = [], forty: number[] = [];
  for (let i = 0; i < 300; i++) {
    const p = generatePlayer(rng, pos as any, { quality: 0.55 });
    const ph = derivePhysical(p);
    vs.push(ph.vmax); taus.push(ph.tau); forty.push(p.measurables.forty);
    // time to cover 10 yards from rest under v(t)=V(1-e^{-t/tau})
    let t = 0, d = 0;
    while (d < 10) { t += 0.001; d += ph.vmax * (1 - Math.exp(-t / ph.tau)) * 0.001; }
    t10.push(t);
  }
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const p95 = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(0.95 * a.length)];
  console.log(pos.padEnd(5), `40 ${avg(forty).toFixed(2)}  vmax ${avg(vs).toFixed(2)} yd/s = ${mph(avg(vs)).toFixed(1)} mph (p95 ${mph(p95(vs)).toFixed(1)})  tau ${avg(taus).toFixed(2)}  10yd ${avg(t10).toFixed(2)}s`);
}
