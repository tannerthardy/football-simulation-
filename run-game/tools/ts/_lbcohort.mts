import { readFileSync } from 'node:fs';
const W = process.argv[2], CON = process.argv[3] ?? 'outsideZone';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
if (process.argv[4] === "nm") (globalThis as any).__noMirror = true;
const rows: Record<string, { blk: number[]; lb: number[] }> = {};
for (let seed = 7; seed <= 29; seed += 2) {
  for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
    if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== CON) continue;
    const sim: any = new PlaySim(st); sim.tick();
    const dir = sim.attackDir('O');
    const lbs = sim.defense.filter((d: any) => { const dep = (d.pos.x - sim.los) * dir; return dep >= 2.5 && dep <= 8 && Math.abs(d.pos.y - sim.ballY) < 6; });
    const open = new Map<any, any>();
    while (sim.t < 4.5 && sim.phase === 'live') { sim.tick();
      const car = sim.ball?.kind === 'held' ? sim.ball.carrier : null;
      if (!car) continue;
      for (const d of lbs) {
        if (!open.has(d)) {
          const near = sim.offense.filter((o: any) => o !== car && o !== sim.qb && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) < 1.2);
          if (!near.length) continue;
          const b = near.sort((x: any, y: any) => Math.hypot(x.pos.x - d.pos.x, x.pos.y - d.pos.y) - Math.hypot(y.pos.x - d.pos.x, y.pos.y - d.pos.y))[0];
          const pl = (b.behavior as any)?.plan;
          open.set(d, { b, t: sim.t, by: b.pos.y, dy: d.pos.y, side: Math.sign(car.pos.y - d.pos.y) || 1, kind: `${b.slot.replace(/^[LR]/, '')}:${pl?.kind ?? b.behavior?.kind ?? '?'}${pl?.target === d ? '' : ' (not his man)'}`, eng: false });
        }
        const o = open.get(d);
        if (!o.done && sim.t <= o.t + .3 && d.engagement && (d.engagement.blocker === o.b || d.engagement.helpers?.includes(o.b))) o.eng = true;
        if (!o.done && sim.t >= o.t + 1) { o.done = true; const k = `${o.eng ? 'ENG ' : 'pass'} ${o.kind}`; const r = rows[k] ??= { blk: [], lb: [] };
          r.blk.push((o.b.pos.y - o.by) * o.side); r.lb.push((d.pos.y - o.dy) * o.side); }
      }
    }
  }
}
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)].toFixed(2) : '-'; };
let tot = 0; for (const r of Object.values(rows)) tot += r.blk.length;
console.log('total', tot);
for (const [k, r] of Object.entries(rows).sort((a, b) => b[1].blk.length - a[1].blk.length).slice(0, 18)) console.log(String(r.blk.length).padStart(4), k.padEnd(36), 'blk', med(r.blk), 'lb', med(r.lb));
