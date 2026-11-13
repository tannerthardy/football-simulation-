// Pursuit aim jumps (TKL-2, Stage 4; diagnosis only). Restage each saved play once per
// defender with the selected-actor command trace from the first non-QB carrier to the
// end, and keep every step where that defender's chase ran pursuitPoint on the carrier.
// Each row holds the chooser's inputs (pursuer state, consumed picture, forecast,
// request, horizon, radius) and the sampled slack curve, so jumps can be re-run
// offline by substitution (attribute.ts). Restaging is checked against the untraced run.
//   node --import tsx scripts/diag/aim-jump/scan.ts setups.bin out.jsonl [maxPlays]
import { readFileSync, writeFileSync } from 'node:fs';
import { deserialize } from 'node:v8';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';
const [setupsPath, out, maxPlays] = process.argv.slice(2);
const plays = (deserialize(readFileSync(setupsPath)) as any[]).slice(0, Number(maxPlays ?? 1e9));
const lines: string[] = [];
const profiles: Record<string, any> = {};
let mismatched = 0, traced = 0;
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const v3 = (v: any) => ({ x: r3(v.x), y: r3(v.y) });
for (const p of plays) {
  // Untraced run: the carrier window and the result to check restaging against.
  const base: any = new PlaySim(restoreSetup(p.setup) as any);
  let from: number | null = null;
  const tick0 = base.tick.bind(base);
  base.tick = () => { tick0(); const c = base.carrier;
    if (from === null && c && c.team === 'O' && base.ball.kind === 'held' && c.slot !== 'QB') from = base.t; };
  const res0 = base.run();
  if (from === null) continue;
  const end = base.t + 0.05;
  for (const d of base.defense as any[]) {
    const sim: any = new PlaySim(restoreSetup(p.setup) as any);
    const trace = sim.recordCommands({ actor: { team: 'D', slot: d.slot }, from: Math.max(0, from - 0.3), to: end });
    const truth = new Map<number, any>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => { const t = sim.t, c = sim.carrier;
      if (c && c.team === 'O' && sim.ball.kind === 'held' && c.slot !== 'QB')
        truth.set(Math.round(t * 1000), { id: c.player.id, slot: c.slot, pos: v3(c.pos), vel: v3(c.vel) });
      tick(); };
    const res = sim.run();
    traced++;
    if (res.yards !== res0.yards || sim.t !== base.t) { mismatched++; continue; }
    const me = sim.defense.find((x: any) => x.slot === d.slot);
    profiles[`${p.seed}:${p.game}:${p.index}:${d.slot}`] = me.profile;
    for (const s of trace.steps as any[]) {
      const key = Math.round(s.stepStart * 1000), c = truth.get(key);
      if (!c) continue;
      const pr = (s.pursuit ?? []).filter((x: any) => x.target.playerId === c.id);
      const ch = pr.filter((x: any) => x.data.kind === 'chase').at(-1)?.data;
      const ip = pr.filter((x: any) => x.data.kind === 'intercept').at(-1)?.data;
      const body = s.start.body;
      const row: any = { k: `${p.seed}:${p.game}:${p.index}`, slot: d.slot, t: r3(s.stepStart), c,
        pos: v3(body.position), vel: v3(body.velocity), planner: ch?.planner ?? null, dist: ch ? r3(ch.distance) : null,
        gather: ch ? r3(ch.gather) : null, horizon: ch?.requestedHorizon ?? null,
        final: s.final ? v3(s.final.vel) : null, owner: s.decision?.owner?.controller ?? null };
      if (ip) {
        const e = ip.prediction.estimate, f = ip.forecast;
        Object.assign(row, { ipT: r3(ip.prediction.t), status: e.status === 'estimated-feasible' ? 'F' : 'B', radius: r3(e.radius),
          horizonIp: e.horizon, req: e.request ? { speed: e.request.speed, effort: e.request.effort } : null,
          scale: ip.pursuer.speedScale ?? 1, mpos: v3(ip.pursuer.position), mvel: v3(ip.pursuer.velocity),
          seen: { pos: v3(ip.observed.pos), vel: v3(ip.observed.vel) }, older: { vel: v3(ip.older.vel) },
          fc: { h: v3(f.heading), sp: r3(f.initialSpeed), acc: r3(f.acceleration), V: r3(f.relaxedSpeed), tau: r3(f.relaxationTime) },
          bias: r3(ip.timeBias), biasedT: r3(ip.biasedTime), aim: v3(ip.steeringPoint), lev: r3(ip.leverage),
          slack: (ip.prediction.samples ?? []).map((q: any) => r3(q.slack)) });
      }
      lines.push(JSON.stringify(row));
    }
  }
  process.stderr.write(`${p.seed}:${p.game}:${p.index} rows ${lines.length}\n`);
}
writeFileSync(out, lines.join('\n') + '\n');
writeFileSync(out.replace(/\.jsonl$/, '') + '.profiles.json', JSON.stringify(profiles));
process.stderr.write(`traced ${traced} defender restages, ${mismatched} did not match the untraced run; ${lines.length} rows -> ${out}\n`);
