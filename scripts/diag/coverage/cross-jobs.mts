// node --import tsx scripts/diag/coverage/cross-jobs.mts [seeds]
// Crosser throws (slide-control's crosser set): at the release, the defender nearest the target's catch point among
// underneath LB/DB (0-12 yd deep): his job and technique label; also route depth. usage: [flags] node --import tsx out/cross-jobs.mts seeds
const W = process.cwd(), seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const tally = new Map<string, { n: number; c: number; y: number }>();
for (const concept of ['mesh', 'drive', 'y_cross', 'hitch_cross', 'post_cross']) for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6', 'cover3_mable', 'cover9'])
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const last = new Map<any, string>();
    for (const d of sim.defense) { const b = d.behavior; if (!b?.update) continue; const u = b.update.bind(b);
      b.update = (a: any, s: any) => { const cmd = u(a, s); const sub = (b as any).sub; last.set(d, `${(b as any).job ?? b.constructor.name}|${facingTechnique(cmd)?.label ?? (sub?.constructor?.name ?? '-')}`); return cmd; }; }
    let T: any = null, route = '?', snap: any = null, aim: any = null;
    const tb = sim.throwBall.bind(sim); sim.throwBall = (p: any, target: any, v0: any, intended: any, ...r: any[]) => { if (p === sim.qb && !T && target) { T = target; aim = intended; route = target.behavior?.route?.id ?? target.behavior?.fallback?.route?.id ?? '?'; snap = new Map([...last]); } return tb(p, target, v0, intended, ...r); };
    let res: any; try { res = sim.run(); } catch { continue; }
    if (!T || !/cross|shallow|mesh|drag|under/.test(route)) continue;
    const up = sim.attackDir('O'); const depth = (aim.x - sim.los) * up;
    let best: any = null, bd = 1e9;
    for (const d of sim.defense) { const dd = (d.pos.x - sim.los) * up; if (dd < 0 || dd > 14 || !/LB|CB|S|DB|NB/.test(d.player.position)) continue; const k = Math.hypot(d.pos.x - aim.x, d.pos.y - aim.y); if (k < bd) { bd = k; best = d; } }
    const key = `${depth <= 7 ? 'shallow' : 'deep'} ${snap.get(best) ?? '?'}`;
    const t = tally.get(key) ?? { n: 0, c: 0, y: 0 }; t.n++; t.c += res.stats.completed ? 1 : 0; t.y += res.yards ?? 0; tally.set(key, t);
  }
for (const [k, t] of [...tally].sort((a, b) => b[1].n - a[1].n)) console.log(`${k.padEnd(60)} n ${String(t.n).padStart(3)} comp ${(100 * t.c / t.n).toFixed(0)}% yd ${(t.y / t.n).toFixed(1)}`);
