// Counter pullers on one captured snap: every 0.1 s, the waypoint index and point, requested speed (his MoveCommand),
// achieved speed, heading of request vs travel, and the plan target's position. argv: worktree seed index
import { readFileSync } from 'node:fs';
const W = process.argv[2], seed = process.argv[3], idx = Number(process.argv[4]);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
const sim = new PlaySim(restoreSetup(Buffer.from(snaps[idx].setup, 'base64')));
const los = sim.los, r = (v: number) => v.toFixed(2);
const pullers = sim.offense.filter((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'pull');
const req = new Map<any, any>();
for (const a of pullers) { const b: any = a.behavior, up = b.update.bind(b); b.update = (ag: any, s: any) => { const c = up(ag, s); req.set(ag, c); return c; }; }
for (const a of pullers) { const p: any = (a.behavior as any).plan; console.log(a.slot, p.pullRole, 'tgt', p.target?.slot, 'path', JSON.stringify(p.pullPath.map((w: any) => [r(w.x - los), r(w.y)]))); }
const tick = sim.tick.bind(sim); let n = 0;
sim.tick = () => { tick(); if (++n % 2 === 0 && sim.t <= 3.05) {
  const cells = pullers.map((a: any) => { const b: any = a.behavior, p = b.plan, c = req.get(a), wp = p.pullPath?.[b.pullIdx];
    const rv = c?.vel ? Math.hypot(c.vel.x, c.vel.y) : NaN, rh = c?.vel ? Math.atan2(c.vel.x, c.vel.y) * 57.3 : NaN, gh = Math.atan2(a.vel.x, a.vel.y) * 57.3;
    const t = p.target; return `${a.slot} (${r(a.pos.x - los)},${r(a.pos.y)}) i${b.pullIdx}${wp ? `>(${r(wp.x - los)},${r(wp.y)})` : '>-'} req ${r(rv)} got ${r(Math.hypot(a.vel.x, a.vel.y))} hdg r${rh.toFixed(0)}/g${gh.toFixed(0)} ${p.kind}${a.engagement ? ' ENG' : ''} t:${t?.slot}(${t ? r(t.pos.x - los) : ''},${t ? r(t.pos.y) : ''})`; });
  console.log(r(sim.t), cells.join(' | '));
} };
sim.run();
