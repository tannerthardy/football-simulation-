import { readFileSync } from 'node:fs';
const W = process.argv[2], CON = process.argv[3] ?? 'outsideZone';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const rows: Record<string, { blk: number[]; lb: number[]; dy: number[] }> = {};
for (let seed = 7; seed <= 29; seed += 2) {
  for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
    if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== CON) continue;
    const sim: any = new PlaySim(st);
    const lbs = sim.defense.filter((d: any) => /LB/.test(d.slot));
    const open = new Map<any, any>();
    while (sim.t < 4 && sim.phase === 'live') { sim.tick();
      const car = sim.ball?.kind === 'held' ? sim.ball.carrier : null;
      for (const d of lbs) { const e = d.engagement;
        if (e && e.blocker && !open.has(d) && car && car !== sim.qb) {
          const b = e.blocker, pl = (b.behavior as any)?.plan;
          const side = Math.sign(car.pos.y - d.pos.y) || 1;
          open.set(d, { b, t: sim.t, by: b.pos.y, dy0: d.pos.y, side, key: `${pl?.kind ?? '?'}${pl?.combination ? '+combo' : ''} drive.y*side ${(pl?.drive?.y ?? 0) * side > .2 ? 'toward' : (pl?.drive?.y ?? 0) * side < -.2 ? 'away' : 'up'} e.drive ${((e.drive?.y ?? 0) * side) > .2 ? 'toward' : ((e.drive?.y ?? 0) * side) < -.2 ? 'away' : 'up'}` });
        }
        const o = open.get(d);
        if (o && !o.done && sim.t >= o.t + 1) { o.done = true; const r = rows[o.key] ??= { blk: [], lb: [], dy: [] };
          r.blk.push((o.b.pos.y - o.by) * o.side); r.lb.push((d.pos.y - o.dy0) * o.side); }
      }
    }
  }
}
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)].toFixed(2) : '-'; };
for (const [k, r] of Object.entries(rows).sort((a, b) => b[1].blk.length - a[1].blk.length)) console.log(String(r.blk.length).padStart(4), k.padEnd(48), 'blk', med(r.blk), 'lb', med(r.lb));
