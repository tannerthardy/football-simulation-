// The matched edge comparison (Flex, 2026-11-14; usage: [flags] node --import tsx scripts/diag/effective-mass/edge-match.mts [first seed] [games]).
// Edge first contacts closing >= 2 yd/s: fell within 0.5 s vs stayed up. At contact: posture, feet (feetLock, foot
// in swing), xi along/across the line (/ base radius), facing vs the line, his speed; over 0.3 s after: blocker's
// velocity along the line (follow-through), his own request along the line, step events (support state changes).
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { supportParams, baseRadiusAt } = await import(`${W}/src/physics/support.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first); const rows: any[] = [];
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const prev = new Map<any, any>(), open: any[] = [], seen = new Set<any>(); const tick = sim.tick.bind(sim);
  sim.tick = () => {
    for (const a of sim.agents) prev.set(a, { pos: { ...a.pos }, vel: { ...a.vel } });
    const held = sim.carrier === sim.qb && sim.throwAt < 0;
    tick();
    for (const e of sim.engagements) {
      const d = e.defender, b = e.blocker;
      if (e.type !== 'pass' || !/^DE/.test(d.slot) || seen.has(e) || !held) continue;
      seen.add(e);
      const pd = prev.get(d), pb = prev.get(b); if (!pd || !pb) continue;
      const nx = pb.pos.x - pd.pos.x, ny = pb.pos.y - pd.pos.y, L = Math.hypot(nx, ny) || 1, n = { x: nx / L, y: ny / L };
      const close = (pd.vel.x - pb.vel.x) * n.x + (pd.vel.y - pb.vel.y) * n.y;
      if (close < 2) continue;
      const sup = d.body.support, sp = supportParams(d.profile), rb = baseRadiusAt(sp, sup.posture);
      const fa = Math.atan2(n.y, n.x) - d.body.facing;
      open.push({ d, b, n, t0: sim.t, close, posture: sup.posture, feetLock: sup.feetLock ?? 0, foot: sup.foot ? 1 : 0,
        xiAlong: (sup.xi.x * n.x + sup.xi.y * n.y) / rb, xiAcross: Math.abs(-sup.xi.x * n.y + sup.xi.y * n.x) / rb,
        faceOff: Math.abs(Math.atan2(Math.sin(fa), Math.cos(fa))) * 180 / Math.PI, speed: Math.hypot(pd.vel.x, pd.vel.y),
        mRatio: b.profile.massKg / d.profile.massKg, bFollow: [] as number[], ask: [] as number[], fell: false, footSteps: 0, lastFoot: sup.foot ? 1 : 0,
        bPush: [] as number[], bal: d.r('balance') });
    }
    for (const r of open) {
      if (r.done) continue;
      const sup = r.d.body.support;
      if (sup && sup.state !== 'up') { r.fell = true; r.done = true; rows.push(r); continue; }
      r.bFollow.push(r.b.vel.x * r.n.x + r.b.vel.y * r.n.y);
      const iv = sim.intents?.[r.d.idx]?.vel ?? { x: 0, y: 0 }; r.ask.push(iv.x * r.n.x + iv.y * r.n.y);
      const bi = sim.intents?.[r.b.idx]; r.bPush.push(bi?.push ?? 0);
      const f = sup?.foot ? 1 : 0; if (f !== r.lastFoot) { r.footSteps++; r.lastFoot = f; }
      if (sim.t - r.t0 >= 0.5 - 1e-9) { r.done = true; rows.push(r); }
    }
  };
  return sim.run();
} } });
const m = (v: number[]) => v.length ? (v.reduce((s, x) => s + x, 0) / v.length) : NaN;
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
for (const [lab, R] of [['fell', rows.filter((r) => r.fell)], ['stayed up', rows.filter((r) => !r.fell)]] as const) {
  const f = (k: string) => q(R.map((r) => r[k])).toFixed(2);
  console.log(`${lab}: n ${R.length} | closing ${f('close')} speed ${f('speed')} | posture ${f('posture')} | feetLock ${f('feetLock')} | foot in swing at contact ${(100 * m(R.map((r) => r.foot))).toFixed(0)}% | xi along ${f('xiAlong')} across ${f('xiAcross')} (base radii)`
    + ` | facing off the line ${f('faceOff')} deg | blocker/his mass ${f('mRatio')} | balance ${f('bal')} | blocker along the line after (+ = driving on) p50 ${q(R.map((r) => m(r.bFollow.slice(0, 6)))).toFixed(2)} yd/s | his request along it ${q(R.map((r) => m(r.ask.slice(0, 6)))).toFixed(2)} | foot changes in 0.3 s ${q(R.map((r) => r.footSteps)).toFixed(0)}`);
}
