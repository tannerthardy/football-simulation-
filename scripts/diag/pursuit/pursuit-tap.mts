// Read-only pursuit tap for film-setup.mts replay (2026-11-23): install() patches PlaySim (tick and a defenders-only
// commandTraceFor sink); dump(sim, OUT) writes, every 0.1 s after the catch, each defender's position, the pursuit stage
// that set his request (meeting spot / on-top point / close gather / tackle bond), the carrier speed his forecast assumed
// and his steering point. Same frame format as pursuit-film-trace.mts.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { writeFileSync } = await import('node:fs');
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
// Coverage's shared break (coverage/C14-cards, FLIGHT_BREAK): flightBreakOf(a).t at this tick's decision time (the tap
// reads after the tick has advanced sim.t by dt) marks a tick its break issued.
const flightBreakOf = ((await import(`${W}/src/sim/behaviors/defense.ts`)) as any).flightBreakOf as ((a: any) => { t: number } | null) | undefined;
const r2 = (v: number) => Math.round(v * 100) / 100;
const st = new WeakMap<any, any>(); const noop = () => undefined;
const techOf = new WeakMap<any, string | null>(); const wrapped = new WeakSet<any>();
export function install() {
  const proto = PlaySim.prototype as any, tick = proto.tick;
  proto.commandTraceFor = function (this: any, a: any) {
    const s = st.get(this);
    if (!s || !s.C || a.team === this.offense[0].team) return undefined;
    return new Proxy({}, { get: (_o, name) => name === 'pursuit' ? (_t: any, d: any) => { (s.cur[a.slot] ??= []).push(d); } : noop });
  };
  proto.tick = function (this: any) {
    let s = st.get(this);
    if (!s) { s = { los: this.los, dir: this.attackDir(this.offense[0].team), C: null, tc: -1, next: 0, cur: {}, frames: [] }; st.set(this, s); }
    s.cur = {}; s.stg = {};
    // This tick's facing-technique label of each defender's behaviour request (read off the command it returns).
    for (const d of this.defense) { const b = d.behavior as any;
      if (b && !wrapped.has(b)) { wrapped.add(b); const u = b.update.bind(b);
        b.update = (a: any, sm: any) => { const c = u(a, sm); techOf.set(a, (c && facingTechnique(c)?.label) || null); return c; }; } }
    // Per-stage intents for defenders (the engine's own stage hooks, through a passive sink).
    if (!this.commandTrace) this.commandTrace = new Proxy({}, { get: (_o, name) => name === 'stage' ? (n: string, intents: any[]) => {
      if (!s.C) return; for (const d of this.defense) { const v = intents[d.idx]?.vel; if (v) (s.stg[d.slot] ??= []).push([n, [r2(v.x * s.dir), r2(v.y)]]); } }
      : name === 'isCollecting' ? () => false : noop });
    const out = tick.call(this);
    const sim = this, P = (p: any) => [r2((p.x - s.los) * s.dir), r2(p.y)], V = (v: any) => [r2(v.x * s.dir), r2(v.y)];
    const bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
    if (!s.C && bc && bc.team === sim.offense[0].team && bc !== sim.qb) { s.C = bc; s.tc = sim.t; s.next = sim.t; }
    if (s.C && sim.t >= s.next - 1e-9) { s.next += 0.1;
      const f: any = { t: r2(sim.t - s.tc), car: [...P(s.C.pos), ...V(s.C.vel)], d: {}, o: {} };
      for (const o of sim.offense) if (o !== s.C) f.o[o.slot] = [...P(o.pos), ...V(o.vel)];
      for (const d of sim.defense) {
        const rs = s.cur[d.slot] ?? [];
        const ic = rs.find((x: any) => x.kind === 'intercept'), ch = rs.find((x: any) => x.kind === 'chase');
        const stage = !ch ? (ic ? 'meeting spot' : null) : ch.planner === 'bypassed-close-gather' ? 'close gather'
          : ch.requests?.[0]?.stage === 'held-tackle' ? 'tackle bond' : ic ? 'meeting spot' : 'on-top point';
        const req = ch?.requests?.[ch.requests.length - 1]?.command;
        f.d[d.slot] = { tech: (flightBreakOf && (flightBreakOf(d)?.t ?? -1) >= sim.t - sim.dt - 1e-9 ? 'flight-break' : techOf.get(d)) ?? null, kind: d.behavior?.kind ?? null, tags: d.tags ? [...d.tags].filter((t: string) => /drive|open-field|onBall|looking|carry|rally|ball/.test(t)) : [], pos: [...P(d.pos), ...V(d.vel)], cmd: sim.cmds?.[d.idx] ? V(sim.cmds[d.idx].vel) : null, stages: s.stg[d.slot] ?? null, intent: sim.intents?.[d.idx] ? V(sim.intents[d.idx].vel) : null, stage, assumedV: ic ? r2(ic.forecast.relaxedSpeed) : ch ? r2(Math.hypot(ch.observed.vel.x, ch.observed.vel.y)) : null,
          aim: ic ? P(ic.steeringPoint) : null, commit: ic?.forecast?.commit ?? null, ahead: ic?.forecast?.speedAhead ?? null, req: req ? V(req.vel) : null, gather: ch ? r2(ch.gather) : null };
      }
      s.frames.push(f);
    }
    return out;
  };
}
export function dump(sim: any, OUT: string) {
  const s = st.get(sim); if (!s?.C) return;
  const ev = sim.events.filter((e: any) => e.t >= s.tc - 1e-6 && /tackle|missed|broken|hit|carrier_contact|out_of_bounds|fall/.test(e.type))
    .map((e: any) => [r2(e.t - s.tc), e.type, e.a != null ? sim.agents[e.a]?.slot : null, e.b != null ? sim.agents[e.b]?.slot : null]);
  const prof = Object.fromEntries(sim.defense.map((d: any) => [d.slot, { vmax: r2(d.profile.vmax * (d.speedScale ?? 1)), brake: r2(d.profile.brake), lateral: r2(d.profile.lateral), tau: r2(d.profile.tau) }]));
  writeFileSync(OUT, JSON.stringify({ carrier: s.C.slot, ev, frames: s.frames, prof }));
}
