// Request thrash (Defense, 2026-11-11; report only). Underneath zone defenders (LB/NB/DB or non-deep zone job), passes, last 1.0 s before the release:
// per tick requested velocity vs achieved; request heading change tick to tick; by technique label.
// usage: node --import tsx scripts/diag/defense-yards/request-thrash.mts (4 leagueSample games, seeds 101-104)
const W = process.cwd();
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { generateTeam, leagueSample } = await import(`${W}/src/league/team.ts`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const { isDeepZone } = await import(`${W}/src/playbook/alignment.ts`);
const A = new Map<string, { n: number; req: number; ach: number; dturn: number; flips: number; along: number }>();
const t0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  t0.call(this); const sim = this;
  if (sim.offCall?.kind === 'run' || sim.ball?.kind !== 'held' || sim.carrier !== sim.qb) return;
  if (!sim.__h) sim.__h = new Map();
  for (const d of sim.defense) {
    const b: any = d.behavior, z = b?.recordedZone?.() ?? b?.zone;
    if (!(/^(LB|NB|DB)/.test(d.slot) || (b?.kind === 'zone' && z && !isDeepZone(z))) || d.engagement) continue;
    const cmd = sim.cmds[d.idx]; if (!cmd?.vel) continue;
    const lab = facingTechnique(cmd)?.label ?? 'none';
    const rq = Math.hypot(cmd.vel.x, cmd.vel.y), ac = Math.hypot(d.vel.x, d.vel.y);
    const prev = sim.__h.get(d); sim.__h.set(d, cmd.vel);
    let s = A.get(lab); if (!s) { s = { n: 0, req: 0, ach: 0, dturn: 0, flips: 0, along: 0 }; A.set(lab, s); }
    s.n++; s.req += rq; s.ach += ac; s.along += rq > 0.1 ? (d.vel.x * cmd.vel.x + d.vel.y * cmd.vel.y) / rq : 0;
    if (prev && rq > 1 && Math.hypot(prev.x, prev.y) > 1) { const da = Math.abs(Math.atan2(Math.sin(Math.atan2(cmd.vel.y, cmd.vel.x) - Math.atan2(prev.y, prev.x)), Math.cos(Math.atan2(cmd.vel.y, cmd.vel.x) - Math.atan2(prev.y, prev.x)))); s.dturn += da; if (da > Math.PI / 2) s.flips++; }
  }
};
const rng = new Rng(101); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < 4; g++) simulateGame(leagueSample(home, 101 + g), leagueSample(away, 101 + g), { seed: 101 + g, record: false });
console.log('label                   ticks  req   ach  along-req  mean |dHeading| deg/tick  flips>90%');
for (const [k, s] of [...A].sort((a, b) => b[1].n - a[1].n).slice(0, 14))
  console.log(k.padEnd(22), String(s.n).padStart(6), (s.req / s.n).toFixed(1).padStart(5), (s.ach / s.n).toFixed(1).padStart(5), (s.along / s.n).toFixed(1).padStart(9), (s.dturn / s.n * 180 / Math.PI).toFixed(1).padStart(10), (100 * s.flips / s.n).toFixed(1).padStart(8));
