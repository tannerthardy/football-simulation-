import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { releaseBelief } from '../../../src/sim/release-belief.js';
const [cov, r, s] = [process.argv[2] ?? 'cover4', Number(process.argv[3] ?? 3), Number(process.argv[4] ?? 3)];
const sim: any = new PlaySim(nativeTraceSetup({ coverage: cov, concept: 'drive', seed: s, roster: r, formation: 'gun_doubles_11', flip: false }));
const dir = sim.attackDir(sim.offense[0].team);
const W = ['LB_W', 'LB_M'].map((k) => sim.defense.find((d: any) => d.slot === k));
let thrT = -1; const t0 = sim.tick.bind(sim);
sim.tick = () => { t0();
  if (sim.ball.kind === 'air' && thrT < 0) thrT = sim.t;
  if (thrT >= 0 && sim.t - thrT <= 1.2 && Math.round((sim.t - thrT) / 0.05) % 3 === 0) for (const d of W) {
    const rb = releaseBelief(sim, d), b = d.behavior, q = sim.qb;
    const toQB = Math.atan2(q.pos.y - d.pos.y, q.pos.x - d.pos.x); let off = Math.abs(((d.facing - toQB) * 180 / Math.PI + 540) % 360 - 180);
    console.log(`${(sim.t - thrT).toFixed(2)} ${d.slot} ${b.constructor.name}:${b.job ?? ''} sub ${b.sub?.constructor?.name} depth ${((d.pos.x - sim.los) * dir).toFixed(1)} v ${(d.vel.x * dir).toFixed(1)},${d.vel.y.toFixed(1)} facing-off-QB ${off.toFixed(0)} | rb loading ${rb.loadingAt?.toFixed(2)} released ${rb.releasedAt?.toFixed(2)} ball ${rb.ballAt?.toFixed(2)} src ${rb.source} | tags ${[...d.tags].join(',')}`);
  } };
sim.run();
