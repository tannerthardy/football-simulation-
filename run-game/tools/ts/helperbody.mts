import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { availability, supportParams } = await import(root + '/src/physics/support.js');
const { playSideSign } = await import(root + '/src/sim/behaviors/blocking.ts');
const { fatigueFactor } = await import(root + '/src/physics/kinematics.js');
const sets = process.argv.slice(2).flatMap(f => deserialize(readFileSync(f)) as any[]);
const S: Record<string, any> = {};
const add = (k: string, who: any, e: any, sim: any, dir: number) => {
  const a = (S[k] ??= { n: 0, reqUp: 0, reqLat: 0, achUp: 0, gUp: 0, gLat: 0, avail: 0, facingOff: 0, contactLat: 0 });
  const it = sim.intents?.[who.idx]; if (!it) return;
  const g = sim.lastStep.groundImpulse[who.idx];
  const toD = { x: e.defender.pos.x - who.pos.x, y: e.defender.pos.y - who.pos.y }, L = Math.hypot(toD.x, toD.y);
  a.n++; a.reqUp += it.vel.x * dir; a.reqLat += Math.abs(it.vel.y); a.achUp += who.body.vel.x * dir;
  a.gUp += g.x * dir / sim.dt; a.gLat += Math.abs(g.y) / sim.dt; const ps = playSideSign(sim, sim.offCall.run); a.gPlay = (a.gPlay ?? 0) + g.y * ps / sim.dt; a.reqPlay = (a.reqPlay ?? 0) + it.vel.y * ps; a.sidePlay = (a.sidePlay ?? 0) + Math.sign((who.pos.y - e.defender.pos.y) * ps);
  a.avail += who.body.support ? availability(who.body.support, supportParams(who.profile), fatigueFactor(who.body.energy)) : 1;
  a.contactLat += Math.abs(toD.y) / L; // 1 = defender straight beside him, 0 = straight upfield
};
for (const p of sets) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  if (!sim.offCall.run || !['insideZone','outsideZone','wideZone'].includes(sim.offCall.run.scheme)) continue;
  sim.event('snap', sim.slot('C')); const dir = sim.attackDir('O');
  while (sim.phase === 'live' && sim.t < 2.5) {
    const doubles = sim.engagements.filter((e: any) => e.type === 'run' && e.helpers.length).map((e: any) => [e, e.helpers[0]]);
    sim.tick(); if (!sim.lastStep?.groundImpulse) continue;
    for (const [e, h] of doubles) if (sim.engagements.includes(e) && e.helpers.includes(h)) { add('owner', e.blocker, e, sim, dir); add('helper', h, e, sim, dir); add('DL', e.defender, e, sim, dir); }
  }
}
for (const [k, a] of Object.entries(S)) console.log(k, a.n, `request upfield ${(a.reqUp/a.n).toFixed(2)} |lat| ${(a.reqLat/a.n).toFixed(2)}; achieved upfield ${(a.achUp/a.n).toFixed(2)}; ground force upfield ${(a.gUp/a.n).toFixed(0)} |lat| ${(a.gLat/a.n).toFixed(0)}; support availability ${(a.avail/a.n).toFixed(2)}; defender bearing lateral share ${(a.contactLat/a.n).toFixed(2)}; PLAY-SIDE signed: request ${(a.reqPlay/a.n).toFixed(2)} ground force ${(a.gPlay/a.n).toFixed(0)}; on DL's play side ${(a.sidePlay/a.n).toFixed(2)}`);
