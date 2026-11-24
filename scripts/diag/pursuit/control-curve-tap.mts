// Hand control vs getting free (2026-11-24, for Run Game's engaged-tackle gate). Measurement only.
// Designed runs. Every 0.1 s, each defender engaged in a run block within 2 yd of the carrier: his engagement's control
// (the blocker's hand control; < 0 = the defender has the hands). Followed forward: whether that engagement ends within
// 0.5 s, and whether he makes a tackle attempt on the carrier (missed_tackle / tackle_wrap, initial or assist) within 1.0 s.
// Usage: node --import tsx control-curve-tap.mts GAMES OUT.json [FIRST=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100;
const rows: any[] = []; const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall?.kind === 'run' ? { next: 0, open: [] as any[], seen: this.events.length } : null; st.set(this, s); }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this, bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  const car = bc && bc.team === sim.offense[0].team ? bc : null;
  for (; s.seen < sim.events.length; s.seen++) {
    const e = sim.events[s.seen];
    if (e.type !== 'missed_tackle' && e.type !== 'tackle_wrap') continue;
    for (const o of s.open) if (!o.r.attempt && sim.agents[e.a] === o.d && sim.t - o.t <= 1.0 + 1e-9) o.r.attempt = e.type === 'tackle_wrap' ? 'wrap' : 'missed';
  }
  for (const o of s.open) if (!o.r.ended && !sim.engagements.includes(o.e) && sim.t - o.t <= 0.5 + 1e-9) o.r.ended = true;
  if (car && sim.t >= s.next - 1e-9) {
    s.next = sim.t + 0.1;
    for (const e of sim.engagements) {
      if (e.type !== 'run' || !e.defender) continue;
      const d = e.defender;
      if (Math.hypot(d.pos.x - car.pos.x, d.pos.y - car.pos.y) > 2) continue;
      s.open.push({ d, e, t: sim.t, r: { control: r2(e.control), win: r2(e.win ?? 0), pos: d.player.position, dist: r2(Math.hypot(d.pos.x - car.pos.x, d.pos.y - car.pos.y)), helpers: e.helpers?.length ?? 0, ended: false, attempt: null } });
    }
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) for (const o of s.open) rows.push(o.r);
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} samples`); }
writeFileSync(OUT, JSON.stringify(rows)); console.log('samples', rows.length);
