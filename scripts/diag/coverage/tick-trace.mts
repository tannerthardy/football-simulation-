// node --import tsx scripts/diag/coverage/tick-trace.mts
// One play per technique (open-carry-cross, zone-settle): the underneath defender nearest a crosser's catch point at the
// release, every tick from 1.0 s before the release: raw request, each stage's rewrite (containment, coverage
// orientation, open-to-ball), final command, body facing and velocity at the step start and its end.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const want = new Set((process.argv[2] ?? 'open-carry-cross,zone-settle').split(','));
const deg = (r: number | undefined) => r === undefined ? '   -' : (((r * 180 / Math.PI) % 360 + 540) % 360 - 180).toFixed(0).padStart(4);
const v = (p: any, dir: number, up: number) => p ? `(${(p.x * up).toFixed(1).padStart(5)},${(p.y * dir).toFixed(1).padStart(5)})` : '      -      ';
const setup = (k: any) => nativeTraceSetup(k);
outer: for (const concept of ['drive', 'mesh', 'y_cross', 'hitch_cross', 'post_cross', 'dagger']) for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6', 'cover3_mable', 'cover9'])
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= 2; seed++) for (const flip of [false, true]) {
    if (!want.size) break outer;
    const key = { coverage, concept, seed, roster: seed, formation, flip };
    let sim: any; try { sim = new PlaySim(setup(key)); } catch { continue; }
    const lab = new Map<any, string[]>(); const hist: any[] = [];
    for (const d of sim.defense) { const b = d.behavior; if (!b?.update) continue; const u = b.update.bind(b); b.update = (a: any, s: any) => { const c = u(a, s); (lab.get(d) ?? lab.set(d, []).get(d)!).push(`${s.t.toFixed(2)}:${facingTechnique(c)?.label ?? ''}`); return c; }; }
    let T: any = null, aim: any = null, tT = 0, route = '?';
    const tb = sim.throwBall.bind(sim); sim.throwBall = (p: any, target: any, v0: any, intended: any, ...r: any[]) => { if (p === sim.qb && !T && target) { T = target; aim = intended; tT = sim.t; route = target.behavior?.route?.id ?? '?'; } return tb(p, target, v0, intended, ...r); };
    const tick = sim.tick.bind(sim); sim.tick = () => { tick(); hist.push({ t: sim.t, p: new Map(sim.defense.map((q: any) => [q, { x: q.pos.x, y: q.pos.y }])) }); };
    try { sim.run(); } catch { continue; }
    if (!T || !/cross|shallow|mesh|drag|under|dig|over/.test(route)) continue;
    const up = sim.attackDir('O');
    const R = hist.reduce((b: any, h: any) => Math.abs(h.t - tT) < Math.abs(b.t - tT) ? h : b, hist[0]);
    let best: any = null, bd = 1e9;
    for (const d of sim.defense) { const p = R.p.get(d); const dd = (p.x - sim.los) * up; if (dd < 0 || dd > 14 || !/LB|CB|S|DB|NB/.test(d.player.position)) continue; const k = Math.hypot(p.x - aim.x, p.y - aim.y); if (k < bd) { bd = k; best = d; } }
    if (!best) continue;
    const at04 = (lab.get(best) ?? []).filter(s => Math.abs(Number(s.split(':')[0]) - (tT - 0.4)) < 0.03).map(s => s.split(':')[1])[0];
    if (!at04 || !want.has(at04)) continue;
    want.delete(at04);
    const sim2: any = new PlaySim(setup(key));
    const tr = sim2.recordCommands({ actor: { team: best.team, slot: best.slot }, from: tT - 1.0, to: tT + 0.001 });
    sim2.run();
    const tgt2 = sim2.offense.find((q: any) => q.slot === T.slot);
    const dir = Math.sign(T.vel.y) || 1;
    console.log(`\n== ${at04}: ${concept} ${coverage} ${formation} seed ${seed} flip ${flip} | ${best.slot} (${best.player.position}) vs ${T.slot} ${route}, release ${tT.toFixed(2)} s`);
    console.log('   (velocities as (downfield, along the crosser\'s travel); angles: 0 = downfield, + toward his travel)');
    console.log('   t      label              raw vel        contain        orient        final         | face req  orient  body0  body1 | body vel0      body vel1');
    for (const s of tr.steps) {
      if (!s.decision) continue;
      const rw = (st: string) => s.rewrites.find((r: any) => r.stage === st)?.command;
      const c = rw('containment'), o = rw('coverage-orientation');
      const fa = (r: number | undefined) => r === undefined ? undefined : Math.atan2(Math.sin(r) * dir, Math.cos(r) * up);
      console.log(`  ${s.stepStart.toFixed(2)} ${String(s.decision.raw.facingTechnique ?? '').padEnd(18)} ${v(s.decision.raw.vel, dir, up)} ${v(c?.vel, dir, up)} ${v(o?.vel, dir, up)} ${v(s.final?.vel, dir, up)} | ${deg(fa(s.decision.raw.facing))} ${deg(fa(o?.facing))} ${deg(fa(s.start.body.facing))} ${deg(fa(s.endpoint?.body.facing))} | ${v(s.start.body.velocity, dir, up)} ${v(s.endpoint?.body.velocity, dir, up)}`);
    }
  }
