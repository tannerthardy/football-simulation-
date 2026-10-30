import { Rng } from '/home/user/fs-v3c/src/core/rng.js';
import { simulateGame } from '/home/user/fs-v3c/src/game/game.js';
import { generateTeam } from '/home/user/fs-v3c/src/league/team.js';
const rows: any[] = [];
const hooks = { playResult: (sim: any) => {
  if (!sim.isPass) return sim.run();
  const was = new Map<any, number>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    if (sim.throwAt >= 0 || sim.carrier !== sim.qb || sim.scrambled) return;
    const dir = sim.attackDir('O'), qb = sim.qb;
    for (const d of sim.defense) {
      if (d.behavior?.kind !== 'rush' || !/^(DE|EDGE|OLB)/.test(d.slot)) continue;
      if (d.engagement) { was.set(d, sim.t); continue; }
      const rel = was.get(d); if (rel === undefined || sim.t - rel > .5 + 1e-9 || sim.t - rel < .05) continue;
      const it = sim.intents[d.idx]?.vel; if (!it) continue;
      const gx = qb.pos.x - d.pos.x, gy = qb.pos.y - d.pos.y, g = Math.hypot(gx, gy) || 1, s = Math.hypot(it.x, it.y) || 1;
      const branch = (d.pos.x - sim.los) * dir > -0.5 ? 'lane' : (d.pos.x - qb.pos.x) * dir > 1.0 ? 'arc' : 'pursuit';
      rows.push({ branch, ask: (it.x * gx + it.y * gy) / g, askCos: (it.x * gx + it.y * gy) / (g * s), vel: (d.vel.x * gx + d.vel.y * gy) / g, depthVsQb: (d.pos.x - qb.pos.x) * dir, wide: Math.abs(d.pos.y - qb.pos.y), dist: g, plan: d.behavior.plan });
    }
  };
  return sim.run(); } };
for (const seed of [301, 302]) { const rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  simulateGame(home, away, { seed, hooks } as never); }
const med = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? w[Math.floor(w.length / 2)].toFixed(2) : '-'; };
console.log(`free edge rusher ticks within 0.5 s after a release, before the throw: ${rows.length}`);
for (const b of ['lane', 'arc', 'pursuit']) { const R = rows.filter(r => r.branch === b); if (!R.length) continue;
  console.log(`  ${b.padEnd(8)} ${(100 * R.length / rows.length).toFixed(0)}% | asks toward QB ${med(R.map(r => r.ask))} yd/s (cos ${med(R.map(r => r.askCos))}), moving toward QB ${med(R.map(r => r.vel))} | depth vs QB ${med(R.map(r => r.depthVsQb))} (+ shallower), wide ${med(R.map(r => r.wide))}, distance ${med(R.map(r => r.dist))} | plans ${['speed','finesse','power'].map(p => `${p} ${R.filter(r => r.plan === p).length}`).join(' ')}`); }
