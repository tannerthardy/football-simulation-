import { Rng } from '../../../src/core/rng.js';
import { generatePlayer } from '../../../src/players/generator.js';
import { derivePhysical } from '../../../src/players/physical.js';
const out: Record<string, { vmax: number; shuffle: number; backpedal: number; turnRate: number }> = {};
for (const [name, pos] of [['WR', 'WR'], ['TE', 'TE'], ['RB', 'RB'], ['CB', 'CB'], ['S', 'S']] as const) {
  const ps = Array.from({ length: 200 }, (_, k) => derivePhysical(generatePlayer(new Rng(500 + k), pos, { quality: 0.5 })));
  const med = (f: (p: typeof ps[number]) => number) => [...ps.map(f)].sort((a, b) => a - b)[100];
  out[name] = { vmax: med((p) => p.vmax), shuffle: med((p) => p.shuffle), backpedal: med((p) => p.backpedal), turnRate: med((p) => p.turnRate) };
}
console.log(JSON.stringify(out));
