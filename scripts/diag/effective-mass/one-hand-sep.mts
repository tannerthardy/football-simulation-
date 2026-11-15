// Feet or hold (Integration, 2026-11-15; hand-fight note 14): in interior pass reps (LG / C / RG) more than 1.0 s after
// the rep began, before the throw, the rusher's requested speed (his intent this tick) against his achieved speed, and
// his motion along the hands joint's tangent toward the vacated side, by the blocker's hands on him (2 / 1 / 0). If he
// moves as fast as he asks and toward the open side with one hand off, the hold lets him; if he asks for rush pace and
// is held to less, the request is the part that differs from a man who plants and drives.
// usage: node --import tsx scripts/diag/effective-mass/one-hand-sep.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const IN = new Set(['LG', 'C', 'RG']);
const rows: any[] = [];
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.throwAt >= 0) return;
    for (const e of sim.engagements) {
      if (e.type !== 'pass' || !IN.has(e.blocker.slot) || sim.t - e.start < 1.0 || !e.hands) continue;
      const b = e.blocker, d = e.defender, j = e.hands;
      const on = j.off ? 0 : j.handsOn ?? 2;
      const iv = sim.intents?.[d.idx]?.vel ?? { x: 0, y: 0 };
      const dx = d.pos.x - b.pos.x, dy = d.pos.y - b.pos.y, L = Math.hypot(dx, dy) || 1, tx = -dy / L, ty = dx / L;
      const rvx = d.vel.x - b.vel.x, rvy = d.vel.y - b.vel.y, vt = rvx * tx + rvy * ty;
      rows.push({ on, req: Math.hypot(iv.x, iv.y), got: Math.hypot(d.vel.x, d.vel.y), vmax: d.profile.vmax,
        // + toward the vacated side (offSide is the vacated side's sign along the tangent), for one hand off
        toVacated: on === 1 && j.offSide ? vt * j.offSide : null, vtAbs: Math.abs(vt), N: Math.max(0, j.normalForce ?? 0),
        push: sim.intents?.[d.idx]?.push ?? null });
    }
  };
  return sim.run();
} } });
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
for (const on of [2, 1, 0]) {
  const R = rows.filter(r => r.on === on);
  if (!R.length) continue;
  console.log(`hands on ${on}: ${R.length} ticks | requested speed p50 ${q(R.map(r => r.req)).toFixed(2)} (${(100 * q(R.map(r => r.req / r.vmax))).toFixed(0)}% of vmax) | achieved p50 ${q(R.map(r => r.got)).toFixed(2)} / p75 ${q(R.map(r => r.got), .75).toFixed(2)} | achieved / requested p50 ${q(R.map(r => r.got / Math.max(.1, r.req))).toFixed(2)} | |relative motion across the joint| p50 ${q(R.map(r => r.vtAbs)).toFixed(2)} | joint load p50 ${q(R.map(r => r.N)).toFixed(0)} N | push request p50 ${q(R.map(r => r.push)).toFixed(2)}`);
  if (on === 1) { const v = R.map(r => r.toVacated).filter((x: any) => x !== null); console.log(`   across the joint toward the vacated side p25/50/75 ${q(v, .25).toFixed(2)} / ${q(v).toFixed(2)} / ${q(v, .75).toFixed(2)} yd/s; toward it ${(100 * v.filter((x: number) => x > 0).length / Math.max(1, v.length)).toFixed(0)}%`); }
}
