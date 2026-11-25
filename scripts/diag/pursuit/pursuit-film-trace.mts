// Pursuit planner trace on one film-room play (2026-11-23), read-only. Usage:
//   node --import tsx pursuit-film-trace.mts KEYS.json F09 OUT
// Replays the play's game (film-room collect recipe) and, for every defender after the catch, every 0.1 s: his position,
// the carrier's, which pursuit stage set his request (meeting spot = pursuitPoint's intercept; on-top point = OPEN_FIELD;
// close gather; held tackle), the carrier speed his forecast assumed, and the aim point (steering point or command line).
// Records come from the engine's own trace calls (trace?.pursuit in behaviors/common.ts) through a defenders-only sink.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { readFileSync, writeFileSync } = await import('node:fs');
const [KEYS, ID, OUT] = process.argv.slice(2);
const k = JSON.parse(readFileSync(KEYS, 'utf8')).find((x: any) => x.f === ID);
const r2 = (v: number) => Math.round(v * 100) / 100;
const recs: any[] = []; const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick;
const noop = () => undefined;
proto.commandTraceFor = function (this: any, a: any) {
  const s = st.get(this);
  if (!s || !s.C || a.team === this.offense[0].team) return undefined;
  return new Proxy({}, { get: (_o, name) => name === 'pursuit' ? (target: any, d: any) => { (s.cur[a.slot] ??= []).push(d); } : noop });
};
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) {
    s = null;
    if (!compilingPlan() && this.offCall && this.defCall) { s = { los: this.los, formation: this.offCall.formation.id, fname: this.offCall.formation.name,
      coverage: this.defCall.coverage.id, cname: this.defCall.coverage.name, dir: this.attackDir(this.offense[0].team), C: null, tc: -1, next: 0, cur: {}, frames: [], sim: this }; recs.push(s); }
    st.set(this, s);
  }
  if (s) s.cur = {};
  const out = tick.call(this);
  if (s) {
    const sim = this, P = (p: any) => [r2((p.x - s.los) * s.dir), r2(p.y)], V = (v: any) => [r2(v.x * s.dir), r2(v.y)];
    const bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
    if (!s.C && bc && bc.team === sim.offense[0].team && bc !== sim.qb) { s.C = bc; s.tc = sim.t; s.next = sim.t; }
    if (s.C && sim.t >= s.next - 1e-9) { s.next += 0.1;
      const f: any = { t: r2(sim.t - s.tc), car: [...P(s.C.pos), ...V(s.C.vel)], d: {} };
      for (const d of sim.defense) {
        const rs = s.cur[d.slot] ?? [];
        const ic = rs.find((x: any) => x.kind === 'intercept'), ch = rs.find((x: any) => x.kind === 'chase');
        const req = ch?.requests?.[ch.requests.length - 1]?.command;
        const stage = !ch ? (ic ? 'meeting spot (no chase record)' : null) : ch.planner === 'bypassed-close-gather' ? 'close gather'
          : ch.requests?.[0]?.stage === 'held-tackle' ? 'tackle bond' : ic ? 'meeting spot' : 'on-top point';
        f.d[d.slot] = { pos: [...P(d.pos), ...V(d.vel)], stage, assumedV: ic ? r2(ic.forecast.relaxedSpeed) : ch ? r2(Math.hypot(ch.observed.vel.x, ch.observed.vel.y)) : null,
          aim: ic ? P(ic.steeringPoint) : null, req: req ? V(req.vel) : null, gather: ch ? r2(ch.gather) : null };
      }
      s.frames.push(f);
    }
  }
  return out;
};
const rng = new Rng(101);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const res = simulateGame(home, away, { seed: 101 + k.game, record: true, recordLevel: 'light' });
let j = 0; const match = new Map<any, any>();
for (const p of res.log) { if (!p.replay || !p.plan) continue;
  for (let i = j; i < recs.length; i++) { const s = recs[i];
    if (Math.abs(s.los - p.replay.los) < 0.01 && (s.formation === p.plan.formation || s.fname === p.plan.formation) && (s.coverage === p.plan.coverage || s.cname === p.plan.coverage)) { match.set(p, s); j = i + 1; break; } } }
const p = res.log[k.index], s = match.get(p);
console.error(ID, p?.text, '| key text', k.text);
const ev = s.sim.events.filter((e: any) => e.t >= s.tc - 1e-6 && /tackle|missed|broken|hit|carrier_contact|out_of_bounds|fall/.test(e.type))
  .map((e: any) => [r2(e.t - s.tc), e.type, e.a != null ? s.sim.agents[e.a]?.slot : null, e.b != null ? s.sim.agents[e.b]?.slot : null]);
writeFileSync(OUT, JSON.stringify({ id: ID, text: p.text, carrier: s.C.slot, ev, frames: s.frames }));
