// Every broken tackle on a set of saved plays: the hold's grasp origin, one-armed or not, engaged at the break, hold
// duration, carrier speed at the break; plus misses and yards per play. For judging which holds break and how
// (docs/reviews/contact-to-whistle.md).
// usage: node --import tsx scripts/diag/tackle-finish/broken-holds.mts <out.json> <restage.json | dir with seed{N}-run.json> [seeds...]
import { readFileSync, writeFileSync, statSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const [outFile, src, ...seedArgs] = process.argv.slice(2);
const files = statSync(src).isDirectory()
  ? (seedArgs.length ? seedArgs : ['7', '9', '11', '13', '15', '17', '19', '21', '23', '25', '27', '29']).map(s => [`s${s}`, `${src}/seed${s}-run.json`])
  : [['p', src]];
const rows: any[] = [], plays: any[] = [];
for (const [tag, file] of files) { let i = 0; for (const p of JSON.parse(readFileSync(file, 'utf8'))) {
  const id = `${tag}-${i++}`; const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const cache = new Map<any, any>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const b = sim.bond; if (b?.holds) for (const [d, j] of b.holds) { const c = cache.get(d);
    if (!c || c.joint !== j) cache.set(d, { joint: j, origin: j.origin, start: sim.t, oneArmAtStart: !!b.oneArm?.has(d), engagedAtStart: !!d.engagement });
    const cc = cache.get(d); cc.oneArmNow = !!b.oneArm?.has(d); cc.engagedNow = !!d.engagement; } };
  const ev = sim.event.bind(sim);
  sim.event = (type: string, a: any, b: any, note?: any) => { if (type === 'broken_tackle') { const c = cache.get(b) ?? {};
    rows.push({ id, t: sim.t, slot: b.slot, origin: c.origin, note, oneArm: c.oneArmNow, engagedAtStart: c.engagedAtStart, engagedAtBreak: c.engagedNow,
      held: c.start !== undefined ? +(sim.t - c.start).toFixed(2) : null, carrierSpeed: +Math.hypot(a.vel.x, a.vel.y).toFixed(2) }); }
    return ev(type, a, b, note); };
  const r = sim.run();
  plays.push({ id, yards: r.yards, missed: sim.events.filter((e: any) => e.type === 'missed_tackle').length, broken: sim.events.filter((e: any) => e.type === 'broken_tackle').length });
} }
writeFileSync(outFile, JSON.stringify({ rows, plays }));
const by: Record<string, number> = {};
for (const r of rows) { const k = `${(r.origin ?? '?').split('+')[0]}${r.oneArm ? ' (one-arm)' : ''}`; by[k] = (by[k] ?? 0) + 1; }
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
console.log(`plays ${plays.length}, broken ${rows.length} (${(rows.length / Math.max(1, plays.length)).toFixed(3)} a play), missed ${(plays.reduce((s, p) => s + p.missed, 0) / Math.max(1, plays.length)).toFixed(3)} a play`);
console.log('broken by grasp origin:', JSON.stringify(by));
console.log(`held median ${med(rows.map(r => r.held)).toFixed(2)} s, carrier speed at break median ${med(rows.map(r => r.carrierSpeed)).toFixed(2)} yd/s, from behind ${rows.filter(r => /behind/.test(r.origin ?? '')).length}`);
