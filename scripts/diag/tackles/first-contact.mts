// First contact on designed runs (Run Game, 2026-11-24), measurement only. The first initial wrap of each designed run:
// centre distance, the honest standing arm (both torsos + the tackler's arm span: TACKLE_REACH's reachTo at share 1,
// computed here whatever the flags), closing speed, both speeds, the bond's origin (form / reach / lunge / block), and
// whether he was engaged. Bins it against what the bodies allow: within the arm; only by a launched lunge (arm + body
// laid out, GROUND_STRETCH); beyond both. Usage: <flags> node --import tsx first-contact.mts GAMES OUT.json [FIRST=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { GROUND_STRETCH } = await import(`${W}/src/physics/world.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const rows: any[] = []; let runs = 0;
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, ev = proto.event, run = proto.run;
proto.run = function (this: any) {
  const live = !compilingPlan() && this.offCall?.kind === 'run' && this.defCall;
  if (live) { runs++; st.set(this, { done: false }); }
  return run.call(this);
};
proto.event = function (this: any, type: string, a: any, b: any, note?: string) {
  const s = st.get(this);
  if (s && !s.done && type === 'tackle_wrap' && note === 'initial' && a && b && b.team === this.offense[0].team) {
    s.done = true;
    const dd = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y);
    const honest = b.profile.radius + a.profile.radius + Math.max(0, a.profile.reach - a.profile.radius);
    const rx = b.pos.x - a.pos.x, ry = b.pos.y - a.pos.y;
    const closing = -((b.vel.x - a.vel.x) * rx + (b.vel.y - a.vel.y) * ry) / (dd || 1);
    rows.push({ def: a.player.position, car: b.player.position, dd: r3(dd), honest: r3(honest), over: r3(dd - honest), closing: r3(closing),
      cs: r3(Math.hypot(b.vel.x, b.vel.y)), ds: r3(Math.hypot(a.vel.x, a.vel.y)), engaged: !!a.engagement, t: r3(this.t),
      bin: dd <= honest ? 'arm' : dd <= honest + GROUND_STRETCH ? 'lunge only' : 'beyond' });
  }
  return ev.call(this, type, a, b, note);
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} first contacts, ${runs} runs`); }
const env = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => /^[A-Z][A-Z0-9_]+$/.test(k) && (v === '0' || v === '1')).sort());
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, env, runs, rows }));
console.log('runs', runs, 'first contacts', rows.length);
