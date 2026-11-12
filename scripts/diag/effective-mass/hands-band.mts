// Where an engaged rep's hands joint sits against its working extension (Integration, 2026-11-12: at an edge
// rusher's crossing the anchored tackle's hands carried no compression). Every tick of every engaged rep's own hands
// joint while the play is live: c = centre distance - extension (world.ts: c < 0 compression; 0..HANDS_SLACK (0.06)
// slack, no normal force; beyond, tension, carried only by a hold capacity). Split by rep type (pass / run), and for
// pass by tackle-edge reps; with the joint's normal force, the distance against the blocker's full reach (bodies +
// arm), and the extension's arm share (extension - bodies, against the arm).
// usage: [flags] node --import tsx scripts/diag/effective-mass/hands-band.mts [first seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 101), games = Number(process.argv[3] ?? 2);
const q = (v: number[], f = 0.5) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] : NaN;
const acc: Record<string, { c: number[]; N: number[]; reachFrac: number[]; armUsed: number[] }> = {};
for (let s = first; s < first + games; s++) {
  const rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(home, away, { seed: s, hooks: { playResult: (sim: any, kind: string) => {
    if (kind !== 'scrimmage') return undefined;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      if (sim.phase !== 'live') return;
      for (const e of sim.engagements) {
        const j = e.hands; if (!j) continue;
        const b = e.blocker, d = e.defender;
        const dist = Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y), bodies = b.profile.radius + d.profile.radius;
        const arm = b.player.measurables.armIn / 36;
        const keys = [e.type];
        if (e.type === 'pass' && (b.slot === 'LT' || b.slot === 'RT') && Math.abs(d.pos.y - sim.ballY) > 3) keys.push('pass, tackle-edge');
        for (const k of keys) {
          const A = acc[k] ??= { c: [], N: [], reachFrac: [], armUsed: [] };
          A.c.push(dist - j.extension); A.N.push(j.normalForce ?? 0); A.reachFrac.push((dist - bodies) / arm); A.armUsed.push((j.extension - bodies) / arm);
        }
      }
    };
    return sim.run(); } } });
}
const pc = (a: number, b: number) => b ? `${(100 * a / b).toFixed(0)}%` : '-';
for (const [k, A] of Object.entries(acc)) {
  const n = A.c.length;
  console.log(`${k} (ticks ${n}): compression (c < 0) ${pc(A.c.filter((c) => c < 0).length, n)} | slack (0-0.06) ${pc(A.c.filter((c) => c >= 0 && c <= 0.06).length, n)} | beyond (> 0.06) ${pc(A.c.filter((c) => c > 0.06).length, n)}`
    + ` | c p25/50/75 ${q(A.c, .25).toFixed(2)}/${q(A.c).toFixed(2)}/${q(A.c, .75).toFixed(2)} yd | N p50 ${q(A.N).toFixed(0)} (> 50: ${pc(A.N.filter((x) => x > 50).length, n)})`
    + ` | gap between bodies as a share of his arm p50 ${q(A.reachFrac).toFixed(2)} (beyond full arm: ${pc(A.reachFrac.filter((x) => x > 1).length, n)}) | extension's arm share p50 ${q(A.armUsed).toFixed(2)}`);
}
