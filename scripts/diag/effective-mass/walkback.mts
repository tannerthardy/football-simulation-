// The late walk-back (Flex, 2026-11-13: tackles retreat at 2 yd/s at 3-4 s and end level with the QB; NFL 0.5 yd/s and
// +1.0 yd over him). For tackle pass reps with a rusher outside him (passSet.outside), 2.5-4.0 s, ball in the QB's hands:
// his requested x-velocity against his achieved one (+ = upfield), the rusher's, his depth and the QB's, and whether
// the request is a retreat (< -1 yd/s: he chose to give ground) or he is carried (asked > -0.5, moving < -1).
// usage: [flags] node --import tsx scripts/diag/effective-mass/walkback.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rows: any[] = [];
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) {
  simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.t < 2.5 || sim.t > 4.0 || sim.carrier !== sim.qb) return;
      const dir = sim.attackDir('O');
      for (const e of sim.engagements) {
        const b = e.blocker; if (e.type !== 'pass' || !['LT', 'RT'].includes(b.slot) || !b.passSet?.outside) continue;
        const iv = sim.intents[b.idx]?.vel; if (!iv) continue;
        rows.push({ t: sim.t, ask: iv.x * dir, got: b.vel.x * dir, man: e.defender.vel.x * dir, depth: (sim.los - b.pos.x) * dir,
          qbDepth: (sim.los - sim.qb.pos.x) * dir, riding: !!e.riding });
      }
    };
    return sim.run();
  } } });
}
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))].toFixed(2) : 'nan'; };
for (const [lab, lo, hi] of [['2.5-3.0 s', 2.5, 3.0], ['3.0-4.0 s', 3.0, 4.01]] as const) {
  const R = rows.filter((r) => r.t >= lo && r.t < hi);
  console.log(`${lab}: tackle-edge rep ticks ${R.length} | asked x-vel p25/50/75 ${q(R.map((r) => r.ask), .25)}/${q(R.map((r) => r.ask))}/${q(R.map((r) => r.ask), .75)} | achieved ${q(R.map((r) => r.got))} | rusher ${q(R.map((r) => r.man))}`
    + ` | chose to retreat (asked < -1) ${(100 * R.filter((r) => r.ask < -1).length / Math.max(1, R.length)).toFixed(0)}% | carried (asked > -0.5, moving < -1) ${(100 * R.filter((r) => r.ask > -0.5 && r.got < -1).length / Math.max(1, R.length)).toFixed(0)}%`
    + ` | depth ${q(R.map((r) => r.depth))} vs QB ${q(R.map((r) => r.qbDepth))} (tackle minus QB ${q(R.map((r) => r.qbDepth - r.depth))}) | riding ${(100 * R.filter((r) => r.riding).length / Math.max(1, R.length)).toFixed(0)}%`);
}
