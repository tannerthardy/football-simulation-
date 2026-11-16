// The ride at the tackle's hip (Integration, 2026-11-16: what the grip costs the tackle, what should break it, and where
// the hands are). Same event as edge-flatten.mts: the first tick, from 0.3 s with the QB holding the ball, at which the
// paired edge rusher is more than 0.3 yd deeper than his tackle while still outside him. Each tick from the event to
// +0.5 s:
//   - contact by the NFL's tracking definition (any offensive body but the QB within 1.2 yd: proximity), against the
//     tackle's hands joint on him and against a grip (fingers on cloth, OPEN_HANDS);
//   - while gripped, the grip's geometry:
//       * in the rusher's frame: the angle from his facing to the bearing to the tackle (under 90 = in front of his
//         shoulders, his frame; over 90 = behind him, on his back);
//       * in the tackle's frame: the angle from his facing to the bearing to the rusher (over 90 = reaching behind
//         himself);
//   - the rusher's speed relative to the tackle across the grip (his velocity minus the tackle's);
//   - the tackle's own speed, his support state, and the load he feels toward the rusher (support.felt, N; + = pulled
//     toward the man).
// Per rep: the share of ticks in proximity / joint / grip; per gripped tick, the distributions; and the share of ridden
// reps (gripped at +0.25 s) with the hands behind the rusher (over 90 in his frame) at any tick. Measurement only.
// usage: [flags] node --import tsx scripts/diag/effective-mass/edge-ride.mts [seed] [games]
const W = process.cwd();
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const first = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const rng = new Rng(first);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const N = 0.9144;
const off = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
const reps: any[] = [];
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, first + g), leagueSample(away, first + g), { seed: first + g, hooks: { playResult: (sim: any, kind: string) => {
  if (kind !== 'scrimmage' || !sim.offCall?.pass) return undefined;
  const by = sim.ballY, dir = sim.attackDir(sim.offense[0].team);
  const pairs = sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT').map((t: any) => {
    const out = Math.sign(t.pos.y - by) || 1;
    const d = sim.defense.filter((x: any) => { const w = (x.pos.y - t.pos.y) * out; return w >= 0 && w <= 4 && Math.abs(x.pos.x - sim.los) < 2; })
      .sort((a: any, b: any) => (b.pos.y - t.pos.y) * out - (a.pos.y - t.pos.y) * out)[0];
    return d ? { t, d, out, t0: null as number | null, ticks: [] as any[] } : null;
  }).filter(Boolean);
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    for (const p of pairs) {
      const { t, d, out } = p;
      if (p.t0 === null) {
        if (sim.throwAt >= 0 || sim.t < 0.3 || d.behavior?.kind !== 'rush') continue;
        if ((d.pos.x - t.pos.x) * dir < -0.3 && (d.pos.y - t.pos.y) * out > 0) p.t0 = sim.t; else continue;
      }
      const dt = sim.t - p.t0!; if (dt > 0.5 + 1e-9) continue;
      const near = sim.offense.some((o: any) => o !== sim.qb && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= 1.2);
      const j = sim.world.joints.find((j: any) => j.kind === 'hands' && ((j.a === t.body && j.b === d.body) || (j.a === d.body && j.b === t.body)));
      const toT = Math.atan2(t.pos.y - d.pos.y, t.pos.x - d.pos.x), toD = Math.atan2(d.pos.y - t.pos.y, d.pos.x - t.pos.x);
      const ux = (d.pos.x - t.pos.x), uy = (d.pos.y - t.pos.y), L = Math.hypot(ux, uy) || 1, sup = t.body.support;
      p.ticks.push({ dt, near, joint: !!j, grip: !!j?.grip && j.a === t.body,
        inRusher: off(d.body.facing, toT), inTackle: off(t.body.facing, toD),
        rel: Math.hypot(d.vel.x - t.vel.x, d.vel.y - t.vel.y), tSpeed: Math.hypot(t.vel.x, t.vel.y),
        tUp: (sup?.state ?? 'up') === 'up', pulled: sup ? (sup.felt.x * ux + sup.felt.y * uy) / L * N : NaN });
    }
  };
  const res = sim.run();
  for (const p of pairs) if (p.t0 !== null && p.ticks.length) reps.push(p);
  return res;
} } });
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const pc = (n: number, d: number) => `${(100 * n / Math.max(1, d)).toFixed(0)}%`;
const T = reps.flatMap((r) => r.ticks);
console.log(`edge rushers reaching the tackle's hip: ${reps.length}; ticks 0-0.5 s: ${T.length}`);
console.log(`  contact by proximity (an offensive body within 1.2 yd) ${pc(T.filter((x) => x.near).length, T.length)} | the tackle's hands joint ${pc(T.filter((x) => x.joint).length, T.length)} | gripped (fingers on cloth) ${pc(T.filter((x) => x.grip).length, T.length)}`);
const G = T.filter((x) => x.grip), U = T.filter((x) => x.joint && !x.grip);
for (const [lab, S] of [['gripped', G], ['hands on, open', U]] as [string, any[]][]) {
  if (!S.length) continue;
  console.log(`  ${lab} (n ${S.length}): in the rusher's frame p25/50/75 ${q(S.map((x) => x.inRusher), .25).toFixed(0)}/${q(S.map((x) => x.inRusher)).toFixed(0)}/${q(S.map((x) => x.inRusher), .75).toFixed(0)} deg (behind him, over 90: ${pc(S.filter((x) => x.inRusher > 90).length, S.length)})`
    + ` | in the tackle's frame ${q(S.map((x) => x.inTackle)).toFixed(0)} deg (reaching behind himself, over 90: ${pc(S.filter((x) => x.inTackle > 90).length, S.length)})`
    + ` | relative speed ${q(S.map((x) => x.rel)).toFixed(1)} yd/s (p75 ${q(S.map((x) => x.rel), .75).toFixed(1)}) | tackle speed ${q(S.map((x) => x.tSpeed)).toFixed(1)}, up ${pc(S.filter((x) => x.tUp).length, S.length)}, pulled toward the man ${q(S.map((x) => x.pulled)).toFixed(0)} N`);
}
const ridden = reps.filter((r) => r.ticks.some((x: any) => Math.abs(x.dt - 0.25) < 0.03 && x.grip));
console.log(`  ridden reps (gripped at +0.25 s): ${ridden.length} of ${reps.length} | with the hands behind him (over 90 in his frame) at any tick ${pc(ridden.filter((r) => r.ticks.some((x: any) => x.grip && x.inRusher > 90)).length, ridden.length)}, outside 60 ${pc(ridden.filter((r) => r.ticks.some((x: any) => x.grip && x.inRusher > 60)).length, ridden.length)} | the tackle reaching behind himself ${pc(ridden.filter((r) => r.ticks.some((x: any) => x.grip && x.inTackle > 90)).length, ridden.length)}`);
