import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const [seed, snap, idx, t0, t1] = process.argv.slice(2).map(Number);
const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[];
const sim: any = new PlaySim(restoreSetup(Buffer.from(plays[snap].setup, 'base64')));
const o = sim.agents[idx]; const ledger = sim.recordResponsibility(); const dir = sim.attackDir('O');
const f = (v: number) => v.toFixed(2);
while (sim.phase === 'live' && sim.t < t1) {
  sim.tick();
  if (sim.t < t0 - 1e-9 || Math.round(sim.t * 100) % 5) continue;
  const b: any = o.behavior, p = b.plan, iv = sim.intents[o.idx].vel;
  const row = [...ledger.data.rows].reverse().find((q: any) => q.actor === o.idx);
  const joints = sim.world.joints.filter((j: any) => j.a === o.body || j.b === o.body).map((j: any) => sim.agents.find((x: any) => x.body === (j.a === o.body ? j.b : j.a))?.slot);
  const near = sim.agents.filter((x: any) => x !== o && Math.hypot(x.pos.x - o.pos.x, x.pos.y - o.pos.y) < 1.2).map((x: any) => x.slot + ':' + f(Math.hypot(x.pos.x - o.pos.x, x.pos.y - o.pos.y)));
  console.log(`${f(sim.t)} ${o.slot} x ${f((o.pos.x - sim.los) * dir)} y ${f(o.pos.y)} | v ${f(o.vel.x * dir)},${f(o.vel.y)} | req ${f(iv.x * dir)},${f(iv.y)} | ${p.kind}->${p.target?.slot} dep ${p.departure ? 'Y' : '-'} acc ${b.departureAccess?.kind ?? '-'} eng ${o.engagement ? o.engagement.defender.slot : '-'} | joints ${joints.join(',') || '-'} | near ${near.join(' ')} | rw ${row?.command?.rewrittenBy?.join('>') ?? ''} torso ${row?.torso?.filter((k: any) => k.impulse > 1e-6).length ?? 0}`);
}
