// Punish test: same captured snaps; box LBs normal / frozen at the snap / removed.
import { readFileSync } from 'node:fs';
const W = process.argv[2], CONS = (process.argv[3] ?? 'outsideZone').split(',');
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const out: Record<string, { y: number[]; fc: number[]; who: Record<string, number> }> = {};
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (p.pass) continue; const probe: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!CONS.includes(probe.offCall?.run?.scheme)) continue;
  for (const arm of (process.env.ARMS ?? 'A normal|B LBs frozen|C LBs removed').split('|')) {
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    const dir = sim.attackDir('O');
    const box = sim.defense.filter((d: any) => { const dep = (d.pos.x - sim.los) * dir; return dep >= 2.5 && dep <= 8 && Math.abs(d.pos.y - sim.ballY) < 6; });
    if (arm !== 'A normal') for (const d of box) {
      if (arm.startsWith('C')) d.body.pos = { x: d.pos.x + 70 * dir, y: d.pos.y };
      d.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: d.facing }) };
    }
    const r = sim.run();
    const o = out[arm] ??= { y: [], fc: [], who: {} };
    o.y.push(r.yards);
    const c = sim.events.find((e: any) => e.type === 'carrier_contact');
    if (c) { const d = sim.agents[c.b] ?? sim.agents[c.a]; o.fc.push(((c.pos?.x ?? 0) - sim.los) * dir);
      const g = box.includes(d) ? 'box LB' : /^D[ET]|NT/.test(d?.slot ?? '') ? 'DL' : /CB|S$|FS|SS|NB/.test(d?.slot ?? '') ? 'DB' : 'other'; o.who[g] = (o.who[g] ?? 0) + 1; }
  }
}
const q = (a: number[], f: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(f * (s.length - 1))].toFixed(1); };
const mean = (a: number[]) => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(2);
console.log(`${CONS.join('+')}: ${out['A normal'].y.length} snaps`);
for (const [arm, o] of Object.entries(out)) {
  const n = o.fc.length, who = Object.entries(o.who).map(([k, v]) => `${k} ${Math.round(100 * v / n)}%`).join(' ');
  console.log(`${arm.padEnd(14)} yards mean ${mean(o.y)} p50 ${q(o.y, .5)} p75 ${q(o.y, .75)} p90 ${q(o.y, .9)} | 10+ ${Math.round(100 * o.y.filter(x => x >= 10).length / o.y.length)}%  <=0 ${Math.round(100 * o.y.filter(x => x <= 0).length / o.y.length)}% | first contact x p50 ${q(o.fc, .5)} | first hitter: ${who}`);
}
