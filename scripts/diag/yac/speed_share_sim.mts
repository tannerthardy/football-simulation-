/** Sim side of speed_share.py: every scrimmage play's 22 positions every 0.1 s (rounded to 0.1 yd), each player's name|jersey key and top speed, the speed his controller
 * REQUESTED (|sim.intents vel|) each tick, and the catch / throw events with the receiver's index.
 *   node --import tsx scripts/diag/yac/speed_share_sim.mts [--seed 101] [--games 16] [--out out/speedshare/sim.jsonl.gz] */
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createGzip } from 'node:zlib';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '16')), out = arg('--out', 'out/speedshare/sim.jsonl.gz');
mkdirSync(dirname(out), { recursive: true });
const gz = createGzip(); const done = new Promise<void>(r => gz.pipe(createWriteStream(out)).on('finish', () => r()));
const r1 = (v: number) => Math.round(v * 10) / 10, r2 = (v: number) => Math.round(v * 100) / 100;
type Rec = { sim: any; xy: number[][]; req: number[][]; last: number };
const recs = new Map<object, Rec>();
const proto = PlaySim.prototype as unknown as { tick: () => void };
const tick = proto.tick;
proto.tick = function (this: any) {
  tick.call(this);
  if (this.phase !== 'live') return;
  let rec = recs.get(this); if (!rec) { rec = { sim: this, xy: [], req: [], last: -1 }; recs.set(this, rec); }
  const k = Math.floor(this.t * 10 + 1e-6); if (k === rec.last) return; rec.last = k;
  const xy: number[] = [], rq: number[] = [];
  for (const a of this.agents) { xy.push(r1(a.pos.x), r1(a.pos.y)); const v = this.intents[a.idx]?.vel; rq.push(r2(Math.hypot(v?.x ?? 0, v?.y ?? 0))); }
  rec.xy.push(xy); rec.req.push(rq);
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let n = 0;
for (let g = 0; g < games; g++) {
  recs.clear();
  simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true, handContact: 'center' } as never);
  let i = 0;
  for (const r of recs.values()) {
    const s = r.sim; if (s.offCall.kind !== 'run' && s.offCall.kind !== 'pass') continue;
    const ev = s.events as { t: number; type: string; a?: number; b?: number }[];
    const catchE = ev.find(e => e.type === 'catch'), throwE = ev.find(e => e.type === 'throw');
    gz.write(JSON.stringify({ id: `S${seed + g}-${i++}`, kind: s.offCall.kind, dt: 0.1, side: s.agents.map((a: any) => a.team), slot: s.agents.map((a: any) => a.slot), pos: s.agents.map((a: any) => a.player.position),
      key: s.agents.map((a: any) => `${a.player.name}|${a.player.jersey}`), vmax: s.agents.map((a: any) => r2(a.profile.vmax)), xy: r.xy, req: r.req,
      events: { catch: catchE?.t, pass_forward: throwE?.t }, receiver: catchE?.a ?? null }) + '\n'); n++;
  }
  console.error(`game ${g + 1}/${games}`);
}
gz.end(); await done; console.error(`${n} plays -> ${out}`);
