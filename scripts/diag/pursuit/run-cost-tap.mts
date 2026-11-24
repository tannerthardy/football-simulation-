// Run-defense cost of a front change (2026-11-24), measurement only; flag-agnostic. Designed runs (offCall.kind 'run'):
//  - yards (end spot past the LOS), stuff (<= 0), explosive (>= 10, >= 20);
//  - where the carrier crosses the LOS: his initial track side (lateral travel from the handoff to +0.4 s), the
//    crossing's offset from the snap ball on that side; cutback = crossed on the far side of the ball (< -0.5 yd),
//    bounce = crossed outside the playside surface (outermost core lineman at the snap, + 1 yd);
//  - vacated gap: at the crossing, a defensive lineman (by position) whose run-fit gap (gapY at the snap alignment) is
//    within 1.0 yd of the crossing and who is himself more than 2.5 yd laterally from it and not engaged;
//  - 10 Hz frames from the snap (release-op.py play format) for the live release table.
// Usage: node --import tsx run-cost-tap.mts GAMES OUT.json [FIRST_SEED=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { gapY } = await import(`${W}/src/playbook/alignment.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100;
const DL = /^(DE|DT|NT|EDGE)/;
const runs: any[] = []; const plays: any[] = []; const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) {
    s = !compilingPlan() && this.offCall?.kind === 'run' && this.defCall ? { next: 0, frames: [] as any[], ho: null, track: null, cross: null, ballY: this.ballY,
      surface: null as any, gaps: new Map<any, number>() } : null;
    st.set(this, s);
    if (s) {
      const core = this.offense.filter((o: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot) || this.offAlign.spots[o.slot]?.inline);
      s.surface = { lo: Math.min(...core.map((o: any) => o.pos.y)), hi: Math.max(...core.map((o: any) => o.pos.y)) };
      for (const d of this.defense) if (d.runFit && DL.test(d.player.position)) { try { s.gaps.set(d, gapY(this.offAlign, d.runFit.gap, d.runFit.side)); } catch { /* none */ } }
    }
  }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this, bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  const car = bc && bc.team === sim.offense[0].team ? bc : null;
  if (car && car !== sim.qb && !s.ho) s.ho = { t: sim.t, y: car.pos.y, c: car };
  if (s.ho && !s.track && sim.t - s.ho.t >= 0.4 - 1e-9 && car === s.ho.c) s.track = Math.sign(car.pos.y - s.ho.y) || 1;
  if (car && !s.cross && car.pos.x > sim.los) {
    const vac = [...s.gaps.entries()].filter(([d, gy]) => Math.abs(gy - car.pos.y) < 1.0 && Math.abs(d.pos.y - gy) > 2.5 && !d.engagement)
      .map(([d]) => ({ pos: d.player.position, tags: [...(d.tags ?? [])].filter((t: string) => /^shed-(press|pursue|hold)/.test(t)) }));
    s.cross = { t: r2(sim.t), y: car.pos.y, vacated: vac };
  }
  if (sim.t >= s.next - 1e-9) {
    s.next += 0.1;
    const P = (a: any) => [r2(a.pos.x - sim.los), r2(a.pos.y)];
    const f: any = { t: r2(sim.t), car: car && car !== sim.qb ? car.slot : car === sim.qb ? sim.qb.slot : null, off: {}, def: {} };
    for (const o of sim.offense) f.off[o.slot] = P(o);
    for (const d of sim.defense) f.def[d.slot] = P(d);
    s.frames.push(f);
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) {
    const yards = this.endSpot ? r2(this.endSpot.x - this.los) : null;
    const side = s.track ?? 1;
    const off = s.cross ? (s.cross.y - s.ballY) * side : null;
    const surf = side > 0 ? s.surface.hi : s.surface.lo;
    const bounce = s.cross ? (s.cross.y - surf) * side > 1 : null;
    runs.push({ concept: this.offCall.run?.id ?? this.offCall.label ?? null, yards, stuff: yards !== null && yards <= 0, crossed: !!s.cross,
      crossOff: off !== null ? r2(off) : null, cutback: off !== null ? off < -0.5 : null, bounce, vacated: s.cross?.vacated ?? [] });
    if (s.frames.length >= 8) plays.push({ ptype: 'run', dpos: Object.fromEntries(this.defense.map((d: any) => [d.slot, d.player.position])), frames: s.frames });
  }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${runs.length} runs`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, runs, plays })); console.log('runs', runs.length);
