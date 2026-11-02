// Batch climber decomposition on native captured snaps (seeds 7..29 odd, saved stream). For every block_climb release:
// over the first 0.6 s after it, mean requested speed / achieved speed, heading of request vs achieved vs pre-release
// motion, distance to the released DL, hands/grasp joint between climber and DL, climber engagement, contact with the
// keeper, time to 1.5 yd off the DL. argv: worktree [schemes csv]
import { readFileSync } from 'node:fs';
const W = process.argv[2], SCH = new Set((process.argv[3] ?? 'power,counter,trap,insideZone').split(','));
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const rows: any[] = [];
const deg = (x: number, y: number) => Math.atan2(y, x) * 57.2958;
const adiff = (a: number, b: number) => { let d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return Math.abs(d); };
for (let seed = 7; seed <= 29; seed += 2) {
  let snaps: any[]; try { snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8')); } catch { continue; }
  snaps.forEach((p: any, idx: number) => {
    if (p.pass) return; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    const scheme = st.offCall?.run?.scheme; if (!SCH.has(scheme)) return;
    const sim: any = new PlaySim(st);
    const req = new Map<any, any>();
    for (const a of sim.offense) if (a.behavior instanceof RunBlocker) { const b: any = a.behavior, up = b.update.bind(b); b.update = (ag: any, s: any) => { const c = up(ag, s); req.set(ag, c); return c; }; }
    const open: any[] = [];
    const ev0 = sim.event.bind(sim);
    sim.event = (type: string, a: any, b: any, note?: string) => { ev0(type, a, b, note);
      if (type === 'block_climb' && a && note) { const m = /(?:secured|check) (\S+); (\S+) stays/.exec(note);
        const dl = m && sim.defense.find((d: any) => d.slot === m[1]), keeper = m && sim.offense.find((o: any) => o.slot === m[2]);
        if (dl) open.push({ a, dl, keeper, t0: sim.t, pre: { ...a.vel }, ticks: [] as any[], off15: null as number | null, scheme, seed, idx }); } };
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      for (const r of open) { if (r.done) continue; const dt = sim.t - r.t0; if (dt > 0.6 + 1e-9) { r.done = true; continue; }
        const a = r.a, c = req.get(a), dl = r.dl, d = Math.hypot(a.pos.x - dl.pos.x, a.pos.y - dl.pos.y);
        const joint = sim.world.joints.some((j: any) => (j.a === a.body && j.b === dl.body) || (j.b === a.body && j.a === dl.body));
        const jointAny = sim.world.joints.some((j: any) => j.a === a.body || j.b === a.body);
        const kd = r.keeper ? Math.hypot(a.pos.x - r.keeper.pos.x, a.pos.y - r.keeper.pos.y) : 9;
        if (r.off15 === null && d >= 1.5) r.off15 = dt;
        const ux = (dl.pos.x - a.pos.x) / (d || 1), uy = (dl.pos.y - a.pos.y) / (d || 1);
        const rin = c?.vel ? (c.vel.x * ux + c.vel.y * uy) / (Math.hypot(c.vel.x, c.vel.y) || 1) : NaN;
        const dlin = -(dl.vel.x * ux + dl.vel.y * uy);
        const kin = r.keeper ? ((r.keeper.vel.x - dl.vel.x) * ux + (r.keeper.vel.y - dl.vel.y) * uy) : NaN;
        r.ticks.push({ rin, dlin, kin, upx: c?.vel ? c.vel.x * sim.attackDir(a.team) : NaN, rs: c?.vel ? Math.hypot(c.vel.x, c.vel.y) : NaN, rh: c?.vel ? deg(c.vel.x, c.vel.y) : NaN, gs: Math.hypot(a.vel.x, a.vel.y), gh: deg(a.vel.x, a.vel.y),
          d, joint, jointAny, eng: a.engagement ? (a.engagement.defender === dl ? 'DL' : 'other') : '-', kc: kd < a.profile.radius + r.keeper?.profile.radius + 0.05, dlc: d < a.profile.radius + dl.profile.radius + 0.05 }); } };
    try { sim.run(); } catch { return; }
    for (const r of open) if (r.ticks.length) rows.push(r);
  });
}
const med = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : NaN; };
const share = (f: (r: any) => boolean, rs: any[]) => (rs.filter(f).length / Math.max(1, rs.length) * 100).toFixed(0) + '%';
const bySch: Record<string, any[]> = {};
for (const r of rows) (bySch[r.scheme] ??= []).push(r);
for (const [s, rs] of Object.entries(bySch)) {
  const first = (r: any, k: number) => r.ticks.slice(0, k);
  const m = (f: (t: any) => number, k = 12) => med(rs.map(r => med(first(r, k).map(f))));
  console.log(`\n${s}: releases ${rs.length}`);
  console.log(`  requested speed (0-0.6 s) ${m(t => t.rs).toFixed(2)} | achieved ${m(t => t.gs).toFixed(2)} | first 0.2 s req ${m(t => t.rs, 4).toFixed(2)} got ${m(t => t.gs, 4).toFixed(2)}`);
  console.log(`  request heading vs pre-release motion (first tick) ${med(rs.map(r => adiff(r.ticks[0].rh, deg(r.pre.x, r.pre.y)))).toFixed(0)} deg | achieved vs request (0-0.3 s) ${m(t => adiff(t.gh, t.rh), 6).toFixed(0)} deg | pre-release speed ${med(rs.map(r => Math.hypot(r.pre.x, r.pre.y))).toFixed(2)}`);
  console.log(`  joint with DL still on: at release ${share(r => r.ticks[0].joint, rs)} | at 0.2 s ${share(r => r.ticks[3]?.joint, rs)} | at 0.4 s ${share(r => r.ticks[7]?.joint, rs)} | any joint at 0.2 s ${share(r => r.ticks[3]?.jointAny, rs)}`);
  console.log(`  engaged with DL at 0.2 s ${share(r => r.ticks[3]?.eng === 'DL', rs)} | body contact with DL at 0.2 s ${share(r => r.ticks[3]?.dlc, rs)} | with keeper at 0.2 s ${share(r => r.ticks[3]?.kc, rs)}`);
  console.log(`  request toward the DL (cos, + = into him) first 0.2 s ${m(t => t.rin, 4).toFixed(2)} | DL velocity toward climber ${m(t => t.dlin, 4).toFixed(2)} yd/s | share of releases whose request points into the DL (cos > 0.2) ${share(r => r.ticks[0].rin > .2, rs)}`);
  for (const [lab, f] of [['into DL', (r: any) => r.ticks[0].rin > .2], ['around/away', (r: any) => !(r.ticks[0].rin > .2)]] as const) {
    const g = rs.filter(f as any); const mm = (h: (t: any) => number, k = 6) => med(g.map(r => med(r.ticks.slice(0, k).map(h))));
    console.log(`    [${lab}] n ${g.length} req ${mm(t => t.rs).toFixed(2)} got ${mm(t => t.gs).toFixed(2)} (0-0.3 s) | contact with DL at 0.2 s ${share(r => r.ticks[3]?.dlc, g)} | 1.5 yd off in 0.6 s ${share(r => r.off15 !== null, g)} | upfield req ${mm(t => t.upx).toFixed(2)}`);
  }
  console.log(`  dist to DL at release ${med(rs.map(r => r.ticks[0].d)).toFixed(2)} | at 0.3 s ${med(rs.map(r => r.ticks[5]?.d)).toFixed(2)} | 1.5 yd off within 0.6 s ${share(r => r.off15 !== null, rs)} (median ${med(rs.map(r => r.off15 ?? NaN)).toFixed(2)} s)`);
}
