// No box LBs (removed) on OZ/WZ: when a DL makes first contact, how did he get there?
import { readFileSync } from 'node:fs';
const W = process.argv[2], CONS = (process.argv[3] ?? 'outsideZone,wideZone').split(',');
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { playSideSign } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const { runContactObservers } = await import(`${W}/src/sim/run-contact-observer.ts`);
const C: Record<string, number> = {}; const add = (k: string) => C[k] = (C[k] ?? 0) + 1;
const held: number[] = [], tShed: number[] = [], tHit: number[] = [], hitLat: number[] = [], snapLat: number[] = []; let n = 0, dlHits = 0;
const ex: string[] = [];
for (let seed = 7; seed <= 29; seed += 2) JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8')).forEach((p: any, ix: number) => {
  if (p.pass) return; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!CONS.includes(st.offCall?.run?.scheme)) return;
  const sim: any = new PlaySim(st); const dir = sim.attackDir('O'), ps = playSideSign(sim, sim.offCall.run);
  for (const d of sim.defense) { const dep = (d.pos.x - sim.los) * dir; if (dep >= 2.5 && dep <= 8 && Math.abs(d.pos.y - sim.ballY) < 6) {
    d.body.pos = { x: d.pos.x + 70 * dir, y: d.pos.y }; d.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: d.facing }) }; } }
  const dl = sim.defense.filter((d: any) => /^D[ET]|NT/.test(d.slot));
  const first = new Map<any, number>(), last = new Map<any, number>(), by = new Map<any, string>(), endWhy = new Map<any, string>();
  runContactObservers.set(sim, (e: any, phase: string, o: any) => { if (phase === 'end' && dl.includes(e.defender)) endWhy.set(e.defender, `${o.reason}${o.apart !== undefined ? '' : ''}`); });
  n++;
  while (sim.phase === 'live' && sim.t < 6) { sim.tick();
    for (const d of dl) if (d.engagement) { if (!first.has(d)) { first.set(d, sim.t); const b = d.engagement.blocker; by.set(d, `${b.slot.replace(/^[LR]/, '')}:${(b.behavior as any)?.plan?.kind}`); } last.set(d, sim.t); }
    const c = sim.events.find((e: any) => e.type === 'carrier_contact'); if (c) break; }
  const c = sim.events.find((e: any) => e.type === 'carrier_contact'); if (!c) return;
  const d = sim.agents[c.b]; if (!dl.includes(d)) return; dlHits++;
  const shed = sim.events.find((e: any) => e.type === 'shed' && sim.agents[e.a] === d);
  const k = !first.has(d) ? 'never blocked' : shed ? 'shed the block' : d.engagement ? 'hit while still engaged' : 'block came apart (no shed event)';
  add(k); if (k.startsWith('block came')) add(`  came apart: ${endWhy.get(d) ?? 'no observer end'}`);
  if (first.has(d)) held.push((last.get(d)! - first.get(d)!));
  if (shed) tShed.push(shed.t); tHit.push(c.t);
  const car = sim.agents[c.a]; hitLat.push((car.pos.y - sim.ballY) * ps);
  if (ex.length < 8 && k !== 'hit while still engaged') ex.push(`seed ${seed} #${ix} ${d.slot} ${k} by ${by.get(d) ?? '-'} t ${c.t.toFixed(2)} car lat ${((car.pos.y - sim.ballY) * ps).toFixed(1)} x ${((car.pos.x - sim.los) * dir).toFixed(1)}`);
});
const q = (a: number[], f: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : '-'; };
console.log(`${n} snaps, DL first hitter on ${dlHits}`);
for (const [k, v] of Object.entries(C).sort()) console.log(String(v).padStart(4), k);
console.log(`block held (engaged span) p25 ${q(held, .25)} p50 ${q(held, .5)} p75 ${q(held, .75)} | shed t p50 ${q(tShed, .5)} | hit t p50 ${q(tHit, .5)} | carrier lat at hit p50 ${q(hitLat, .5)}`);
console.log(ex.join('\n'));
