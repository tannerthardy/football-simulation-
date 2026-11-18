// Deep zone man on throws of 15+ air yards (Integration, 2026-11-18). Staged throw at snap + T to each eligible receiver;
// kept when the ball's arrival spot is 15+ yd past the LOS. Deep men: defenders 10+ yd past the LOS at the release; the
// one nearest the arrival spot at the release. Per throw: his speed toward the arrival spot at +0/0.4/0.8/1.2 s (only while
// the ball is in the air), his backward speed and facing at the release, his distance at arrival; behavior kind/tags.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { writeFileSync } = await import('node:fs');
const COVS = (process.env.COVS ?? 'cover2,cover3,cover4,cover6').split(','), SEEDS = Number(process.argv[2] ?? 2);
const TS = (process.env.TS ?? '2.5').split(',').map(Number);
const out: any[] = [];
for (const coverage of COVS) for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= SEEDS; seed++) for (const T of TS) {
    const setup: any = nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip: seed % 2 === 0 });
    let dry: any; try { dry = new PlaySim(setup); } catch { continue; }
    for (let i = 0; i < 400 && (dry.snapAt ?? -1) < 0; i++) dry.tick();
    const snap = dry.snapAt ?? 0;
    for (const slot of ['X', 'Z', 'Y', 'H', 'F']) {
      if (!dry.offense.some((o: any) => o.slot === slot && o.behavior?.route)) continue;
      let sim: any; try { sim = new PlaySim({ ...setup, stagedThrow: { at: snap + T, slot } }); } catch { continue; }
      const dir = sim.attackDir(sim.offense[0].team), los = sim.los, N = (p: any) => ({ x: (p.x - los) * dir, y: p.y });
      const snaps: any[] = []; let rel = -1, arrT = -1, arrP: any = null;
      const tick = sim.tick.bind(sim);
      sim.tick = () => { tick(); if (sim.ball.kind === 'air' && rel < 0) { rel = sim.t; arrT = sim.ball.arrivalT; }
        if (rel >= 0 && !arrP) { snaps.push({ t: sim.t - rel, d: sim.defense.map((d: any) => ({ slot: d.slot, p: N(d.pos), v: { x: d.vel.x * dir, y: d.vel.y }, f: d.body.facing, kind: d.behavior?.kind ?? null, tags: [...(d.tags ?? [])].filter((t: string) => t !== 'onBall') })) });
          if (sim.ball.kind !== 'air' || sim.t >= arrT - 1e-9) arrP = sim.ball.kind === 'air' ? N(sim.ball.flight.pos) : null; } };
      let r: any; try { r = sim.run(); } catch { continue; }
      if (rel < 0 || !snaps.length) continue;
      const last = snaps[snaps.length - 1]; const bp = arrP ?? (sim.stats.airYards != null ? null : null);
      const cp = arrP ?? N(sim.ball.flight?.pos ?? { x: 0, y: 0 });
      if (cp.x < 15) continue;
      const s0 = snaps[0]; const deep = s0.d.filter((d: any) => d.p.x >= 10);
      if (!deep.length) continue;
      const dm = deep.reduce((a: any, b: any) => Math.hypot(b.p.x - cp.x, b.p.y - cp.y) < Math.hypot(a.p.x - cp.x, a.p.y - cp.y) ? b : a);
      const at = (tt: number) => { const s = snaps.find((q: any) => q.t >= tt - 1e-6); if (!s || s.t > snaps[snaps.length - 1].t) return null; const d = s.d.find((q: any) => q.slot === dm.slot);
        const ux = cp.x - d.p.x, uy = cp.y - d.p.y, l = Math.hypot(ux, uy) || 1; return +((d.v.x * ux + d.v.y * uy) / l).toFixed(2); };
      const flight = snaps[snaps.length - 1].t;
      const dA = last.d.find((q: any) => q.slot === dm.slot);
      const fx = Math.cos(dm.f) * dir, fy = Math.sin(dm.f);
      out.push({ coverage, concept, formation, seed, slot, T, flight: +flight.toFixed(2), air: +cp.x.toFixed(1), d0: +Math.hypot(dm.p.x - cp.x, dm.p.y - cp.y).toFixed(1),
        depth: +dm.p.x.toFixed(1), back: +dm.v.x.toFixed(2), speed: +Math.hypot(dm.v.x, dm.v.y).toFixed(2), faceLOS: +(Math.acos(Math.max(-1, Math.min(1, -fx))) * 180 / Math.PI).toFixed(0),
        v: [0, 0.4, 0.8, 1.2].map((tt) => tt <= flight + 1e-6 ? at(tt) : null), dArr: +Math.hypot(dA.p.x - cp.x, dA.p.y - cp.y).toFixed(1),
        kind: dm.kind, tags: dm.tags, kindArr: dA.kind, tagsArr: dA.tags, caught: !!sim.stats.completed, int: sim.events.some((e: any) => e.type === 'interception'), pbu: sim.events.some((e: any) => /pbu|deflect|breakup/.test(e.type)) });
    }
  }
writeFileSync(process.argv[3], JSON.stringify(out)); console.log('rows', out.length);
