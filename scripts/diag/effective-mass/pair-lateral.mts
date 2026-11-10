// Engaged-pair rotation in game (step 2, attempt two): for solo OL-DL run engagements on zone runs, every tick from
// 0.5 to 1.5 s after engagement, each man's velocity across the line between them (lateral to the pair) against what
// he asks for across it, and the relative lateral motion that turns the pair. Shares of ticks where each falls short
// of his own request by > 0.5 yd/s, and the hand joint's tangential load against its limit when known.
// Diagnostic only. usage: node --import tsx scripts/diag/effective-mass/pair-lateral.mts [restage dir]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const DIR = process.argv[2] ?? 'out/matched-restage';
const { directionalSpeedFactor } = await import(`${W}/src/physics/kinematics.ts`);
const capAlong = (a: any, v: any) => { const s = Math.hypot(v?.x ?? 0, v?.y ?? 0); if (s < 0.2) return NaN; const h = Math.atan2(v.y, v.x); return a.profile.vmax * directionalSpeedFactor(a.profile, Math.atan2(Math.sin(h - a.body.facing), Math.cos(h - a.body.facing))); };
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']), DL = /^(DE|DT|NT)/;
const rows: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!/Zone/i.test(st.offCall?.run?.scheme ?? '')) continue;
  const sim: any = new PlaySim(st); const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    for (const e of sim.engagements ?? []) {
      if (e.type !== 'run' || !OL.has(e.blocker.slot) || !DL.test(e.defender.slot) || (e.helpers?.length ?? 0) > 0) continue;
      const age = sim.t - e.start; if (age < 0.5 || age > 1.5) continue;
      const b = e.blocker, d = e.defender; const nx0 = d.pos.x - b.pos.x, ny0 = d.pos.y - b.pos.y, L = Math.hypot(nx0, ny0) || 1;
      const tx = -ny0 / L, ty = nx0 / L; // across the pair
      const lat = (v: any) => (v?.x ?? 0) * tx + (v?.y ?? 0) * ty;
      const rb = sim.intents?.[b.idx]?.vel, rd = sim.intents?.[d.idx]?.vel;
      const sgn = Math.sign(lat(d.vel)) || 1; // + = the way the DL is moving across
      const capB = capAlong(b, rb), capD = capAlong(d, rd);
      rows.push({ capB, capD, reqSB: Math.hypot(rb?.x ?? 0, rb?.y ?? 0), reqSD: Math.hypot(rd?.x ?? 0, rd?.y ?? 0), spB: Math.hypot(b.vel.x, b.vel.y), spD: Math.hypot(d.vel.x, d.vel.y), dlV: sgn * lat(d.vel), dlR: sgn * lat(rd), olV: sgn * lat(b.vel), olR: sgn * lat(rb), rel: sgn * (lat(d.vel) - lat(b.vel)), L,
        tang: Math.abs(e.hands?.tangentForce ?? NaN), steer: e.hands?.steer ?? 0, hold: e.hands?.hold ?? 0 });
    } };
  sim.run();
}
const q = (v: number[], f = 0.5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const t3 = (k: string) => [0.25, 0.5, 0.75].map(f => q(rows.map(r => r[k]), f).toFixed(2)).join('/');
console.log(`solo OL-DL run engagements on zone runs, ticks 0.5-1.5 s after engagement: n ${rows.length}; lateral = across the pair, + = the DL's way (p25/p50/p75, yd/s)`);
console.log(`  DL: achieved ${t3('dlV')}, requested ${t3('dlR')} | OL: achieved ${t3('olV')}, requested ${t3('olR')} | relative (DL - OL) ${t3('rel')} | separation ${t3('L')}`);
console.log(`  OL short of his request by > 0.5: ${(100 * rows.filter(r => r.olR - r.olV > 0.5).length / rows.length).toFixed(0)}% | DL beyond his request by > 0.5: ${(100 * rows.filter(r => r.dlV - r.dlR > 0.5).length / rows.length).toFixed(0)}% | OL asks for less than the DL moves (by > 0.5): ${(100 * rows.filter(r => r.dlV - r.olR > 0.5).length / rows.length).toFixed(0)}%`);
console.log(`  hands steer p50 ${q(rows.map(r => r.steer)).toFixed(0)}, hold p50 ${q(rows.map(r => r.hold)).toFixed(0)}, tangential load p50 ${q(rows.map(r => r.tang)).toFixed(0)}`);
const short = rows.filter(r => r.olR - r.olV > 0.5);
console.log(`  OL-short ticks (${short.length}): his request speed ${q(short.map(r => r.reqSB)).toFixed(2)} against his directional top speed that way ${q(short.map(r => r.capB)).toFixed(2)} (request above the cap on ${(100 * short.filter(r => r.reqSB > r.capB).length / Math.max(1, short.length)).toFixed(0)}%), speed ${q(short.map(r => r.spB)).toFixed(2)}`);
console.log(`  all ticks: OL request above his directional cap ${(100 * rows.filter(r => r.reqSB > r.capB).length / rows.length).toFixed(0)}% | DL request above his ${(100 * rows.filter(r => r.reqSD > r.capD).length / rows.length).toFixed(0)}% | directional cap p50 OL ${q(rows.map(r => r.capB)).toFixed(2)} DL ${q(rows.map(r => r.capD)).toFixed(2)}`);
const sat = rows.filter(r => Number.isFinite(r.tang) && r.steer > 0 && r.tang >= 0.95 * r.steer), unsat = rows.filter(r => Number.isFinite(r.tang) && r.steer > 0 && r.tang < 0.95 * r.steer);
console.log(`  hands' tangential load at >= 95% of its steer limit on ${(100 * sat.length / Math.max(1, sat.length + unsat.length)).toFixed(0)}% of ticks | relative lateral (DL - OL) p50/p75: at the limit ${q(sat.map(r => r.rel)).toFixed(2)}/${q(sat.map(r => r.rel), 0.75).toFixed(2)}, below it ${q(unsat.map(r => r.rel)).toFixed(2)}/${q(unsat.map(r => r.rel), 0.75).toFixed(2)} | steer limit p50 ${q(rows.map(r => r.steer)).toFixed(0)} (no steer on ${(100 * rows.filter(r => !(r.steer > 0)).length / rows.length).toFixed(0)}%)`);
