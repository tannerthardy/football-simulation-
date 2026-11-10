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
      rows.push({ dlV: sgn * lat(d.vel), dlR: sgn * lat(rd), olV: sgn * lat(b.vel), olR: sgn * lat(rb), rel: sgn * (lat(d.vel) - lat(b.vel)), L,
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
