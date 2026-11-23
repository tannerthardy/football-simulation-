// Default-game ball-carrier tracks with engine tackle labels (2026-11-23), for Rules' BDB 2024 miss-curve formula
// (scripts/diag/tackles/bdb2024_miss_curves.py) on our side. Usage: node --import tsx sim-tracks.mts GAMES OUT.json [FIRST_SEED=201]
// Per scrimmage play: frames at 10 Hz from the possession start (the catch for a completion, the handoff for a run; QB
// keeps, scrambles and sacks are left out) to the end; carrier and every defender [x, y, vx, vy] (x toward the
// offense's goal, from the LOS). Labels per defender, as PFF charts them: tackle (made the tackle), assist (held him in
// the bond without making it), missed (an attempt that never established a hold: engine missed_tackle with no later wrap).
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100;
const plays: any[] = [];
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall && (this.offCall.kind === 'run' || this.offCall.kind === 'pass') ? { C: null, k0: -1, next: 0, frames: [] as any[] } : null; st.set(this, s); }
  const out = tick.call(this);
  if (!s) return out;
  const sim = this, bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  if (!s.C && bc && bc.team === sim.offense[0].team && bc !== sim.qb) { s.C = bc; s.k0 = sim.t; s.next = sim.t; s.dir = sim.attackDir(bc.team); }
  if (s.C && sim.t >= s.next - 1e-9) {
    s.next += 0.1;
    const P = (a: any) => [r2((a.pos.x - sim.los) * s.dir), r2(a.pos.y), r2(a.vel.x * s.dir), r2(a.vel.y)];
    const f: any = { t: r2(sim.t - s.k0), c: P(s.C), d: {} };
    for (const d of sim.defense) f.d[d.slot] = P(d);
    s.frames.push(f);
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s && s.C && s.frames.length >= 3 && (this.offCall.kind === 'run' || this.stats.completed)) {
    const sim = this, slotOf = (i: number | undefined) => i == null ? null : sim.agents[i]?.slot;
    const lab: Record<string, string> = {};
    const evs = sim.events.filter((e: any) => e.t >= s.k0 - 1e-6);
    const tackler = evs.filter((e: any) => e.type === 'tackle').map((e: any) => slotOf(e.a)).filter(Boolean);
    const wrapped = new Set<string>(evs.filter((e: any) => e.type === 'tackle_wrap').map((e: any) => slotOf(e.a)));
    for (const e of evs) if (e.type === 'missed_tackle') { const k = slotOf(e.a); if (k && !wrapped.has(k)) lab[k] = 'missed'; }
    for (const k of wrapped) if (k) lab[k] = 'assist';
    for (const k of tackler) lab[k as string] = 'tackle';
    plays.push({ ptype: this.offCall.kind === 'run' ? 'run' : 'catch', carrierPos: s.C.player.position,
      pos: Object.fromEntries(sim.defense.map((d: any) => [d.slot, d.player.position])), lab, frames: s.frames,
      events: evs.filter((e: any) => /tackle|missed|broken|carrier_contact/.test(e.type)).map((e: any) => [r2(e.t - s.k0), e.type, slotOf(e.a), slotOf(e.b)]) });
  }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${plays.length} plays`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, plays }));
console.log('plays', plays.length);
