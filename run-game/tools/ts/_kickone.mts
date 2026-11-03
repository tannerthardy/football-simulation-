import { readFileSync } from 'node:fs';
const W = process.argv[2], seed = +process.argv[3], ix = +process.argv[4];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { playSideSign } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const p = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))[ix];
const probe: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); probe.tick();
const kslot = probe.offense.find((a: any) => a.behavior?.plan?.pullRole === 'kick').slot;
(globalThis as any).__kh = (a: any, t: number, o: any) => { if (a.slot === kslot && Math.round(t * 100) % 10 === 0) console.log("  hook", t.toFixed(2), JSON.stringify(o, (k, v) => typeof v === "number" ? +v.toFixed(2) : v)); };
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
const tr = sim.recordCommands({ actor: { team: 'O', slot: kslot }, from: 1.0, to: 2.4 });
const ps = playSideSign(sim, sim.offCall.run), f = (v: number) => v.toFixed(2);
const lat = (y: number) => (y - sim.ballY) * ps, dep = (x: number) => (x - sim.los) * sim.attackDir('O');
while (sim.t < 2.4 && sim.phase === 'live') sim.tick();
for (const s of tr.steps as any[]) { if (Math.round(s.stepStart * 100) % 10) continue;
  const fin = s.final, b = s.start.behavior, pos = s.start.body.position, v = s.start.body.velocity;
  const ob = fin?.objective; const op = ob?.point ?? ob?.target;
  console.log(`t=${f(s.stepStart)} ${b.kind}/${b.job ?? ''} tgt ${b.target?.slot ?? b.target ?? '-'} pos(${f(dep(pos.x))},${f(lat(pos.y))}) v(${f(v.x * sim.attackDir('O'))},${f(v.y * ps)}) req(${f(fin.vel.x * sim.attackDir('O'))},${f(fin.vel.y * ps)}) obj ${ob?.kind} ${op ? `(${f(dep(op.x))},${f(lat(op.y))})` : ''} rew ${s.rewrites.map((r: any) => r.stage).join(',')}`);
}
