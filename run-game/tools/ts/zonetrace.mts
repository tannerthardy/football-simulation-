import { Rng } from '/home/user/fs-develop/src/core/rng.js';
import { simulateGame } from '/home/user/fs-develop/src/game/game.js';
import { generateTeam } from '/home/user/fs-develop/src/league/team.js';
let shown = 0;
const hooks = { playResult: (sim: any) => {
  let d: any = null, r: any = null, lines: string[] = [];
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    if (sim.throwAt < 0 || shown >= 6) return;
    if (!d && sim.ball.kind === 'air') { r = sim.ball.target; if (!r) return;
      d = sim.defense.reduce((p: any, q: any) => Math.hypot(q.pos.x - r.pos.x, q.pos.y - r.pos.y) < Math.hypot(p.pos.x - r.pos.x, p.pos.y - r.pos.y) ? q : p);
      if (d.behavior?.kind !== 'zone' || Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y) < 2) { d = { skip: true }; return; } }
    if (!d || d.skip) return;
    const s = sim.t - sim.throwAt; if (s > 0.9) return;
    const it = sim.intents[d.idx], sup = d.body.support;
    const deg = (u: number) => (Math.atan2(Math.sin(u), Math.cos(u)) * 180 / Math.PI).toFixed(0);
    lines.push(`+${s.toFixed(2)} onBall ${d.tags.has('onBall') ? 1 : 0} ask ${Math.hypot(it.vel.x, it.vel.y).toFixed(1)}@${deg(Math.atan2(it.vel.y, it.vel.x))} face-cmd ${it.facing === undefined ? '-' : deg(it.facing)} body face ${deg(d.body.facing)} vel ${d.speed.toFixed(2)}@${deg(Math.atan2(d.vel.y, d.vel.x))} posture ${it.posture ?? '-'} effort ${it.effort ?? '-'} cut ${it.cutSkill?.toFixed?.(2) ?? '-'} sup ${sup?.state ?? '-'} lean ${sup ? Math.hypot(sup.lean.x, sup.lean.y).toFixed(2) : '-'} foot ${sup?.foot ? 1 : 0}`);
    if (s > 0.85 || sim.ball.kind !== 'air') { console.log(`--- ${d.slot} zone ${d.behavior.zone} style ${d.behavior.style}`); console.log(lines.join('\n')); shown++; d = { skip: true }; }
  };
  return sim.run(); } };
const rng = new Rng(101);
const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
simulateGame(home, away, { seed: 101, hooks } as never);
