// The 732 panel: one record per reception, the same shape as nfl_yacrec.py. Frames each 0.1 s from the catch to the
// play's end. Contact = a defender's centre within 1.0 yd of the carrier.
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';
import { ZoneCoverage, ManCoverage } from '../../../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../../../src/sim/coverage/defender.js';
import { facingTechnique } from '../../../src/sim/coverage/orientation.js';
const LAB = new WeakMap<any, string>();
for (const C of [ZoneCoverage, ManCoverage] as any[]) { const f = C.prototype.update; C.prototype.update = function (a: any, sim: any) { const r = f.call(this, a, sim); LAB.set(a, (C.name) + ':' + (facingTechnique(r)?.label ?? '?')); return r; }; }
{ const f = (CoverageDefender as any).prototype.update; (CoverageDefender as any).prototype.update = function (a: any, sim: any) { LAB.delete(a); const r = f.call(this, a, sim); if (!LAB.has(a)) LAB.set(a, 'CD:' + (facingTechnique(r)?.label ?? '?') + ':' + ((this as any).sub?.constructor?.name ?? '')); return r; }; }
const out: string[] = [];
for (const seed of ['7', '11']) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; for (let k = 0; k < 4; k++) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); for (let j = 0; j < k; j++) sim.rng.nextU32();
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    const los = sim.los; const snaps: any[] = []; const ring: any[] = []; let thT = -1; let wasAir = false, catchT = -1, R: any = null; const frames: any[] = []; let c0: any = null;
    const man = sim.defense.some((d: any) => (sim.defAlign.spots as any)[d.slot]?.manTarget);
    const tick = sim.tick.bind(sim);
    sim.tick = () => { const air = sim.ball.kind === 'air'; tick();
      ring.push({ t: sim.t, defs: sim.defense.map((d: any) => ({ pos: { ...d.pos }, vel: { ...d.vel }, lab: LAB.get(d) ?? null, tags: [...d.tags].filter((x: string) => x === 'zone-squeeze').length })) });
      if (thT < 0 && !air && sim.ball.kind === 'air') thT = sim.t;
      if (sim.ball.kind === 'air' && catchT < 0) snaps.push({ t: sim.t, defs: sim.defense.map((d: any) => ({ pos: { ...d.pos }, vel: { ...d.vel }, req: { ...(sim.intents[d.idx]?.vel ?? { x: 0, y: 0 }) }, face: d.body.facing, rface: sim.intents[d.idx]?.facing ?? null, sup: d.body.support?.state ?? null, eng: !!d.engagement, kind: (d.behavior as any)?.kind ?? '?', tech: (sim.intents[d.idx] as any)?.technique?.label ?? (d.behavior as any)?.constructor?.name })) });
      if (catchT < 0 && air && sim.ball.kind !== 'air' && sim.carrier && sim.offense.includes(sim.carrier)) { catchT = sim.t; R = sim.carrier;
        c0 = { pos: { ...R.pos }, vel: { ...R.vel }, defs: sim.defense.map((d: any) => ({ pos: { ...d.pos }, vel: { ...d.vel } })) }; }
      wasAir = air || (wasAir && sim.ball.kind === 'air');
      if (catchT >= 0 && sim.carrier === R) { const t10 = Math.round((sim.t - catchT) * 10); if (Math.abs((sim.t - catchT) * 10 - t10) < 1e-6)
        frames.push({ t: sim.t - catchT, x: R.pos.x, ds: sim.defense.map((d: any) => Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y)).sort((a: number, b: number) => a - b) }); } };
    const res: any = sim.run(); const s: any = sim.stats;
    if (!s.completed || catchT < 0 || !c0) continue;
    const air = c0.pos.x - los, yac = res.yards - air;
    const ds = c0.defs.map((d: any) => Math.hypot(d.pos.x - c0.pos.x, d.pos.y - c0.pos.y));
    const order = ds.map((d: number, i: number) => [d, i]).sort((a: any, b: any) => a[0] - b[0]);
    const [nd, ni] = order[0]; const D = c0.defs[ni]; const ux = (c0.pos.x - D.pos.x) / nd, uy = (c0.pos.y - D.pos.y) / nd;
    const rec: any = { air, yac, deeper: c0.defs.filter((d: any) => d.pos.x > c0.pos.x).length, near: nd,
      closing: (D.vel.x - c0.vel.x) * ux + (D.vel.y - c0.vel.y) * uy, n3: ds.filter((d: number) => d < 3).length, n5: ds.filter((d: number) => d < 5).length, man: man ? 'Man' : 'Zone' };
    const fi = frames.findIndex((f: any) => f.ds[0] < 1.0); const last = frames[frames.length - 1];
    if (fi >= 0) { const f = frames[fi]; rec.tContact = f.t; rec.ydsToContact = f.x - c0.pos.x; rec.afterContact = last ? last.x - f.x : null; rec.endAfter = last ? last.t - f.t : null;
      rec.n3c = f.ds.filter((d: number) => d < 3).length; const sec = frames.slice(fi + 1).find((g: any) => g.ds.length > 1 && g.ds[1] < 1.0); rec.tSecond = sec ? sec.t : null; }
    else rec.tContact = null;
    rec.pursuit = order.slice(0, 2).map(([d, i]: any) => { const v = c0.defs[i].vel, sp = Math.hypot(v.x, v.y), lx = c0.pos.x - c0.defs[i].pos.x, ly = c0.pos.y - c0.defs[i].pos.y, L = Math.hypot(lx, ly) || 1;
      return [sp, sp > 0.3 ? Math.acos(Math.max(-1, Math.min(1, (v.x * lx + v.y * ly) / (L * sp)))) * 57.2958 : null]; });
    if (snaps.length > 1) { const th = snaps[0], mid = snaps[Math.floor(snaps.length / 2)];
      rec.flightT = catchT - th.t + 0.05;
      rec.flight = order.slice(0, 2).map(([d, i]: any) => [th, mid, c0].map((sn: any) => { const q = sn.defs[i], lx = c0.pos.x - q.pos.x, ly = c0.pos.y - q.pos.y, L = Math.hypot(lx, ly) || 1;
        return [L, (q.vel.x * lx + q.vel.y * ly) / L, Math.hypot(q.vel.x, q.vel.y), q.req ? (q.req.x * lx + q.req.y * ly) / L : null, q.req ? Math.hypot(q.req.x, q.req.y) : null, q.kind ?? null, q.tech ?? null, q.face ?? null, q.rface ?? null, q.req ? Math.atan2(q.req.y, q.req.x) : null, q.sup ?? null, q.eng ?? null]; })); }
    if (thT >= 0) { rec.onset = {};
      for (const dt of [-0.6, -0.4, -0.2, 0, 0.2, 0.4]) { const t = thT + dt; if (t > catchT + 1e-9) continue;
        const sn = ring.reduce((b: any, x: any) => Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b, ring[0]); if (Math.abs(sn.t - t) > 0.03) continue;
        const qd = sn.defs[ni], lx = c0.pos.x - qd.pos.x, ly = c0.pos.y - qd.pos.y, L = Math.hypot(lx, ly) || 1;
        rec.onset[Math.round(dt * 10)] = [(qd.vel.x * lx + qd.vel.y * ly) / L, Math.hypot(qd.vel.x, qd.vel.y), qd.lab, qd.tags]; } }
    out.push(JSON.stringify(rec)); } }); }
writeFileSync(process.argv[2], out.join('\n') + '\n'); console.log(out.length);
