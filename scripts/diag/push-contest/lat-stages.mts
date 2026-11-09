// Diagnostic, observation only (OZ engaged OL lateral by stage, facing, directional top speed, hand loads).
// Run from a checkout with out/matched-restage/seed{7..29 odd}-run.json: node --import tsx scripts/diag/push-contest/lat-stages.mts
// OZ engaged DL-OL run reps: the OL's lateral request toward the play at each stage, and achieved.
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { runContactObservers } = await import(`${W}/src/sim/run-contact-observer.ts`);
const { directionalSpeedFactor } = await import(`${W}/src/physics/kinematics.ts`);
const OL = ['LT','LG','C','RG','RT']; const S: any[] = [];
const rel = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!['outsideZone', 'wideZone'].includes(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const mv = new Map<any, any>(); const lastFin = new Map<any, number>();
  const playSign = (st.offCall.run.direction === 'strong' ? 1 : -1) * sim.offAlign.strongSign;
  runContactObservers.set(sim, (e: any, ph: string, data: any) => { if (ph === 'movement') mv.set(e.blocker, { ...data, cmdY: data.command.vel.y, preY: data.preAnchor.y }); });
  const t0 = sim.t; const tick = sim.tick.bind(sim);
  sim.tick = () => { mv.clear(); tick(); const t = sim.t - t0; if (t < 0.5 || t > 2.0) return;
    for (const b of sim.offense) { const e = b.engagement; if (!OL.includes(b.slot) || !e || e.type !== 'run' || e.blocker !== b || !/^(DE|DT|NT)/.test(e.defender.slot)) continue;
      const m = mv.get(b); if (!m) continue; const fin = sim.intents[b.idx]?.vel;
      const lev = (b.pos.y - e.defender.pos.y) * playSign, cls = lev > 0.3 ? 'OL won' : lev < -0.3 ? 'DL won' : 'level';
      const finY = fin ? fin.y * playSign : NaN, jump = lastFin.has(b) ? Math.abs(finY - lastFin.get(b)!) : NaN; lastFin.set(b, finY);
      const traffic = sim.agents.filter((o: any) => o !== b && o !== e.defender && Math.hypot(o.pos.x - b.pos.x, o.pos.y - b.pos.y) < 1.0).length;
      S.push({ cls, jump, traffic, seal: (m.lat.y * m.seal) * playSign, stretchLat: (m.lat.y * m.lateral) * playSign, pre: m.preY * playSign, cmd: m.cmdY * playSign,
        fin: fin ? fin.y * playSign : NaN, ach: b.vel.y * playSign, dAch: e.defender.vel.y * playSign, anch: !!m.anchored, mirror: m.mirror,
        bFace: Math.abs(rel(b.facing, Math.atan2(b.vel.y, b.vel.x))), dFace: Math.abs(rel(e.defender.facing, Math.atan2(e.defender.vel.y, e.defender.vel.x))),
        bDir: directionalSpeedFactor(b.profile, rel(Math.atan2(b.vel.y, b.vel.x), b.facing)) * b.profile.vmax,
        dDir: directionalSpeedFactor(e.defender.profile, rel(Math.atan2(e.defender.vel.y, e.defender.vel.x), e.defender.facing)) * e.defender.profile.vmax,
        tan: Math.abs(e.hands?.tangentForce ?? 0) / (b.profile.massKg * 10.72), nrm: (e.hands?.normalForce ?? 0) / (b.profile.massKg * 10.72),
        bLoad: Math.hypot(b.body.support?.felt?.x ?? 0, b.body.support?.felt?.y ?? 0) / (b.profile.massKg * 10.72) }); } };
  sim.run();
}
const med = (a: number[]) => { const v = a.filter(Number.isFinite).sort((p, q) => p - q); return v[Math.floor(v.length / 2)].toFixed(2); };
console.log(`OZ engaged OL ticks ${S.length} | toward-play lateral, medians:`);
console.log(`  seal ${med(S.map(s => s.seal))} -> stretch lateral ${med(S.map(s => s.stretchLat))} -> pre-anchor ${med(S.map(s => s.pre))} -> command (anchor+prepare) ${med(S.map(s => s.cmd))} -> final intent ${med(S.map(s => s.fin))} -> OL achieved ${med(S.map(s => s.ach))} | DL achieved ${med(S.map(s => s.dAch))} | mirror ${med(S.map(s => s.mirror))} | anchored ${(100 * S.filter(s => s.anch).length / S.length).toFixed(0)}%`);
const big = S.filter(s => s.fin >= 2.4); console.log(`  ticks with final intent >= 2.4 toward play: ${(100 * big.length / S.length).toFixed(0)}% | their OL achieved ${med(big.map(s => s.ach))}, DL ${med(big.map(s => s.dAch))}`);
console.log(`  facing vs travel (deg): OL ${(+med(S.map(s => s.bFace)) * 57.3).toFixed(0)}, DL ${(+med(S.map(s => s.dFace)) * 57.3).toFixed(0)} | directional top speed OL ${med(S.map(s => s.bDir))}, DL ${med(S.map(s => s.dDir))} | hand tangent ${med(S.map(s => s.tan))} bw, normal ${med(S.map(s => s.nrm))} bw | OL felt load ${med(S.map(s => s.bLoad))} bw`);
for (const cls of ['OL won', 'level', 'DL won']) { const w = S.filter(s => s.cls === cls);
  console.log(`  ${cls}: ${(100 * w.length / S.length).toFixed(0)}% | final intent ${med(w.map(s => s.fin))} -> OL achieved ${med(w.map(s => s.ach))}, DL ${med(w.map(s => s.dAch))} | intent jump per tick ${med(w.map(s => s.jump))} | other bodies within 1 yd: ${(100 * w.filter(s => s.traffic > 0).length / w.length).toFixed(0)}% of ticks | anchored ${(100 * w.filter(s => s.anch).length / w.length).toFixed(0)}%`); }
