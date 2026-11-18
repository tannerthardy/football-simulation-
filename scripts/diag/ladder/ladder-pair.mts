// Paired per-play dump for old vs ladder (Coverage, 2026-11-18). Staged zone set. Per play: result, YAC, coverage, the
// target; per underneath zone defender: his zone, his old-mode job/tags at the release, at T* (the true ball nearest him,
// catchable heights) his distance to the ball, whether he was on the ball in flight (onBall tag), and his distance to the
// catch point at the catch. usage: [flags] node --import tsx out/ladder-pair.mts seeds out.json
const W = process.cwd(), seeds = Number(process.argv[2] ?? 1), OUT = process.argv[3];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { isDeepZone } = await import(`${W}/src/playbook/alignment.ts`);
const plays: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        let rel: number | null = null, T: any = null, ev: string | null = null; const track = new Map<any, any[]>(); const relTags = new Map<any, any>();
        const tb = sim.throwBall.bind(sim); sim.throwBall = (p: any, target: any, ...r: any[]) => { if (p === sim.qb && !T && target) T = target; return tb(p, target, ...r); };
        const e0 = sim.event.bind(sim); sim.event = (type: string, ...r: any[]) => { if (rel !== null && !ev && ['catch', 'pbu', 'interception', 'incomplete', 'drop', 'miss', 'deflection'].includes(type)) ev = type; return e0(type, ...r); };
        const tick = sim.tick.bind(sim);
        sim.tick = () => { const t = sim.t; tick();
          for (const d of sim.defense) { const z = d.behavior?.zone ?? d.behavior?.recordedZone?.(); if (!z || isDeepZone(z)) continue;
            if (rel === null && sim.ball?.kind !== 'air') relTags.set(d, { tags: [...d.tags], job: d.behavior?.job ?? d.behavior?.constructor?.name });
            if (sim.ball?.kind === 'air') (track.get(d) ?? track.set(d, []).get(d)!).push({ t, x: d.pos.x, y: d.pos.y, onBall: d.tags.has('onBall') }); }
          if (rel === null && sim.ball?.kind === 'air') rel = t; };
        let res: any; try { res = sim.run(); } catch { continue; }
        if (rel === null || !sim.ballPath?.length || !T) continue;
        const men: any[] = [];
        for (const [d, Tr] of track) {
          const path = sim.ballPath.filter((p: any) => p.z <= d.profile.maxCatchHeight);
          let best = Infinity; for (const s of Tr) { const b = sim.ballPath.reduce((m: any, p: any) => (Math.abs(p.t - s.t) < Math.abs(m.t - s.t) ? p : m)); if (b.z <= d.profile.maxCatchHeight) best = Math.min(best, Math.hypot(b.x - s.x, b.y - s.y)); }
          if (!Number.isFinite(best) || best > 8) continue;
          men.push({ slot: d.slot, zone: d.behavior?.zone ?? d.behavior?.recordedZone?.(), job: relTags.get(d)?.job, tags: (relTags.get(d)?.tags ?? []).filter((x: string) => /cov-|trap|rob|wall|apex|carry|flat|settle/.test(x)), tStar: +best.toFixed(2), onBall: Tr.some((s) => s.onBall), reach: d.profile.reach + 0.3 });
        }
        plays.push({ key: `${concept}/${coverage}/${formation}/${seed}/${flip}`, coverage, ev: ev ?? 'none', comp: !!res.stats.completed, yac: res.stats.yac ?? null, route: T.behavior?.route?.id ?? null, men });
      }
(await import('node:fs')).writeFileSync(OUT, JSON.stringify(plays));
console.log('plays', plays.length);
