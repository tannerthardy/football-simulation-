import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const [f, idx, from, to] = process.argv.slice(2);
const p = (JSON.parse(readFileSync(f, 'utf8')) as any[])[+idx];
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
console.log(p.call);
const pl = sim.offense.find((o: any) => o.behavior?.plan?.kind === 'pull' && (o.behavior.plan.pullRole === 'kick' || o.behavior.plan.pullRole === 'trap')) ?? sim.offense.find((o: any) => o.behavior?.plan?.kind === 'pull');
sim.tick(); const man = pl.behavior.plan.target; console.log('puller', pl.slot, 'man', man?.slot);
while (sim.phase === 'live' && sim.t < +to) {
  sim.tick();
  if (sim.t < +from) continue;
  const rb = sim.slot('RB'), c = sim.carrier;
  const f2 = (v: number) => v.toFixed(2);
  console.log(`${sim.t.toFixed(2)} carrier ${c?.slot} RB x ${f2(rb.pos.x - sim.los)} vx ${f2(rb.vel.x)} y ${f2(rb.pos.y)} | ${man.slot} x ${f2(man.pos.x - sim.los)} vx ${f2(man.vel.x)} y ${f2(man.pos.y)} | puller x ${f2(pl.pos.x - sim.los)} y ${f2(pl.pos.y)} role ${pl.behavior.plan.pullRole} tgt ${pl.behavior.plan.target?.slot}`);
}
const e = sim.events.find((e: any) => e.type === 'carrier_contact'); console.log('first contact', e?.t, e && sim.agents[e.b].slot);
