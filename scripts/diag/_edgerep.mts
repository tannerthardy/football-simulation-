/** Edge pass reps: LT/RT engaged with a rusher at or outside him, on dropbacks of the captures. Per 0.5 s bin after the
 * snap: tackle depth, his requested and achieved retreat speed (yd/s, + = toward his own goal), his set-depth target vs
 * QB depth, whether PASS_KICK's ride is active, the rusher's depth, requested and achieved upfield speed, and push.
 * usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const B = new Map<number, any[]>();
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (!p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const dirx = sim.attackDir(sim.offense[0].team), depth = (a: any) => (sim.los - a.pos.x) * dirx;
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0();
    if (sim.throwAt >= 0 || sim.scrambled || sim.carrier !== sim.qb) return;
    for (const s of ['LT', 'RT']) {
      const b = sim.slot(s), e = b?.engagement; if (!e || e.type !== 'pass' || e.blocker !== b) continue;
      const d = e.defender, side = Math.sign(b.pos.y - sim.qb.pos.y) || 1;
      if ((d.pos.y - b.pos.y) * side < -0.5) continue;
      const bi = sim.intents[b.idx]?.vel ?? { x: 0, y: 0 }, di = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 };
      const bin = Math.floor(sim.t / 0.5) * 0.5; if (bin > 3.5) continue;
      (B.get(bin) ?? B.set(bin, []).get(bin)!).push({
        td: depth(b), rd: depth(d), qd: depth(sim.qb),
        bReq: -bi.x * dirx, bAch: -b.vel.x * dirx, dReq: -di.x * dirx, dAch: -d.vel.x * dirx,
        set: (b.passSet?.depth ?? NaN), move: e.move, push: sim.intents[d.idx]?.push ?? 0,
        ...(() => { const w: any = sim.world, i = w.bodies.indexOf(b.body), rep = w.report, m = b.profile.massKg, j = e.hands;
          const g = rep?.groundImpulse?.[i]; const back = (v: any) => v ? -v.x * dirx : 0;
          // hand joint forces on the blocker: World stores normal/tangent magnitudes; take direction from the pair geometry
          const L = Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) || 1, nx = (b.pos.x - d.pos.x) / L, ny = (b.pos.y - d.pos.y) / L;
          return { leg: back(g) / (m * sim.dt), hn: (j?.normalForce ?? 0) * (-nx * dirx) / m, ht: Math.abs(j?.tangentForce ?? 0) / m, ctl: e.control,
            dvBack: (-(b.vel.x) * dirx) }; })() });
    }
  };
  sim.run();
}
const q = (v: number[], f = .5) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
console.log('force columns: per unit mass, yd/s^2, + = pushing him back toward his own goal; ctl + = blocker controls');
console.log('bin  n    | tackle depth  req/ach retreat | rusher depth  req/ach depth speed | QB depth | tackle gap to QB depth');
for (const [bin, z] of [...B].sort((a, b) => a[0] - b[0]))
  console.log(`${bin.toFixed(1)} ${String(z.length).padStart(5)} | ${q(z.map(r => r.td)).toFixed(2).padStart(5)}  ${q(z.map(r => r.bReq)).toFixed(2)}/${q(z.map(r => r.bAch)).toFixed(2)} | ${q(z.map(r => r.rd)).toFixed(2).padStart(5)}  ${q(z.map(r => r.dReq)).toFixed(2)}/${q(z.map(r => r.dAch)).toFixed(2)} | ${q(z.map(r => r.qd)).toFixed(2)} | ${q(z.map(r => r.qd - r.td)).toFixed(2)} | legs ${q(z.map(r => r.leg)).toFixed(1)} hand push ${q(z.map(r => r.hn)).toFixed(1)} hand tangent |${q(z.map(r => r.ht)).toFixed(1)}| ctl ${q(z.map(r => r.ctl)).toFixed(2)}`);
