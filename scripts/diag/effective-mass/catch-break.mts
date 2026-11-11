// Why a hold on a receiver after the catch breaks (Integration for Tanner, 2026-11-10: DB solo tackles from behind
// break 34-38% vs NFL 18%). Live games, flags via env. Every grasp on a catcher (the carrier after a completed pass) at
// formation: the holder's slot, his approach (bearing from the runner against the runner's travel, 45 deg cones), open
// field (no offensive non-carrier within 2 yd of the holder), origin, legs share, lock, capacity, the runner's speed and
// the speed difference along the runner's travel at the grab. Per tick until the hold ends: centre distance against reach,
// the grip's load (|normal| + |tangent| force) against its current capacity, the holder's support state and speed. At the
// end (help = other defenders downfield of the carrier within 10 yd at the grab): how it ended -- 'reach' (slid past reach), 'capacity' (capacity gone), 'lower' (a lower hold released), or 'down'
// (the play ended with it on) -- and how long it lasted; and the largest load/capacity reached.
// usage: [flags] node --import tsx scripts/diag/effective-mass/catch-break.mts [first seed] [games] > out.jsonl
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const DB = /^(CB|NB|FS|SS|S_)/; const r2 = (x: number) => Number.isFinite(x) ? +x.toFixed(2) : null;
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.isPass) return undefined;
    const seen = new Map<any, any>(); const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); const c = sim.carrier, w = sim.world;
      if (c && c !== sim.qb && sim.throwAt >= 0) for (const j of w.joints) if (j.kind === 'grasp' && j.b === c.body && !seen.has(j)) {
        const d = sim.agents.find((a: any) => a.body === j.a); const sp = Math.hypot(c.vel.x, c.vel.y);
        const rx = j.a.pos.x - c.pos.x, ry = j.a.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1, cos = sp > 0.5 ? (rx * c.vel.x + ry * c.vel.y) / (rd * sp) : 1;
        const ux = sp > 0.5 ? c.vel.x / sp : 1, uy = sp > 0.5 ? c.vel.y / sp : 0;
        const open = !sim.offense.some((o: any) => o !== c && Math.hypot(o.pos.x - j.a.pos.x, o.pos.y - j.a.pos.y) <= 2);
        // Help: other defenders ahead of the carrier (downfield of him along the attack direction) within 10 yd of him:
        // a proxy for Defense's class (teammates deeper who can still reach his path). 0 = the last man.
        const dirx = sim.attackDir(c.team);
        const help = sim.defense.filter((o: any) => o !== d && !o.isDown(sim.t) && (o.pos.x - c.pos.x) * dirx > 0 && Math.hypot(o.pos.x - c.pos.x, o.pos.y - c.pos.y) <= 10).length;
        seen.set(j, { help, slot: d?.slot, db: DB.test(d?.slot ?? ''), from: cos > Math.SQRT1_2 ? 'front' : cos < -Math.SQRT1_2 ? 'behind' : 'side', open, origin: j.origin, legs: r2(j.legs), lock: r2(j.lock ?? NaN),
          cap0: r2(j.capacity), runner: r2(sp), rs: r2(c.profile.power / c.profile.massKg), hs: r2(j.a.profile.power / j.a.profile.massKg), rkg: r2(c.profile.massKg), hkg: r2(j.a.profile.massKg), x0: c.pos.x * dirx, dirx, v05: null as number | null, gained: null as number | null, dv: r2((c.vel.x - j.a.vel.x) * ux + (c.vel.y - j.a.vel.y) * uy), t0: sim.t, maxLoad: 0, minMargin: Infinity, holderDown: false, end: null, dist: [] as number[] }); }
      for (const [j, r] of seen) { if (r.v05 === null && sim.t - r.t0 >= 0.5 - 1e-9 && sim.carrier) r.v05 = Math.hypot(sim.carrier.vel.x, sim.carrier.vel.y);
        if (r.end) continue;
        const cap = (w as any).gripCapacity ? (w as any).gripCapacity(j) : j.capacity;
        const load = Math.abs(j.normalForce ?? 0) + Math.abs(j.tangentForce ?? 0); r.maxLoad = Math.max(r.maxLoad, cap > 0 ? load / cap : 9);
        const d = Math.hypot(j.a.pos.x - j.b.pos.x, j.a.pos.y - j.b.pos.y); r.minMargin = Math.min(r.minMargin, j.reach - d);
        if (j.a.support?.state !== 'up') r.holderDown = true;
        // Holders on him now (distinct bodies with an unbroken grasp), his stride bound (HELD_SWING), and his fall.
        const hs = new Set(w.joints.filter((k: any) => k.kind === 'grasp' && !k.broken && k.b === j.b).map((k: any) => k.a)).size;
        r.maxHolders = Math.max(r.maxHolders ?? 0, hs);
        const bi = (w as any).indexOf ? (w as any).indexOf(j.b) : -1, bound = bi >= 0 ? ((w as any).strideHolds?.[bi] ?? 0) : 0;
        if (r.boundAt == null && bound >= 0.999) { r.boundAt = r2(sim.t - r.t0); r.boundHolders = hs; }
        if (r.fellAt == null && j.b.support?.state !== 'up') { r.fellAt = r2(sim.t - r.t0); r.fellCause = j.b.support?.cause; r.fellHolders = hs; }
        if (j.broken || !w.joints.includes(j)) { r.end = j.broken ? (cap <= 0 ? 'capacity' : d > j.reach || (j.hold ?? 0) > j.reach ? 'reach' : 'lower') : 'removed'; r.dur = sim.t - r.t0; r.lastDist = d; r.lastReach = j.reach; r.gained = (sim.carrier ?? j.b).pos.x * r.dirx - r.x0; } } };
    const res = sim.run();
    for (const [j, r] of seen) { if (!r.end) { r.end = 'down'; r.dur = sim.t - r.t0; r.gained = j.b.pos.x * r.dirx - r.x0; }
      console.log(JSON.stringify({ ...r, t0: undefined, dist: undefined, x0: undefined, dirx: undefined, gained: r2(r.gained), v05: r2(r.v05), dur: r2(r.dur), maxLoad: r2(r.maxLoad), minMargin: r2(r.minMargin), lastDist: r2(r.lastDist), lastReach: r2(r.lastReach), playYards: res?.yards ?? null })); }
    return res; } } });
}
