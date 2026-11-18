// node --import tsx scripts/diag/coverage/qb-eyes.mts [seeds]
// Staged dropbacks vs zone: when the QB's head (a.head) and body (body.facing) come within 20 deg of his bearing to the
// catch point, for the last unbroken run ending at the release (s before the release); underneath LB/DB (0-12 yd deep,
// within 8 yd of the release->catch line) lateral velocity toward the catch side at the release and 0/0.2/0.4 s after
// the head came to it. usage: node --import tsx qb-eyes.mts seeds  (run from the repo root)
const W = process.cwd(), seeds = Number(process.argv[2] ?? 1);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && c.family !== 'playaction').map(([id]) => id);
const ON = 20 * Math.PI / 180, ang = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const headCame: number[] = [], bodyCame: number[] = [], vRel: number[] = [], v0: number[] = [], v2: number[] = [], v4: number[] = [];
for (const concept of concepts) for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6', 'cover3_mable', 'cover9'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip })); } catch { continue; }
    const H: any[] = [];
    const tick = sim.tick.bind(sim); sim.tick = () => { tick(); H.push({ t: sim.t, head: sim.qb.head, body: sim.qb.body.facing, qb: { ...sim.qb.pos }, d: new Map(sim.defense.map((q: any) => [q, { x: q.pos.x, y: q.pos.y, vy: q.vel.y }])) }); };
    let tT = -1, aim: any = null; const tb = sim.throwBall.bind(sim); sim.throwBall = (p: any, tg: any, v0_: any, intended: any, ...r: any[]) => { if (p === sim.qb && tT < 0) { tT = sim.t; aim = intended; } return tb(p, tg, v0_, intended, ...r); };
    try { sim.run(); } catch { continue; }
    if (tT < 1.0 || !aim) continue;
    const pre = H.filter(h => h.t <= tT + 1e-9); if (pre.length < 20) continue;
    const came = (key: string) => { let k = pre.length - 1; while (k >= 0 && pre[k][key] !== undefined && pre[k][key] !== null && ang(pre[k][key], Math.atan2(aim.y - pre[k].qb.y, aim.x - pre[k].qb.x)) < ON) k--; return k === pre.length - 1 ? null : tT - pre[k + 1].t; };
    const hc = came('head'), bc = came('body'); headCame.push(hc ?? -1); bodyCame.push(bc ?? -1);
    const R = pre[pre.length - 1]; const up = sim.attackDir('O');
    const side = Math.sign(aim.y - R.qb.y) || 1;
    for (const d of sim.defense) {
      const p = R.d.get(d); const dep = (p.x - sim.los) * up; if (dep < 0 || dep > 12 || !/LB|CB|S|DB/.test(d.player.position)) continue;
      const lx = R.qb.x + (aim.x - R.qb.x) * Math.max(0, Math.min(1, ((p.x - R.qb.x) * (aim.x - R.qb.x) + (p.y - R.qb.y) * (aim.y - R.qb.y)) / ((aim.x - R.qb.x) ** 2 + (aim.y - R.qb.y) ** 2)));
      const ly = R.qb.y + (aim.y - R.qb.y) * Math.max(0, Math.min(1, ((p.x - R.qb.x) * (aim.x - R.qb.x) + (p.y - R.qb.y) * (aim.y - R.qb.y)) / ((aim.x - R.qb.x) ** 2 + (aim.y - R.qb.y) ** 2)));
      if (Math.hypot(p.x - lx, p.y - ly) > 8) continue;
      vRel.push(p.vy * side);
      if (hc !== null) { const at = (dt: number) => { const t = tT - hc + dt; if (t > tT) return null; const h = pre.reduce((b: any, x: any) => Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b); return h.d.get(d).vy * side; };
        for (const [arr, dt] of [[v0, 0], [v2, 0.2], [v4, 0.4]] as const) { const v = at(dt); if (v !== null) (arr as number[]).push(v); } }
    }
  }
const q = (v: number[]) => { const w = [...v].sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(2)).join('/') : '-'; };
const share = (v: number[]) => (v.filter(x => x < 0).length / v.length * 100).toFixed(0);
console.log(`sim throws ${headCame.length}: head on the catch side (20 deg) before the release p25/50/75 ${q(headCame.filter(x => x >= 0))} s (never ${share(headCame)}%); body ${q(bodyCame.filter(x => x >= 0))} s (never ${share(bodyCame)}%)`);
console.log(`underneath men n ${vRel.length}: lateral toward the catch side at the release p25/50/75 ${q(vRel)} yd/s; after the head came: 0 s ${q(v0)} (n ${v0.length}), 0.2 s ${q(v2)} (n ${v2.length}), 0.4 s ${q(v4)} (n ${v4.length})`);
