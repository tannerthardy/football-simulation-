// After the first tackler misses (2026-11-24), measurement only: is the next man there to finish? Flag-agnostic.
// At each missed_tackle / broken_tackle on a scrimmage carrier (pocket sacks out): the nearest other defender closing on
// the carrier (the follow man): his distance, his lateral offset from the carrier's line of travel (+ = the side the
// missed tackler was not on), whether he was tagged trail-leverage within the last 0.3 s, and what happens next: the
// next attempt on the play (by whom, how long after, made or missed), and the carrier's yards from the miss to the end.
// Usage: node --import tsx miss-follow-tap.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100;
const rows: any[] = []; const attempts: any[] = []; const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall && (this.offCall.kind === 'run' || this.offCall.kind === 'pass') ? { seen: this.events.length, open: [] as any[], trailAt: new Map<any, number>(), recs: [] as any[] } : null; st.set(this, s); }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this;
  for (const d of sim.defense) if (d.tags?.has?.('trail-leverage')) s.trailAt.set(d, sim.t);
  for (; s.seen < sim.events.length; s.seen++) {
    const e = sim.events[s.seen];
    if (!['missed_tackle', 'broken_tackle', 'tackle_wrap'].includes(e.type) || (e.type === 'tackle_wrap' && e.note === 'assist')) continue;
    const [d, c] = e.type === 'broken_tackle' ? [sim.agents[e.b], sim.agents[e.a]] : [sim.agents[e.a], sim.agents[e.b]];
    if (!d || !c || c.team !== sim.offense[0].team) continue;
    if (c === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled) continue;
    // Every attempt (missed_tackle / initial wrap; broken holds are outcomes of a wrap): was the tackler trail-tagged?
    if (e.type !== 'broken_tackle') {
      const rx = c.pos.x - d.pos.x, ry = c.pos.y - d.pos.y;
      attempts.push({ ptype: sim.isPass && !sim.scrambled ? 'catch' : 'run', missed: e.type === 'missed_tackle', trail: (s.trailAt.get(d) ?? -9) >= sim.t - 0.3,
        dist: r2(Math.hypot(rx, ry)), detail: e.note ?? null });
    }
    // A pending miss's next attempt is this one.
    for (const o of s.open) if (!o.next && o.c === c && d !== o.d0) o.next = { by: d === o.f ? 'follow man' : 'another', dt: r2(sim.t - o.t), made: e.type === 'tackle_wrap' };
    if (e.type === 'tackle_wrap') continue;
    const cs = Math.hypot(c.vel.x, c.vel.y), ux = cs > 1 ? c.vel.x / cs : 1, uy = cs > 1 ? c.vel.y / cs : 0;
    const lat = (p: any) => (p.y - c.pos.y) * ux - (p.x - c.pos.x) * uy;
    const missSide = Math.sign(lat(d.pos)) || 1;
    const cand = sim.defense.filter((o: any) => o !== d && !o.isDown?.(sim.t)).map((o: any) => {
      const rx = c.pos.x - o.pos.x, ry = c.pos.y - o.pos.y, dd = Math.hypot(rx, ry);
      return { o, dd, closing: dd > 1e-6 ? ((o.vel.x - c.vel.x) * rx + (o.vel.y - c.vel.y) * ry) / dd : 0 };
    }).filter((x: any) => x.closing > 0).sort((p: any, q: any) => p.dd - q.dd);
    const f = cand[0]?.o ?? null;
    s.open.push({ c, d0: d, f, t: sim.t, next: null, rec: { type: e.type, ptype: sim.isPass && !sim.scrambled ? 'catch' : 'run', t: r2(sim.t), cx: c.pos.x, dir: sim.attackDir(c.team),
      follow: f ? { pos: f.player.position, dist: r2(cand[0].dd), closing: r2(cand[0].closing), lat: r2(lat(f.pos) * -missSide), trail: (s.trailAt.get(f) ?? -9) >= sim.t - 0.3 } : null } });
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) { const e = this.endSpot; for (const o of s.open) { const { cx, dir, ...rec } = o.rec; rows.push({ ...rec, next: o.next, yardsAfter: e ? r2((e.x - cx) * dir) : null }); } }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} misses`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, rows, attempts })); console.log('misses', rows.length);
