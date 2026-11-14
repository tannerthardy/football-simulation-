// Broken tackles on run plays (Integration, 2026-11-14, ENGAGE_FELT's broken-tackle row). Per broken_tackle event on a
// designed run: engaged grab or hold; the tackler's state when he took hold (engaged then, came off a block in the last
// 1.0 s, or free), his speed, his support (capture-point deviation over base), how far he reached; per arm, the grasps
// taken and the share broken, by that state.
// usage: [ENGAGE_FELT=1] node --import tsx scripts/diag/effective-mass/break-trace.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { supportParams, baseRadiusAt } = await import(`${W}/src/physics/support.js`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
let runs = 0; const grasps: any[] = [], breaks: any[] = [];
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.run) return undefined;
  runs++;
  const offAt = new Map<any, number>(), held = new Map<any, any>(); const seen = new Set<any>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const engagedBefore = new Set(sim.defense.filter((d: any) => sim.engagements.some((e: any) => e.defender === d)));
    tick();
    for (const d of engagedBefore) if (!sim.engagements.some((e: any) => e.defender === d)) offAt.set(d, sim.t);
    for (const ev of sim.events) {
      if (seen.has(ev)) continue; seen.add(ev);
      const d = sim.agents[ev.b ?? ev.d ?? -1] ?? null;
      if (ev.type === 'broken_tackle') { const h = held.get(sim.agents[ev.b]) ?? {}; breaks.push({ detail: ev.note, ...h }); }
      void d;
    }
    for (const d of sim.defense) {
      const grip = sim.world.joints?.find?.((j: any) => j.kind === 'grasp' && j.a === d.body);
      if (grip && !held.has(d)) {
        const engaged = sim.engagements.some((e: any) => e.defender === d), since = sim.t - (offAt.get(d) ?? -Infinity);
        const su = d.body.support, dev = su ? Math.hypot(su.xi.x, su.xi.y) / baseRadiusAt(supportParams(d.profile), su.posture) : 0;
        const st = engaged ? 'engaged' : since <= 1.0 ? 'off a block <= 1 s' : 'free';
        const r = { st, v: Math.hypot(d.vel.x, d.vel.y), dev, reach: grip.hold };
        held.set(d, r); grasps.push(r);
      } else if (!grip) held.delete(d);
    }
  };
  return sim.run();
} } });
const q = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)].toFixed(2) : '-'; };
console.log(`runs ${runs} | grasps ${grasps.length} (${(grasps.length / runs).toFixed(2)} a run) | broken ${breaks.length} (${(breaks.length / runs).toFixed(3)} a run)`);
const kinds: Record<string, number> = {}; for (const b of breaks) kinds[b.detail] = (kinds[b.detail] ?? 0) + 1; console.log('  breaks by kind', JSON.stringify(kinds));
for (const st of ['engaged', 'off a block <= 1 s', 'free']) {
  const G = grasps.filter((x) => x.st === st), B = breaks.filter((x) => x.st === st);
  console.log(`  ${st.padEnd(18)} grasps ${(G.length / runs).toFixed(3)} a run, broken ${(B.length / runs).toFixed(3)} a run (${G.length ? (100 * B.length / G.length).toFixed(0) : '-'}% of grasps) | broken: speed p50 ${q(B.map((x) => x.v))}, support deviation p50 ${q(B.map((x) => x.dev))} x base, reach ${q(B.map((x) => x.reach))} | held: speed ${q(G.map((x) => x.v))}, deviation ${q(G.map((x) => x.dev))}`);
}
