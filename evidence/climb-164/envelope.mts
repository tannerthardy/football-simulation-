// #164: the locomotion envelope for one climber, per tick, before each World step.
// argv: worktree seed index slot t0 t1
import { readFileSync } from 'node:fs';
const [W, seed, idxS, SL] = process.argv.slice(2);
const t0 = Number(process.argv[6]), t1 = Number(process.argv[7]);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const K = await import(`${W}/src/physics/kinematics.ts`);
const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
const sim: any = new PlaySim(restoreSetup(Buffer.from(snaps[Number(idxS)].setup, 'base64')));
const a = sim.offense.find((o: any) => o.slot === SL), i = sim.agents.indexOf(a), b = a.body, p = b.profile, dir = sim.attackDir('O');
console.log(`${SL} mass ${sim.world.mass[i].toFixed(1)} vmax ${p.vmax} tau ${p.tau} lateral ${p.lateral} brake ${p.brake} turnRate ${p.turnRate}`);
const step = sim.world.step.bind(sim.world);
const f = (v: number) => v.toFixed(2);
sim.world.step = (intents: any[], dt: number) => {
  const it = intents[i];
  let line = '';
  if (it && sim.t >= t0 - 1e-9 && sim.t <= t1 + 1e-9) {
    const v = b.vel, speed = Math.hypot(v.x, v.y), fat = K.fatigueFactor(b.energy);
    const start = p.vmax * fat * K.enduranceFactor(b);
    const heading = Math.atan2(it.vel.y, it.vel.x);
    const full = start * K.directionalSpeedFactor(p, ((heading - b.facing + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    const dmag = Math.hypot(it.vel.x, it.vel.y), cap = Math.min(dmag, full * (it.effort ?? 1));
    const des = dmag > 0 ? { x: it.vel.x / dmag * cap, y: it.vel.y / dmag * cap } : { x: 0, y: 0 };
    const dvx = des.x - v.x, dvy = des.y - v.y;
    const tx = speed > 1e-9 ? v.x / speed : 1, ty = speed > 1e-9 ? v.y / speed : 0;
    const at = (dvx * tx + dvy * ty) / dt, an = (dvx * -ty + dvy * tx) / dt;
    const At = Math.max(K.driveAccel(p, speed, p.vmax * fat) * fat, 0.01);
    const An = p.lateral * (it.cutSkill ?? 1) * (1 - 0.2 * Math.min(1, speed / p.vmax)) * (0.85 + 0.15 * fat);
    const iso = Math.max(K.driveAccel(p, speed, Math.max(cap, 0.5)) * fat * (cap > 0 && cap < start ? start / Math.max(cap, 0.5) : 1), p.brake * 0.5);
    const acc = K.locomotionAccel(b, it, dt, 1);
    const along = (acc.x * des.x + acc.y * des.y) / Math.max(cap, 1e-9);
    const hv = Math.atan2(v.y, v.x); line = `${f(sim.t)} v ${f(speed)} velHd ${(hv*57.3).toFixed(0)} reqHd ${(heading*57.3).toFixed(0)} fwd ${f(v.x * dir)} face ${(b.facing * 57.3 * 1).toFixed(0)} req ${f(dmag)}->cap ${f(cap)} | wantAt ${f(at)} wantAn ${f(an)} | At ${f(At)} An ${f(An)} | loco |a| ${f(Math.hypot(acc.x, acc.y))} toward-desired ${f(along)} | isotropic-cap ${f(iso)}`;
  }
  const rep = step(intents, dt);
  if (line) {
    const gI = rep.groundImpulse[i], m = sim.world.mass[i];
    const cs = rep.contacts.filter((c: any) => c.i === i || c.j === i).map((c: any) => `${sim.agents[c.i === i ? c.j : c.i].slot}:${f(c.impulse / dt / m)}`);
    console.log(line, `| ground ${f(Math.hypot(gI.x, gI.y) / dt / m)} of ${f(rep.groundImpulseLimit[i] / dt / m)} yd/s² | contact ${cs.join(' ')}`);
  }
  return rep;
};
sim.run();
