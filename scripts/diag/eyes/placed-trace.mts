// Tick trace of one placed-rusher play (placed-rusher.ts staging): true and felt distance, felt speed and age, bearing,
// held(), pressure() time and who, the rusher's behaviour and engagement, the alarm.
//   node --import tsx scripts/diag/eyes/placed-trace.mts <concept> <seed> [FLAG=value ...]   (cover 3)
import { readFileSync } from 'node:fs';
const root = new URL('../../..', import.meta.url).pathname.replace(//$/, '');
const flags: Record<string, string> = JSON.parse(readFileSync(`${root}/config/reference-stack.json`, 'utf8')).flags;
for (const [k, v] of Object.entries(flags)) if (v === 'on') process.env[k] = '1';
process.env.HOT_LOOK = '1';
for (const kv of process.argv.slice(4)) { const [k, v] = kv.split('='); process.env[k] = v; }
const { PlaySim } = await import(`${root}/src/sim/playsim.js`);
const { nativeTraceSetup } = await import(`${root}/scripts/diag/command-trace.js`);
const { Blitzer } = await import(`${root}/src/sim/behaviors/defense.js`);
const [concept, coverage] = [process.argv[2], 'cover3'], seed = Number(process.argv[3]);
const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
let qb: any = null, d: any = null; const tick = sim.tick.bind(sim);
sim.tick = () => {
  tick();
  if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
  if (!d && qb && sim.carrier === sim.qb && qb.phase === 'set') {
    const q = sim.qb; d = [...sim.defense].sort((x: any, y: any) => y.pos.x - x.pos.x)[0];
    const side = q.pos.y > sim.ballY ? -1 : 1, ang = q.body.facing + side * 35 * Math.PI / 180;
    const px = Math.min(q.pos.x + 4 * Math.cos(ang), sim.los - 3.5), py = q.pos.y + 4 * Math.sin(ang);
    const L = Math.hypot(q.pos.x - px, q.pos.y - py) || 1;
    d.body.pos = { x: px, y: py }; d.body.vel = { x: (q.pos.x - px) / L * 5, y: (q.pos.y - py) / L * 5 };
    d.behavior = new (Blitzer as any)(d, sim, 'C', side);
  }
  if (d && qb && sim.qb.behavior === qb && sim.t < 6) {
    const a = sim.qb, f = qb.felt(a, sim, d), pr = qb.pressure(a, sim), h = qb.held(a, d, sim);
    const raw = Math.atan2(d.pos.y - a.pos.y, d.pos.x - a.pos.x) - a.body.facing, ang = Math.abs(Math.atan2(Math.sin(raw), Math.cos(raw))) * 180 / Math.PI;
    const tv = Math.hypot(d.vel.x, d.vel.y), fv = Math.hypot(f.vel.x, f.vel.y);
    console.log(`t ${sim.t.toFixed(2)} ph ${qb.phase} dist ${Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y).toFixed(2)} felt-dist ${Math.hypot(f.pos.x - a.pos.x, f.pos.y - a.pos.y).toFixed(2)} v ${tv.toFixed(1)}/${fv.toFixed(1)} age ${(f.age ?? 0).toFixed(2)} ang ${ang.toFixed(0)} held ${h.toFixed(2)} press ${pr.time.toFixed(2)} by ${pr.agent?.slot ?? '-'}${pr.agent === d ? '*' : ''} beh ${d.behavior?.kind} eng ${!!d.engagement} alarm ${qb.alarmAt ?? '-'}`);
  }
};
const res = sim.run();
console.log('sacked', res.stats.sacked, 'ttt', res.stats.timeToThrow);
