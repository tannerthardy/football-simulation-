/** "Tried, still held": while a run-blocked DL/LB is attempting to shed (tag shed-attempt, still engaged), what force
 * keeps him attached? Per sampled tick: the hand joint's tension (normalForce < 0 pulls him back; capacity `hold`),
 * steering force vs its cap, who holds; his request vs achieved velocity relative to the blocker. Per attempt window:
 * freed within 1 s or not; holding fouls recorded on the play. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const S: any[] = []; const W: any[] = []; let plays = 0, holdFouls = 0, holdRecords = 0;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; plays++;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const win = new Map<any, any>();
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0();
    if (!sim.carrier || sim.carrier === sim.qb) return;
    for (const d of sim.defense) {
      if (!/^(DE|DT|NT|LB)/.test(d.slot)) continue;
      const e = d.engagement, w = win.get(d);
      if (w && !w.done) { if (!e) { w.freed = sim.t - w.t0; w.done = true; } else if (sim.t - w.t0 > 1.0) w.done = true; }
      if (!e || !d.tags.has('shed-attempt')) continue;
      if (!w) win.set(d, { t0: sim.t, slot: d.slot, done: false });
      { const ww = win.get(d); if (ww && !ww.done && d.tags.has('shed-hands')) ww.landed = true; if (ww && !ww.done && sim.t < e.moveUntil && e.moveOk) ww.inWin = (ww.inWin ?? 0) + 1; }
      const b = e.blocker, j = sim.world.joints.find((j: any) => j.kind === 'hands' && ((j.a === b.body && j.b === d.body) || (j.a === d.body && j.b === b.body)));
      const iv = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 };
      const rel = { x: d.vel.x - b.vel.x, y: d.vel.y - b.vel.y }, relReq = { x: iv.x - b.vel.x, y: iv.y - b.vel.y };
      S.push({ joint: !!j, hold: j?.hold ?? 0, steer: j?.steer ?? 0, normal: j?.normalForce ?? 0, tangent: Math.abs(j?.tangentForce ?? 0),
        holder: j ? ((j.holder ?? j.a) === b.body ? 'OL' : 'DL') : '-', ctl: e.control,
        reqRel: Math.hypot(relReq.x, relReq.y),
        // absolute: his request, his achieved velocity along it, and the blocker's velocity along it
        reqAbs: Math.hypot(iv.x, iv.y), dAlong: (d.vel.x * iv.x + d.vel.y * iv.y) / (Math.hypot(iv.x, iv.y) || 1), bAlong: (b.vel.x * iv.x + b.vel.y * iv.y) / (Math.hypot(iv.x, iv.y) || 1),
        lat: Math.abs((iv.x * (d.pos.y - b.pos.y) - iv.y * (d.pos.x - b.pos.x)) / (Math.hypot(iv.x, iv.y) * Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) || 1)),
        torsoN: (() => { const w = sim.world, i = w.bodies.indexOf(d.body), k = w.bodies.indexOf(b.body); const r = (w.report?.contacts ?? w.lastReport?.contacts ?? []).filter((c: any) => (c.i === i && c.j === k) || (c.i === k && c.j === i)); return r.reduce((a: number, c: any) => a + c.impulse, 0) / sim.dt / (d.profile.massKg * 10.7); })(),
        handT: Math.abs(j?.tangentForce ?? 0) / (d.profile.massKg * 10.7), handN: (j?.normalForce ?? 0) / (d.profile.massKg * 10.7),
        into: (iv.x * (b.pos.x - d.pos.x) + iv.y * (b.pos.y - d.pos.y)) / (Math.hypot(iv.x, iv.y) * Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) || 1),
        dSup: d.body.support?.state, leg: (sim.world as any).report?.groundImpulse?.[sim.world.bodies.indexOf(d.body)],
        felt: Math.hypot(d.body.support?.felt?.x ?? 0, d.body.support?.felt?.y ?? 0) / (d.profile.massKg * 10.7),
        bReq: (() => { const bi = sim.intents[b.idx]?.vel ?? { x: 0, y: 0 }; return (bi.x * iv.x + bi.y * iv.y) / (Math.hypot(iv.x, iv.y) || 1); })(), achRel: Math.hypot(rel.x, rel.y), mass: d.profile.massKg });
    }
  };
  sim.run();
  for (const w of win.values()) W.push(w);
  holdFouls += (sim.penalties ?? []).filter((x: any) => x.kind === 'holding').length;
  holdRecords += (sim.foulRecords ?? []).filter((x: any) => x.kind === 'holding').length;
}
const q = (v: number[], f = .5) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
const J = S.filter(s => s.joint);
const tension = J.filter(s => s.normal < -1e-6), tight = J.filter(s => s.hold > 0 && s.normal < -0.5 * s.hold);
console.log(`run plays ${plays}; shed-attempt engaged samples ${S.length} (with a hand joint ${J.length})`);
console.log(`hand joint pulling him back (tension): ${(100 * tension.length / J.length).toFixed(0)}% of samples; at >= half the grab capacity: ${(100 * tight.length / J.length).toFixed(0)}%`);
console.log(`tension force p50/p90 when pulling: ${q(tension.map(s => -s.normal)).toFixed(0)}/${q(tension.map(s => -s.normal), .9).toFixed(0)} kg*yd/s2 (= ${(q(tension.map(s => -s.normal)) / 10.7).toFixed(0)}/${(q(tension.map(s => -s.normal), .9) / 10.7).toFixed(0)} kgf); grab capacity p50 ${q(J.map(s => s.hold)).toFixed(0)}`);
console.log(`steering force at >= 90% of its cap: ${(100 * J.filter(s => s.steer > 0 && s.tangent >= 0.9 * s.steer).length / J.length).toFixed(0)}%`);
for (const [lab, f] of [['ctl<0', (s: any) => s.ctl < 0], ['ctl>=0', (s: any) => s.ctl >= 0]] as const) { const z = J.filter(f); console.log(`  ${lab}: ${(100 * z.length / J.length).toFixed(0)}% of samples, steer saturated ${(100 * z.filter(s => s.steer > 0 && s.tangent >= 0.9 * s.steer).length / Math.max(1, z.length)).toFixed(0)}%, achieved rel ${q(z.map(s => s.achRel)).toFixed(2)}`); }
console.log(`holder: OL ${J.filter(s => s.holder === 'OL').length}, DL ${J.filter(s => s.holder === 'DL').length}; control p50 ${q(S.map(s => s.ctl)).toFixed(2)} (+ = blocker)`);
console.log(`relative to the blocker: requested ${q(S.map(s => s.reqRel)).toFixed(2)} yd/s, achieved ${q(S.map(s => s.achRel)).toFixed(2)}`);
const M = S.filter(s => s.reqAbs > 1);
console.log(`requests > 1 yd/s (${M.length}): his request ${q(M.map(s => s.reqAbs)).toFixed(2)}, he achieves along it ${q(M.map(s => s.dAlong)).toFixed(2)}; blocker along it: requested ${q(M.map(s => s.bReq)).toFixed(2)}, achieved ${q(M.map(s => s.bAlong)).toFixed(2)}`);
console.log(`  request across the blocker line (sin>0.7) ${(100 * M.filter(s => s.lat > .7).length / M.length).toFixed(0)}% | felt load on him p50 ${q(M.map(s => s.felt)).toFixed(2)} bw`);
for (const [lab, f] of [['achieves < 50% of request', (s: any) => s.dAlong < .5 * s.reqAbs], ['achieves >= 50%', (s: any) => s.dAlong >= .5 * s.reqAbs]] as const) { const z = M.filter(f); console.log(`  ${lab}: ${(100 * z.length / M.length).toFixed(0)}% | felt ${q(z.map(s => s.felt)).toFixed(2)} bw | steer sat ${(100 * z.filter(s => s.steer > 0 && s.tangent >= .9 * s.steer).length / Math.max(1, z.length)).toFixed(0)}% | blocker along ${q(z.map(s => s.bAlong)).toFixed(2)}`); }
for (const [lab, f] of [['stuck (<50%)', (s: any) => s.dAlong < .5 * s.reqAbs], ['moving', (s: any) => s.dAlong >= .5 * s.reqAbs]] as const) { const z = M.filter(f); console.log(`  ${lab}: torso contact present ${(100 * z.filter(s => s.torsoN > 0.01).length / z.length).toFixed(0)}%, torso normal p50 ${q(z.map(s => s.torsoN)).toFixed(2)} bw (friction cap ${(0.35 * q(z.map(s => s.torsoN))).toFixed(2)}), hand tangent ${q(z.map(s => s.handT)).toFixed(2)} bw, hand normal ${q(z.map(s => s.handN)).toFixed(2)} bw`); }
for (const [lab, f] of [['stuck (<50%)', (s: any) => s.dAlong < .5 * s.reqAbs], ['moving', (s: any) => s.dAlong >= .5 * s.reqAbs]] as const) { const z = M.filter(f);
  console.log(`  ${lab}: request into the blocker cos p25/50/75 ${q(z.map(s => s.into), .25).toFixed(2)}/${q(z.map(s => s.into)).toFixed(2)}/${q(z.map(s => s.into), .75).toFixed(2)} | cos>0.5 ${(100 * z.filter(s => s.into > .5).length / z.length).toFixed(0)}%, cos<0 ${(100 * z.filter(s => s.into < 0).length / z.length).toFixed(0)}% | up ${(100 * z.filter(s => s.dSup === 'up').length / z.length).toFixed(0)}%`); }
const freed = W.filter(w => w.freed !== undefined);
console.log(`shed-attempt windows ${W.length}: freed within 1 s ${freed.length} (${(100 * freed.length / Math.max(1, W.length)).toFixed(0)}%), p50 ${q(freed.map(w => w.freed)).toFixed(2)} s`);
const L = W.filter(w => w.landed); console.log(`hand move landed in ${L.length}/${W.length} windows; freed within 1 s: landed ${L.filter(w => w.freed !== undefined).length}/${L.length}, not landed ${W.filter(w => !w.landed && w.freed !== undefined).length}/${W.length - L.length}`);
console.log(`holding fouls called ${holdFouls}, holding records ${holdRecords} on ${plays} run plays`);
