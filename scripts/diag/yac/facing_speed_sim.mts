/** Sim side of facing_speed.py: every scrimmage pass play's 22 positions, velocities, hip facing and trunk twist every 0.1 s, each body's backpedal share, the throw time.
 *   node --import tsx scripts/diag/yac/facing_speed_sim.mts [--seed 101] [--games 16] [--out out/dircap/sim.jsonl.gz] */
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createGzip } from 'node:zlib';
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '16')), out = arg('--out', 'out/dircap/sim.jsonl.gz');
mkdirSync(dirname(out), { recursive: true });
const gz = createGzip(); const done = new Promise<void>(r => gz.pipe(createWriteStream(out)).on('finish', () => r()));
const r2 = (v: number) => Math.round(v * 100) / 100, r3 = (v: number) => Math.round(v * 1000) / 1000;
type Rec = { sim: any; rows: number[][]; last: number };
const recs = new Map<object, Rec>();
const proto = PlaySim.prototype as unknown as { tick: () => void };
const tick = proto.tick;
proto.tick = function (this: any) {
  tick.call(this);
  if (this.phase !== 'live') return;
  let rec = recs.get(this); if (!rec) { rec = { sim: this, rows: [], last: -1 }; recs.set(this, rec); }
  const k = Math.floor(this.t * 10 + 1e-6); if (k === rec.last) return; rec.last = k;
  const row: number[] = [];
  for (const a of this.agents) { const q = this.intents[a.idx]?.vel; row.push(r2(a.pos.x), r2(a.pos.y), r2(a.vel.x), r2(a.vel.y), r3(a.body.facing), r3(a.body.trunk ?? 0), r2(q?.x ?? 0), r2(q?.y ?? 0)); }
  rec.rows.push(row);
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let n = 0;
for (let g = 0; g < games; g++) {
  recs.clear();
  simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: true, handContact: 'center' } as never);
  let i = 0;
  for (const r of recs.values()) {
    const s = r.sim; if (s.offCall.kind !== 'pass') continue;
    const ev = s.events as { t: number; type: string }[]; const throwE = ev.find(e => e.type === 'throw');
    gz.write(JSON.stringify({ id: `S${seed + g}-${i++}`, side: s.agents.map((a: any) => a.team), slot: s.agents.map((a: any) => a.slot), pos: s.agents.map((a: any) => a.player.position),
      key: s.agents.map((a: any) => `${a.player.name}|${a.player.jersey}`), vmax: s.agents.map((a: any) => r2(a.profile.vmax)), back: s.agents.map((a: any) => r3(a.profile.backpedal)),
      rows: r.rows, throw: throwE?.t ?? null }) + '\n'); n++;
  }
  console.error(`game ${g + 1}/${games}`);
}
gz.end(); await done; console.error(`${n} pass plays -> ${out}`);
