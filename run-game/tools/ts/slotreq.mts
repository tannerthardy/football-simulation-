// One captured snap, one offensive slot: every 0.1 s pos, requested vs achieved velocity (speed, heading),
// plan kind, target slot and its position, engagement, blocker's trace notes. argv: worktree seed index slot [t0 t1]
import { readFileSync } from 'node:fs';
const W = process.argv[2], seed = process.argv[3], idx = Number(process.argv[4]), SL = process.argv[5];
const t0 = Number(process.argv[6] ?? 0.8), t1 = Number(process.argv[7] ?? 3.0);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
const sim: any = new PlaySim(restoreSetup(Buffer.from(snaps[idx].setup, 'base64')));
const los = sim.los, dir = sim.attackDir('O'), r = (v: number) => v.toFixed(2);
const a = sim.offense.find((o: any) => o.slot === SL); const b: any = a.behavior; let req: any = null;
const up = b.update.bind(b); b.update = (ag: any, s: any) => { const c = up(ag, s); req = c; return c; };
console.log(SL, b.constructor.name, 'plan', b.plan?.kind, 'tgt', b.plan?.target?.slot, 'job', b.job ?? '');
const deg = (x: number, y: number) => (Math.atan2(y, x * dir) * 57.3).toFixed(0);
const bs = sim.blockingSink.bind(sim);
sim.blockingSink = (ag: any) => { const real = bs(ag); if (ag !== a) return real; return { blockingState: (x: any) => real?.blockingState(x) ?? { target: b.plan?.target, kind: b.plan?.kind }, blockingChange: (x: any, prev: any, reason: string, s2: any) => { console.log('   CHANGE', sim.t.toFixed(2), reason, 'prev', prev?.target?.slot, '->', b.plan?.target?.slot, b.plan?.kind, new Error().stack.split('\n')[2].trim()); real?.blockingChange(x, prev, reason, s2); } }; };
const tick = sim.tick.bind(sim); let n = 0;
sim.tick = () => { tick(); if (++n % 2 || sim.t < t0 - 1e-6 || sim.t > t1 + 1e-6) return;
  const p = b.plan, t = p?.target, v = req?.vel; const c = sim.carrier;
  console.log(r(sim.t), `(${r((a.pos.x - los) * dir)},${r(a.pos.y)}) req ${v ? r(Math.hypot(v.x, v.y)) + '@' + deg(v.x, v.y) : '-'} got ${r(Math.hypot(a.vel.x, a.vel.y))}@${deg(a.vel.x, a.vel.y)} ${p?.kind} t:${t?.slot ?? '-'}${t ? `(${r((t.pos.x - los) * dir)},${r(t.pos.y)}) d${r(Math.hypot(t.pos.x - a.pos.x, t.pos.y - a.pos.y))}${t.engagement ? ' tENG' : ''}` : ''}${a.engagement ? ' ENG ' + a.engagement.defender?.slot : ''} car(${c ? r((c.pos.x - los) * dir) + ',' + r(c.pos.y) : ''})`); };
sim.run();
