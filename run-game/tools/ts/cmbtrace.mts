/** One snap: per 0.1 s, each combo member's engagement role on the combo DL, center distance, plan kind/step, velocity,
 * and the DL's position/velocity. args: seed index */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const [seed, idx, slotA] = process.argv.slice(2);
const p = (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])[+idx];
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
const dir = sim.attackDir('O'), ps = Math.sign(sim.offCall.run?.side ?? 1);
const gates = new Map<any, string>();
(globalThis as any).__CMB = (obs: any, combo: any, why: string) => gates.set(obs, why);
let cb: any = null;
console.log(sim.offCall.run, 'dir', dir);
while (sim.phase === 'live' && sim.t < 3) {
  gates.clear(); sim.tick();
  if (!cb) { const o = sim.offense.find((o: any) => o.slot === slotA); cb = o?.behavior?.plan?.combination ?? null; if (!cb) continue; }
  if (Math.round(sim.t * 20) % 2) continue;
  const D = cb.defender, e = D.engagement;
  const row = cb.members.map((m: any) => {
    const me = m.engagement, role = me && me === e ? (me.blocker === m ? 'B' : 'H') : me ? 'other:' + me.defender.slot : '-';
    const pl = m.behavior?.plan;
    return `${m.slot} ${role} d${Math.hypot(m.pos.x - D.pos.x, m.pos.y - D.pos.y).toFixed(2)} dx${((m.pos.x - D.pos.x) * dir).toFixed(2)} dy${((m.pos.y - D.pos.y)).toFixed(2)} v(${(m.vel.x * dir).toFixed(1)},${m.vel.y.toFixed(1)}) ${pl?.kind}${pl?.combination === cb ? '' : '!'}${pl?.target === D ? '' : '->' + pl?.target?.slot} [${gates.get(m) ?? ''}]`;
  }).join(' | ');
  console.log(`${sim.t.toFixed(2)} ${D.slot} (${((D.pos.x - sim.los) * dir).toFixed(2)},${D.pos.y.toFixed(2)}) v(${(D.vel.x * dir).toFixed(1)},${D.vel.y.toFixed(1)}) rel=${cb.released} | ${row}`);
  if (cb.released) break;
}
