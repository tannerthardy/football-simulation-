/** Line-level tackle finish: first contact (a defender centre within 1.0 yd of the carrier, gang.py's event) with the
 * carrier within 2 yd of the LOS. From there: carrier speed at +0.1..+0.6 s, time to the end, and what acted on him:
 * bond tacklers (branch front/behind/down from updateBond's `into`), their mass, his own request, contact forces.
 * usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const R: any[] = [];
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  let ev: any = null; let c0team: any;
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0();
    const c = sim.carrier; if (!c || c === sim.qb || sim.ball.kind !== 'held') return;
    const sp = Math.hypot(c.vel.x, c.vel.y);
    if (!ev) {
      const near = sim.defense.filter((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 1.0);
      if (!near.length || Math.abs(c.pos.x - sim.los) > 2) return;
      c0team = c.team; const dn = near.reduce((a: any, b: any) => Math.hypot(b.pos.x - c.pos.x, b.pos.y - c.pos.y) < Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) ? b : a), L0 = Math.hypot(dn.pos.x - c.pos.x, dn.pos.y - c.pos.y) || 1;
      const sq = sp > .5 ? (c.vel.x * (dn.pos.x - c.pos.x) + c.vel.y * (dn.pos.y - c.pos.y)) / (sp * L0) : NaN;
      const u0 = sp > .3 ? { x: c.vel.x / sp, y: c.vel.y / sp } : { x: 1, y: 0 };
      const plastic = (c.profile.massKg * sp + dn.profile.massKg * (dn.vel.x * u0.x + dn.vel.y * u0.y)) / (c.profile.massKg + dn.profile.massKg);
      ev = { plastic, mc: c.profile.massKg, md: dn.profile.massKg, sq, dsp: Math.hypot(dn.vel.x, dn.vel.y), t: sim.t, sp0: sp, x0: c.pos.x, slots: near.map((d: any) => d.slot + (d.engagement ? '*' : '')), sp: [] as number[], req: [] as number[], nT: [] as number[], br: [] as string[], up: [] as boolean[] };
    }
    ev.xl = c.pos.x;
    if (sim.t - ev.t <= 0.2 + 1e-9) {
      const u = ev.u ??= (sp > .3 ? { x: c.vel.x / sp, y: c.vel.y / sp } : { x: sim.attackDir(c.team), y: 0 });
      const m = c.profile.massKg, w: any = sim.world, i = w.bodies.indexOf(c.body), rep = w.report;
      const along = (v: any) => v ? (v.x * u.x + v.y * u.y) : 0;
      // v0 is his velocity after the contact tick. Only the steps after it are added, so the
      // impulses (four steps, +0.05..+0.20 s) cover exactly the velocity change v(+0.20) - v0.
      if (ev.v0 === undefined) { ev.v0 = along(c.vel); ev.ground = 0; ev.grasp = 0; ev.stride = 0; ev.steps = 0; }
      else if (sim.t - ev.t <= 0.2 + 1e-9) {
        const g = rep?.groundImpulse?.[i]; ev.ground += along(g) / m;
        let gr = 0, st = 0; for (const j of w.joints) if (j.kind === 'grasp' && j.b === c.body && !j.broken) { gr += (along(j.normalForceOnB) + along(j.tangentForceOnB)) * sim.dt / m; st += (j.strideForce ?? 0) * sim.dt / m; }
        ev.grasp += gr; ev.stride += st; ev.steps++;
        ev.v2 = along(c.vel);
      }
    }
    if (sim.t - ev.t <= 0.61) {
      const iv = sim.intents[c.idx]?.vel ?? { x: 0, y: 0 };
      ev.sp.push(sp); ev.req.push(Math.hypot(iv.x, iv.y));
      const b = sim.bond; ev.nT.push(b ? b.tacklers.length : 0); ev.up.push(c.body.support?.state === 'up');
      if (b) for (const d of b.tacklers) {
        const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, L = Math.hypot(dx, dy) || 1;
        const into = sp > 0.5 ? (c.vel.x * -dx / L + c.vel.y * -dy / L) / sp : 1;
        ev.br.push(`${d.slot}:${c.body.support?.state !== 'up' ? 'down' : into > 0.3 ? 'front' : 'behind'}`);
      }
    }
  };
  sim.run();
  if (ev) { ev.end = sim.t - ev.t; ev.gain = (ev.xl - ev.x0) * sim.attackDir(c0team); ev.id = `s${seed}-${p.i ?? R.length}`; R.push(ev); }
}
const q = (v: number[], f = .5) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
const at = (e: any, k: number) => e.sp[Math.min(k, e.sp.length - 1)] ?? 0;
console.log(`line-level first contacts ${R.length}`);
console.log(`carrier speed p50 at 0/+0.1/+0.2/+0.3/+0.5 s: ${[0, 2, 4, 6, 10].map(k => q(R.map(e => at(e, k))).toFixed(2)).join(' / ')}  | requested at +0.3 ${q(R.map(e => e.req[Math.min(6, e.req.length - 1)])).toFixed(2)}`);
console.log(`time to end p25/50/75 ${q(R.map(e => e.end), .25).toFixed(2)}/${q(R.map(e => e.end)).toFixed(2)}/${q(R.map(e => e.end), .75).toFixed(2)} | still up at +0.3 ${(100 * R.filter(e => e.up[6] ?? false).length / R.length).toFixed(0)}%`);
const first = (e: any) => e.br.length ? e.br[0].split(':')[1] : 'nobond';
for (const g of ['front', 'behind', 'down', 'nobond']) { const z = R.filter(e => first(e) === g); if (!z.length) continue;
  console.log(` first bond branch ${g.padEnd(6)} n ${String(z.length).padStart(3)} | sp0 ${q(z.map(e => e.sp0)).toFixed(2)} -> +0.3 ${q(z.map(e => at(e, 6))).toFixed(2)} | tacklers at +0.3 p50 ${q(z.map(e => e.nT[Math.min(6, e.nT.length - 1)])).toFixed(0)} | end ${q(z.map(e => e.end)).toFixed(2)} s | gain ${q(z.map(e => e.gain)).toFixed(1)}`); }
const Z = R.filter(e => e.v2 !== undefined && e.steps === 4);
console.log(`first 0.2 s along his travel (yd/s, p50): change ${q(Z.map(e => e.v2 - e.v0)).toFixed(2)} | ground (his legs) ${q(Z.map(e => e.ground)).toFixed(2)} | grasp joints ${q(Z.map(e => e.grasp)).toFixed(2)} | rest (torso contacts, hands) ${q(Z.map(e => e.v2 - e.v0 - e.ground - e.grasp)).toFixed(2)} | stride force lost ${q(Z.map(e => e.stride)).toFixed(2)}`);
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
console.log(`  (aligned window: ${Z.length} contacts with 4 force steps over the same 0.20 s as the velocity change)`);
console.log(`  means: change ${mean(Z.map(e => e.v2 - e.v0)).toFixed(2)} | ground ${mean(Z.map(e => e.ground)).toFixed(2)} | grasp ${mean(Z.map(e => e.grasp)).toFixed(2)} | rest ${mean(Z.map(e => e.v2 - e.v0 - e.ground - e.grasp)).toFixed(2)} | grasp joints present ${Z.filter(e => e.grasp !== 0).length}/${Z.length}`);
const SQ = R.filter(e => Number.isFinite(e.sq));
console.log(`square-ness at first contact (cos carrier velocity vs direction to the toucher): p25/50/75 ${q(SQ.map(e => e.sq), .25).toFixed(2)}/${q(SQ.map(e => e.sq)).toFixed(2)}/${q(SQ.map(e => e.sq), .75).toFixed(2)} | cos>0.8 ${(100 * SQ.filter(e => e.sq > .8).length / SQ.length).toFixed(0)}% | toucher speed p50 ${q(R.map(e => e.dsp)).toFixed(2)}`);
for (const [lab, lo, hi] of [['glancing cos<0.3', -2, .3], ['angled 0.3-0.8', .3, .8], ['square cos>0.8', .8, 2]] as const) { const z = SQ.filter(e => e.sq >= lo && e.sq < hi);
  console.log(`  ${lab.padEnd(16)} n ${String(z.length).padStart(3)} | speed 0 ${q(z.map(e => e.sp0)).toFixed(2)} -> +0.1 ${q(z.map(e => at(e, 2))).toFixed(2)} -> +0.3 ${q(z.map(e => at(e, 6))).toFixed(2)} | loss by +0.3 ${q(z.map(e => e.sp0 - at(e, 6))).toFixed(2)} | end ${q(z.map(e => e.end)).toFixed(2)} s`); }
{ const z = SQ.filter(e => e.sq >= .8);
  console.log(`  square: carrier ${q(z.map(e => e.mc)).toFixed(0)} kg vs toucher ${q(z.map(e => e.md)).toFixed(0)} kg | plastic-collision speed with the toucher alone p50 ${q(z.map(e => e.plastic)).toFixed(2)} | achieved +0.1 ${q(z.map(e => at(e, 2))).toFixed(2)}, +0.3 ${q(z.map(e => at(e, 6))).toFixed(2)} | below plastic at +0.3 ${(100 * z.filter(e => at(e, 6) < e.plastic).length / z.length).toFixed(0)}%`); }
const engaged = R.filter(e => e.slots.some((s: string) => s.endsWith('*')));
console.log(`first toucher engaged with a blocker: ${engaged.length}; +0.3 speed ${q(engaged.map(e => at(e, 6))).toFixed(2)} vs free ${q(R.filter(e => !engaged.includes(e)).map(e => at(e, 6))).toFixed(2)}`);
