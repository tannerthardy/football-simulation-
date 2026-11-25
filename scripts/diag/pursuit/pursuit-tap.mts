// Read-only pursuit tap for film-setup.mts replay (2026-11-23): install() patches PlaySim (tick and a defenders-only
// commandTraceFor sink); dump(sim, OUT) writes, every 0.1 s after the catch, each defender's position, the pursuit stage
// that set his request (meeting spot / on-top point / close gather / tackle bond), the carrier speed his forecast assumed
// and his steering point. Same frame format as pursuit-film-trace.mts.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { writeFileSync } = await import('node:fs');
const r2 = (v: number) => Math.round(v * 100) / 100;
const st = new WeakMap<any, any>(); const noop = () => undefined;
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
    s.cur = {};
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
        f.d[d.slot] = { pos: [...P(d.pos), ...V(d.vel)], stage, assumedV: ic ? r2(ic.forecast.relaxedSpeed) : ch ? r2(Math.hypot(ch.observed.vel.x, ch.observed.vel.y)) : null,
          aim: ic ? P(ic.steeringPoint) : null, req: req ? V(req.vel) : null, gather: ch ? r2(ch.gather) : null };
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
  writeFileSync(OUT, JSON.stringify({ carrier: s.C.slot, ev, frames: s.frames }));
}
