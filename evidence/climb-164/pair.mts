// #164: the released DL against the climber: who pushes whom. Per tick: each
// body's requested vel (component along the climber->DL normal), push/posture,
// ground force along the normal, contact forces by partner, hand joints.
// argv: worktree seed index climberSlot dlSlot t0 t1
import { readFileSync } from 'node:fs';
const [W, seed, idxS, CS, DS] = process.argv.slice(2);
const t0 = Number(process.argv[7]), t1 = Number(process.argv[8]);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
const sim: any = new PlaySim(restoreSetup(Buffer.from(snaps[Number(idxS)].setup, 'base64')));
const ags: any[] = sim.agents, c = ags.find(a => a.slot === CS && a.team === 'O') ?? sim.offense.find((a: any) => a.slot === CS);
const d = sim.defense.find((a: any) => a.slot === DS);
const ic = ags.indexOf(c), id = ags.indexOf(d);
const f = (v: number) => v.toFixed(2);
const byBody = new Map(ags.map((a: any) => [a.body, a]));
const step = sim.world.step.bind(sim.world);
sim.world.step = (intents: any[], dt: number) => {
  const pre = { cv: { ...c.vel }, dv: { ...d.vel } };
  const rep = step(intents, dt);
  if (sim.t < t0 - 1e-9 || sim.t > t1 + 1e-9) return rep;
  const nx0 = d.pos.x - c.pos.x, ny0 = d.pos.y - c.pos.y, dist = Math.hypot(nx0, ny0), nx = nx0 / dist, ny = ny0 / dist; // climber -> DL
  const along = (v: any) => v.x * nx + v.y * ny;
  const mc = sim.world.mass[ic], md = sim.world.mass[id];
  const ci = intents[ic], di = intents[id];
  const contactsOf = (k: number, m: number) => rep.contacts.filter((x: any) => x.i === k || x.j === k).map((x: any) => `${ags[x.i === k ? x.j : x.i].slot}:${f(x.impulse / dt / m)}`).join(' ');
  const joints = (b: any) => sim.world.joints.filter((j: any) => !j.broken && (j.a === b || j.b === b)).map((j: any) => `${j.kind}:${(byBody.get(j.a === b ? j.b : j.a) as any)?.slot}${j.a === b ? '>' : '<'}`).join(' ');
  console.log(`${f(sim.t)} gap ${f(dist)} | ${CS} req·n ${f(along(ci?.vel ?? { x: 0, y: 0 }))} push ${ci?.push ?? '-'} v·n ${f(along(c.vel))} ground·n ${f(along(rep.groundImpulse[ic]) / dt / mc)} [${contactsOf(ic, mc)}] ${joints(c.body)} || ${DS} req·n ${f(along(di?.vel ?? { x: 0, y: 0 }))} push ${di?.push ?? '-'} v·n ${f(along(d.vel))} ground·n ${f(along(rep.groundImpulse[id]) / dt / md)} [${contactsOf(id, md)}] ${joints(d.body)} plan ${d.behavior?.constructor?.name}`);
  void pre;
  return rep;
};
sim.run();
