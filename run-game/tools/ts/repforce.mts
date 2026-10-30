/** Single-blocker run reps on a down lineman: what each side asks for, what ground force each puts down
 * (as a share of traction and of leg strength), and where the DL goes. Upfield = offense's attack direction. */
import { readFileSync } from 'node:fs'; import { deserialize } from 'node:v8';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { supportParams } = await import(root + '/src/physics/support.ts');
const sets = process.argv.slice(2).flatMap(f => deserialize(readFileSync(f)) as any[]);
type Acc = Record<string, number[]>;
const bins: Record<string, Acc> = {};
const put = (bin: string, k: string, v: number) => { ((bins[bin] ??= {})[k] ??= []).push(v); };
const start = new Map<any, number>();
for (const p of sets) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup)));
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  if (!sim.offCall.run) continue;
  const dir = sim.attackDir('O');
  while (sim.phase === 'live' && sim.t < 3) {
    sim.tick(); const r = sim.lastStep; if (!r) continue; const dt = sim.dt;
    for (const e of sim.engagements) {
      if (e.type !== 'run' || e.helpers.length || !/^(DT|DE|NT)/.test(e.defender.slot)) continue;
      if (!start.has(e)) start.set(e, sim.t);
      const age = sim.t - start.get(e)!;
      const bin = age < .5 ? 'a 0-0.5s' : age < 1 ? 'b 0.5-1s' : age < 2 ? 'c 1-2s' : 'd 2s+';
      const o = e.blocker, d = e.defender, so = supportParams(o.profile), sd = supportParams(d.profile);
      const go = r.groundImpulse[o.idx].x * dir / dt, gd = -r.groundImpulse[d.idx].x * dir / dt;
      const io = sim.intents[o.idx], id = sim.intents[d.idx];
      put(bin, 'OL ground up / traction', go / so.traction); put(bin, 'DL ground down / traction', gd / sd.traction);
      put(bin, 'OL |ground| / traction', Math.hypot(r.groundImpulse[o.idx].x, r.groundImpulse[o.idx].y) / dt / so.traction);
      put(bin, 'DL |ground| / traction', Math.hypot(r.groundImpulse[d.idx].x, r.groundImpulse[d.idx].y) / dt / sd.traction);
      put(bin, 'OL pushForce / traction', so.pushForce / so.traction); put(bin, 'DL pushForce / traction', sd.pushForce / sd.traction);
      put(bin, 'OL mass', o.profile.massKg); put(bin, 'DL mass', d.profile.massKg);
      put(bin, 'OL req up', io.vel.x * dir); put(bin, 'OL req |lat|', Math.abs(io.vel.y)); put(bin, 'OL push', io.push ?? 0);
      put(bin, 'DL req down', -id.vel.x * dir); put(bin, 'DL req |lat|', Math.abs(id.vel.y)); put(bin, 'DL push', id.push ?? 0);
      put(bin, 'DL vel up (driven back)', d.vel.x * dir); put(bin, 'OL vel up', o.vel.x * dir);
      put(bin, 'OL posture', o.body.support?.posture ?? 0); put(bin, 'DL posture', d.body.support?.posture ?? 0);
      put(bin, 'OL facing.up', Math.cos(o.facing) * dir); put(bin, 'DL facing.down', -Math.cos(d.facing) * dir);
      put(bin, 'control', e.control ?? 0);
    }
  }
}
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const keys = Object.keys(bins['a 0-0.5s'] ?? {});
console.log(['metric', ...Object.keys(bins).sort()].join(' | '));
for (const k of keys) console.log([k, ...Object.keys(bins).sort().map(b => bins[b][k] ? mean(bins[b][k]).toFixed(2) : '-')].join(' | '));
console.log(['ticks', ...Object.keys(bins).sort().map(b => bins[b]['OL mass'].length)].join(' | '));
