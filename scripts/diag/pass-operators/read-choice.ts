// Why the QB throws where he throws (732 panel): at each throw, the target's route, its place in the read order, the
// read index he was on, and how many reads he had; per route, how often it is read #1 and how often thrown to when read #1.
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { restoreSetup } from '../saved-play.js';
const P: any = QBPass.prototype; let cap: any = null;
const st = P.startThrow; P.startThrow = function (a: any, sim: any, ev: any) { if (!cap) cap = { idx: this.readIdx, n: this.reads.length, order: this.reads.map((r: any) => r), target: ev?.r ?? ev?.receiver ?? ev?.target ?? null, P: ev?.P }; return st.call(this, a, sim, ev); };
const asFirst: Record<string, number> = {}, run: Record<string, number> = {}, thrownAs: Record<string, Record<string, number>> = {};
for (const seed of ['7', '11']) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; for (let k = 0; k < 4; k++) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); for (let j = 0; j < k; j++) sim.rng.nextU32();
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    if (sim.offCall.pass?.fake || sim.offCall.pass?.family === 'screen') continue;
    const rid = new Map(sim.offense.filter((o: any) => o.behavior instanceof RouteRunner).map((o: any) => [o, (o.behavior as any).route?.id ?? 'none']));
    cap = null; let T: any = null; const tick = sim.tick.bind(sim);
    sim.tick = () => { const air = sim.ball.kind === 'air'; tick(); if (!T && !air && sim.ball.kind === 'air') T = sim.ball.target; };
    sim.run();
    for (const [o, r] of rid) run[r as string] = (run[r as string] ?? 0) + 1;
    if (!T || !cap) continue;
    const first = cap.order[0]; if (first) { const r = rid.get(first) as string; if (r) asFirst[r] = (asFirst[r] ?? 0) + 1; }
    const tr = (rid.get(T) as string) ?? 'non-route';
    const pos = cap.order.indexOf(T); const how = pos < 0 ? 'not in reads' : pos === cap.idx ? `on read #${pos + 1}` : pos === cap.order.length - 1 ? `outlet (#${pos + 1}) from read #${cap.idx + 1}` : `read #${pos + 1} off-order from #${cap.idx + 1}`;
    const key = how.startsWith('on read #1') ? 'read #1' : how.startsWith('on read') ? 'later read (in order)' : how.startsWith('outlet') ? 'outlet' : how === 'not in reads' ? 'not in reads' : 'off-order';
    (thrownAs[tr] ??= {})[key] = (thrownAs[tr][key] ?? 0) + 1; } }); }
const tot = Object.values(run).reduce((a, b) => a + b, 0);
console.log('route | routes run | read #1 share of plays it is run | thrown: total, as read #1 / later read / outlet / off-order / not in reads');
for (const r of Object.keys(thrownAs).sort((a, b) => Object.values(thrownAs[b]).reduce((x, y) => x + y, 0) - Object.values(thrownAs[a]).reduce((x, y) => x + y, 0))) {
  const t = thrownAs[r], n = Object.values(t).reduce((x, y) => x + y, 0);
  console.log(`${r.padEnd(12)} | ${run[r] ?? 0} | ${((asFirst[r] ?? 0) / Math.max(1, run[r] ?? 0)).toFixed(2)} | ${n}: ${t['read #1'] ?? 0} / ${t['later read (in order)'] ?? 0} / ${t['outlet'] ?? 0} / ${t['off-order'] ?? 0} / ${t['not in reads'] ?? 0}`); }
