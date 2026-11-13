// Side/behind holders on the fixed run set (HOLD_FACING on): per tick of the first 0.5 s of the hold, the branch that
// set his intent, his requested facing vs his body facing, and his body's turn that tick. Splits the turn into ticks
// where he asked to keep his facing (|request - body| < 3 deg) vs ticks where the request turned him.
// Approach at his first tick in the bond: his bearing from the runner against the runner's travel (within 45 deg front, beyond 135 behind, else side; runner >= 1 yd/s). Fixed run set out/matched-restage (seeds 7-29).
// usage: HOLD_FACING=1 node --import tsx scripts/diag/effective-mass/holdyaw.mts
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const deg = (a: number) => Math.abs(wrap(a)) * 180 / Math.PI;
const H: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); const tick = sim.tick.bind(sim); const M = new Map<any, any>();
  sim.tick = () => {
    const before = new Map<any, number>(); const bond = sim.bond;
    if (bond) for (const d of bond.tacklers) before.set(d, d.body.facing);
    tick();
    const c = sim.carrier; if (!bond || !c || sim.bond !== bond) return;
    for (const d of bond.tacklers) {
      if (!before.has(d)) continue;
      let h = M.get(d);
      if (!h) { const cs = Math.hypot(c.vel.x, c.vel.y); if (cs < 1) continue;
        const bx = d.pos.x - c.pos.x, by = d.pos.y - c.pos.y; const cosA = (bx * c.vel.x + by * c.vel.y) / (Math.hypot(bx, by) * cs);
        const app = cosA > Math.cos(Math.PI / 4) ? 'front' : cosA < -Math.cos(Math.PI / 4) ? 'behind' : 'side';
        h = { app, t0: sim.t, f0: before.get(d), ticks: [] as any[] }; M.set(d, h); H.push(h); }
      if (sim.t - h.t0 > 0.5) continue;
      const it = sim.intents[d.idx]; const own = it?.facing;
      const tx = c.pos.x - d.pos.x, ty = c.pos.y - d.pos.y, dist = Math.hypot(tx, ty), cs = Math.hypot(c.vel.x, c.vel.y);
      const into = cs > 0.5 ? (c.vel.x * -tx / dist + c.vel.y * -ty / dist) / cs : 1;
      const branch = c.body.support?.state !== 'up' ? 'runner down' : into > 0.3 ? 'in front' : (d.body.support?.strike || it?.lunge) ? 'strike' : 'plant';
      const turn = deg(d.body.facing - before.get(d)!), reqOff = own === undefined ? NaN : deg(own - before.get(d)!);
      h.ticks.push({ branch, turn, held: reqOff < 3, reqOff, sq: deg((own ?? 0) - Math.atan2(ty, tx)), up: d.body.support?.state === 'up', eng: !!d.engagement });
    }
  };
  sim.run();
}
for (const app of ['side', 'behind', 'front']) {
  const g = H.filter(h => h.app === app && h.ticks.length >= 5); const T = g.flatMap(h => h.ticks);
  const sum = (f: (x: any) => boolean) => T.filter(f).reduce((a: number, x: any) => a + x.turn, 0);
  const tot = sum(() => true);
  const rot = g.map(h => h.ticks.reduce((a: number, x: any) => a + x.turn, 0)).sort((a: number, b: number) => a - b);
  console.log(`== ${app}: ${g.length} holds, summed turn over the first 0.5 s p50 ${rot[Math.floor(rot.length / 2)]?.toFixed(0)} deg`);
  const br = new Map<string, number[]>(); for (const x of T) { if (!br.has(x.branch)) br.set(x.branch, [0, 0]); br.get(x.branch)![0]++; br.get(x.branch)![1] += x.turn; }
  console.log('   by branch (share of ticks / share of turn): ' + [...br].map(([k, [n, s]]) => `${k} ${(100 * n / T.length).toFixed(0)}% / ${(100 * s / tot).toFixed(0)}%`).join(', '));
  console.log(`   turn on ticks where he asked to keep his facing ${(100 * sum(x => x.held) / tot).toFixed(0)}% (${(100 * T.filter((x: any) => x.held).length / T.length).toFixed(0)}% of ticks); off his feet ${(100 * sum(x => !x.up) / tot).toFixed(0)}% of turn; engaged ${(100 * sum(x => x.eng) / tot).toFixed(0)}%`);
}
