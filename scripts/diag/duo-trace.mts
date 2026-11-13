// Duo trace for TRACK_PURSUIT (Integration, 2026-11-13): replay chosen run-set plays (out/matched-restage) and record,
// after the handoff, who first gets within 1 yd of the carrier and when (and from which side: his bearing to the
// carrier against the carrier's heading), the missed / broken tackle events with their defenders, the tackle, and the
// carrier's yards at 1.0 / 2.0 / 3.0 s after the handoff. Run once per arm and compare.
//   npm run -s ref -- node --import tsx scripts/diag/duo-trace.mts <out.jsonl> <id> [id...]     (ids like s49-92)
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [out, ...ids] = process.argv.slice(2);
const rows: string[] = [];
const r2 = (v: number) => +v.toFixed(2);
for (const id of ids) {
  const [s, i] = id.slice(1).split('-').map(Number);
  const p = JSON.parse(readFileSync(`out/matched-restage/seed${s}-run.json`, 'utf8'))[i];
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  let ho: number | null = null; const first = new Map<any, any>(); const ylds: Record<string, number> = {};
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const c = sim.carrier; if (!c) return;
    if (ho === null && c !== sim.qb) ho = sim.t;
    if (ho === null) return;
    const dir = sim.attackDir(c.team);
    for (const T of [1, 2, 3]) if (ylds[T] === undefined && sim.t >= ho + T) ylds[T] = r2((c.pos.x - sim.los) * dir);
    for (const d of sim.defense) {
      if (first.has(d)) continue;
      const dd = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
      if (dd <= 1) {
        const b = Math.atan2(d.pos.y - c.pos.y, d.pos.x - c.pos.x), h = Math.atan2(c.vel.y, c.vel.x);
        const rel = Math.abs(Math.atan2(Math.sin(b - h), Math.cos(b - h))) * 180 / Math.PI;
        first.set(d, { slot: d.slot, t: r2(sim.t - ho), side: rel < 60 ? 'front' : rel < 120 ? 'side' : 'behind', at: r2((c.pos.x - sim.los) * dir) });
      }
    }
  };
  const r = sim.run();
  const name = (k: number | undefined) => k === undefined ? null : sim.agents[k]?.slot ?? null;
  const ev = (type: string) => sim.events.filter((e: any) => e.type === type).map((e: any) => ({ t: r2(e.t - (ho ?? 0)), by: name(e.a === sim.carrier?.idx ? e.b : e.a) }));
  rows.push(JSON.stringify({ id, yards: r2(r.yards), outcome: r.outcome, ylds, arrivals: [...first.values()].sort((a, b) => a.t - b.t).slice(0, 4),
    missed: ev('missed_tackle'), broken: ev('broken_tackle'), tackle: ev('tackle').slice(0, 1) }));
}
writeFileSync(out, rows.join('\n') + '\n');
console.log(out, rows.length);
