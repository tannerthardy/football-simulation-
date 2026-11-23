// Pursuit operator on named film-room plays (2026-11-23). Usage: node --import tsx pursuit-film.mts KEYS.json F62,F64,... OUT
// Replays the film-room games (scripts/film-room.ts collect recipe) with a read-only PlaySim.tick tap and writes the
// chosen plays in the pursuit-dump.mts row format. Log entries are matched to sims in order by los, formation and coverage.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { readFileSync, writeFileSync } = await import('node:fs');
const [KEYS, IDS, OUT] = process.argv.slice(2);
const want = IDS.split(','); const keys = JSON.parse(readFileSync(KEYS, 'utf8')).filter((k: any) => want.includes(k.f));
const MAN = /cover0|cover1|man|deuce/;
const r2 = (v: number) => Math.round(v * 100) / 100;
const recs: any[] = []; const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) {
    s = null;
    if (!compilingPlan() && this.offCall && this.defCall) {
      const dir = this.attackDir(this.offense[0].team), los = this.los;
      s = { los, formation: this.offCall.formation.id, fname: this.offCall.formation.name, coverage: this.defCall.coverage.id ?? this.defCall.coverage.name, cname: this.defCall.coverage.name,
        dir, C: null, tc: -1, next: 0, car: [], defs: {}, offs: {}, sim: this };
      recs.push(s);
    }
    st.set(this, s);
  }
  const out = tick.call(this);
  if (s) {
    const sim = this, P = (p: any) => [r2((p.x - s.los) * s.dir), r2(p.y)], V = (v: any) => [r2(v.x * s.dir), r2(v.y)];
    const bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
    if (!s.C && bc && bc.team === sim.offense[0].team && bc !== sim.qb) { s.C = bc; s.tc = sim.t; s.next = sim.t; }
    if (s.C && sim.t >= s.next - 1e-9) { s.next += 0.1; const t = r2(sim.t - s.tc);
      s.car.push([t, ...P(s.C.pos), ...V(s.C.vel)]);
      for (const d of sim.defense) (s.defs[d.slot] ??= []).push([t, ...P(d.pos), ...V(d.vel), r2(Math.atan2(Math.sin(d.body.facing), Math.cos(d.body.facing) * s.dir))]);
      for (const o of sim.offense) if (o !== s.C) (s.offs[o.slot] ??= []).push([t, ...P(o.pos), ...V(o.vel)]); }
  }
  return out;
};
const out: any[] = [];
const rng = new Rng(101);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (const g of [...new Set(keys.map((k: any) => k.game))].sort() as number[]) {
  recs.length = 0;
  const res = simulateGame(home, away, { seed: 101 + g, record: true, recordLevel: 'light' });
  let j = 0; const match = new Map<any, any>();
  for (const p of res.log) {
    if (!p.replay || !p.plan) continue;
    for (let i = j; i < recs.length; i++) { const s = recs[i];
      if (Math.abs(s.los - p.replay.los) < 0.01 && (s.formation === p.plan.formation || s.fname === p.plan.formation) && (s.coverage === p.plan.coverage || s.cname === p.plan.coverage)) { match.set(p, s); j = i + 1; break; } }
  }
  for (const k of keys.filter((k: any) => k.game === g)) {
    const p = res.log[k.index]; const s = p && match.get(p);
    if (!s || !s.C) { console.error(k.f, 'no match / no carrier', p?.text); continue; }
    const sim = s.sim;
    const ev = sim.events.filter((e: any) => e.t >= s.tc - 1e-6 && /tackle|missed|broken|hit|carrier_contact|out_of_bounds|touchdown|fall/.test(e.type))
      .map((e: any) => [r2(e.t - s.tc), e.type, e.a != null ? sim.agents[e.a]?.slot : null, e.b != null ? sim.agents[e.b]?.slot : null]);
    const end = sim.events.some((e: any) => e.type === 'touchdown') ? 'td' : sim.events.some((e: any) => e.type === 'out_of_bounds') ? 'oob' : sim.events.some((e: any) => e.type === 'tackle') ? 'tackle' : 'other';
    console.error(k.f, p.text, '| plan', p.plan.concept, p.plan.coverage);
    out.push({ src: 'sim', key: [k.f, k.concept, k.coverage], cov: k.coverage, man: MAN.test(k.coverage), air: 0, end, car: s.car, defs: s.defs, offs: s.offs, ev,
      radius: { car: s.C.profile.radius, def: sim.defense[0].profile.radius } });
  }
}
writeFileSync(OUT, JSON.stringify(out)); console.log('rows', out.length);
