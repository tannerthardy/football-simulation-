// Post-shed hand joints (2026-11-24), measurement only: is a joint on a defender after his block ends a surviving bond
// (the shed declared while the hands stay on) or a re-grab, and from where? Run and pass engagements.
// At each engagement end (it leaves sim.engagements with the defender not engaged again that tick):
//  - survived: a hands joint between the two bodies still present (not off) at the end tick;
// then for his next 0.5 s, the first tick with any offensive hands joint on him (or a new engagement):
//  - same blocker or a new one; formed new vs the surviving joint;
//  - the blocker's bearing from the defender's facing (front <45, side 45-135, behind >135) and from his travel;
//  - where the hand contact sits on the defender's torso (its local angle; 0 = his chest front), when recorded;
//  - grab: the joint's tensile hold > 0 / fingers on cloth (grip), and the engagement's chosen hold (e.holding);
// and whether a holding foul event names the pair later in the play. Usage: node --import tsx post-shed-joint-tap.mts GAMES OUT.json [FIRST=201]
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { writeFileSync } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 2), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100;
const deg = (a: number) => Math.round(Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI);
const zone = (d: number) => d < 45 ? 'front' : d <= 135 ? 'side' : 'behind';
const rows: any[] = []; const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
const handsOn = (sim: any, d: any) => sim.world.joints.filter((j: any) => j.kind === 'hands' && !j.off && (j.a === d.body || j.b === d.body))
  .map((j: any) => ({ j, o: sim.agents.find((x: any) => x.body === (j.a === d.body ? j.b : j.a)) })).filter((x: any) => x.o && x.o.team !== d.team);
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall && (this.offCall.kind === 'run' || this.offCall.kind === 'pass') ? { seen: this.events.length, track: [] as any[] } : null; st.set(this, s); }
  const before: any[] | null = s ? [...this.engagements] : null;
  const out = tick.call(this);
  if (!s) return out;
  const sim = this;
  for (const e of before!) if (!sim.engagements.includes(e)) {
    const d = e.defender, b = e.blocker;
    if (!d || !b) continue;
    const surv = handsOn(sim, d).find((x: any) => x.o === b);
    // An engagement on him again at the very tick this one ended is an exchange (a new blocker, or the same one re-fit).
    const imm = d.engagement ? { same: d.engagement.blocker === b } : null;
    s.track.push({ d, b, t0: sim.t, type: e.type, pos: d.player.position, bpos: b.player.position, survived: !!surv, wasHolding: !!e.holding, first: null, done: false,
      immediate: imm, bodyTicks: 0, bodyOld: 0, ticks: 0 });
  }
  for (const x of s.track) {
    if (x.done) continue;
    const el = sim.t - x.t0;
    if (el > 0.5 + 1e-9) { x.done = true; continue; }
    const d = x.d, H = handsOn(sim, d), eng = d.engagement;
    // Body contact (no hands) in the World step: with anyone, and with his former blocker.
    x.ticks++;
    const cs = (sim.lastStep?.contacts ?? []).filter((h: any) => h.i === d.idx || h.j === d.idx);
    if (cs.length) x.bodyTicks++;
    if (cs.some((h: any) => h.i === x.b.idx || h.j === x.b.idx)) x.bodyOld++;
    if (x.first) continue;
    if (!H.length && !eng) continue;
    const pick = H.find((h: any) => h.o === x.b) ?? H[0] ?? null;
    const o = pick?.o ?? eng?.blocker;
    const toO = Math.atan2(o.pos.y - d.pos.y, o.pos.x - d.pos.x), sp = Math.hypot(d.vel.x, d.vel.y);
    const j = pick?.j, c = j?.contact, onD = c && ((c.on === 'a' && j.a === d.body) || (c.on === 'b' && j.b === d.body));
    x.first = { el: r2(el), same: o === x.b, viaEngagement: !pick && !!eng, joint: pick ? (pick.o === x.b && x.survived ? 'survived' : 'new') : null,
      fromFacing: zone(deg(toO - d.body.facing)), fromTravel: sp > 1 ? zone(deg(toO - Math.atan2(d.vel.y, d.vel.x))) : 'standing',
      handAngle: onD ? deg(Math.atan2(c.local.y, c.local.x)) : null, hold: j ? r2(j.hold) : null, grip: j?.grip ?? null, chosenHold: !!(eng?.holding),
      speed: r2(sp), oid: o.idx };
  }
  for (; s.seen < sim.events.length; s.seen++) {
    const e = sim.events[s.seen];
    if (e.type !== 'holding') continue;
    for (const x of s.track) if (x.first && ((sim.agents[e.a] === x.d && x.first.oid === sim.agents[e.b]?.idx) || (sim.agents[e.b] === x.d && x.first.oid === sim.agents[e.a]?.idx))) x.foul = true;
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) for (const x of s.track) { const { d, b, ...rest } = x; rows.push({ ...rest, foul: !!x.foul }); }
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} ends`); }
writeFileSync(OUT, JSON.stringify({ games: GAMES, firstSeed: FIRST, rows })); console.log('ends', rows.length);
