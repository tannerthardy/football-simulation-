/** Open-field turning, sim side: positions every 0.1 s for all 22 players of scrimmage plays (the same quantization as the common format), with the
 * velocity each was REQUESTED that tick (sim.intents), so a request that asks for less speed is not counted as a turn cost. Read by turn_cost.py.
 *   node --import tsx scripts/diag/route-speed/turn_cost_sim.mts [--seed 101] [--games 16] [--out out/turncost/sim.jsonl.gz] */
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createGzip } from 'node:zlib';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '16')), out = arg('--out', 'out/turncost/sim.jsonl.gz');
mkdirSync(dirname(out), { recursive: true });
const gz = createGzip(); const done = new Promise<void>(r => gz.pipe(createWriteStream(out)).on('finish', () => r()));
const r1 = (v: number) => Math.round(v * 10) / 10, r2 = (v: number) => Math.round(v * 100) / 100;
type Rec = { xy: number[][]; req: number[][]; side: string[]; kind: string; last: number };
const recs = new Map<object, Rec>();
const proto = PlaySim.prototype as unknown as { tick: () => void };
const tick = proto.tick;
proto.tick = function (this: any) {
  tick.call(this);
  if (this.phase !== 'live' && this.phase !== 'dead') return;
  let rec = recs.get(this);
  if (!rec) { rec = { xy: [], req: [], side: this.agents.map((a: any) => a.team), kind: this.offCall.kind, last: -1 }; recs.set(this, rec); }
  const k = Math.floor(this.t * 10 + 1e-6);
  if (k === rec.last || this.phase === 'dead') return;
  rec.last = k;
  const xy: number[] = [], rq: number[] = [];
  for (const a of this.agents) { xy.push(r1(a.pos.x), r1(a.pos.y)); const v = this.intents[a.idx]?.vel; rq.push(r2(v?.x ?? 0), r2(v?.y ?? 0)); }
  rec.xy.push(xy); rec.req.push(rq);
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let n = 0;
for (let g = 0; g < games; g++) {
  recs.clear();
  simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true, handContact: 'center' } as never);
  let i = 0;
  for (const r of recs.values()) { if (r.kind !== 'run' && r.kind !== 'pass') continue; gz.write(JSON.stringify({ id: `S${seed + g}-${i++}`, kind: r.kind, dt: 0.1, side: r.side, xy: r.xy, req: r.req }) + '\n'); n++; }
  console.error(`game ${g + 1}/${games}`);
}
gz.end(); await done; console.error(`${n} plays -> ${out}`);
