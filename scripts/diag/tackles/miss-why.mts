// Why a REACH_TIME reach was scored a miss: at each tick of the reach, the true distance against the hands' threshold
// (start + (limit - start) share^2), occlusion, his support state. Measurement only.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { reachOf } = await import(`${W}/src/sim/tackle.ts`);
const GAMES = Number(process.argv[2] ?? 2);
const proto = PlaySim.prototype as any, tick = proto.tick, ev = proto.event;
const live = new Map<any, any>(); const out: any[] = [];
function occl(sim: any, d: any, c: any) {
  const sx = c.pos.x - d.pos.x, sy = c.pos.y - d.pos.y, l2 = sx * sx + sy * sy;
  if (l2 < 0.36) return null;
  for (const o of sim.agents) { if (o === d || o === c) continue;
    const t = ((o.pos.x - d.pos.x) * sx + (o.pos.y - d.pos.y) * sy) / l2; if (t <= 0.15 || t >= 0.85) continue;
    const px = d.pos.x + sx * t - o.pos.x, py = d.pos.y + sy * t - o.pos.y;
    if (px * px + py * py < (o.profile.radius + 0.25) ** 2) return `${o.team === d.team ? (sim.bond?.tacklers?.includes(o) ? "mate-holding" : "mate-free") : "opp"}:${o.player.position}`; }
  return null;
}
proto.tick = function (this: any) {
  const o = tick.call(this);
  const c = this.ball.kind === 'held' ? this.ball.carrier : null;
  if (c) for (const d of this.defense) { const r = reachOf(d); if (r && r.sim === this && !r.engaged) {
    const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y), T = r.arrive - r.t0, share = Math.min(1, (this.t - this.dt - r.t0) / T);
    const thr = r.start + (r.limit - r.start) * share * share;
    const x = live.get(d) ?? { ticks: [] }; x.ticks.push([+(this.t - this.dt - r.t0).toFixed(3), +(dd - thr).toFixed(3), occl(this, d, c), d.body.support?.state, +r.start.toFixed(3)]); live.set(d, x); } }
  return o;
};
proto.event = function (this: any, type: string, a: any, b: any, note?: string) {
  if (live.has(a) && (type === 'tackle_wrap' || type === 'missed_tackle')) { const x = live.get(a); live.delete(a); if (type === 'missed_tackle' && note === 'reach') out.push(x.ticks); }
  return ev.call(this, type, a, b, note);
};
const rng = new Rng(201);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) simulateGame(home, away, { seed: 201 + g });
let inside = 0; const why: Record<string, number> = {};
for (const T of out) { const ins = T.filter((t: any) => t[1] <= 0); if (ins.length) { inside++; const k = ins.map((t: any) => t[2] ? 'occluded ' + t[2].split(':')[0] : t[3] !== 'up' ? 'support ' + t[3] : 'clear').join(','); why[k] = (why[k] ?? 0) + 1; } }
console.log('free reach misses', out.length, 'inside the hands at a tick end', inside, JSON.stringify(why));
console.log('examples', JSON.stringify(out.filter((T: any) => T.some((t: any) => t[1] <= 0)).slice(0, 5)));
