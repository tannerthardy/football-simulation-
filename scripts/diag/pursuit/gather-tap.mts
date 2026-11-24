// Close-gather entry trace (2026-11-24), measurement only (Integration's finding 2: from the side, a fast pursuer
// enters the close gather ~4 yd out, squares and brakes). Each defender's first tick per target with chase's
// 'bypassed-close-gather' (commandTrace pursuit record) is an entry. At the entry: his distance, speed and closing speed,
// the carrier's speed, the approach angle between the two velocities (0 chase, 180 head-on), where he is relative to the
// carrier's travel (ahead / beside / behind by bearing), the gather weight; then his speed 0.3 / 0.5 s later and his
// next attempt (made / missed / none within 1.5 s). Usage: node --import tsx gather-tap.mts GAMES OUT.json [FIRST]
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
const rows: any[] = []; const st = new WeakMap<any, any>(); const noop = () => undefined;
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
proto.commandTraceFor = function (this: any, a: any) {
  const s = st.get(this);
  if (!s || a.team === this.offense[0].team) return undefined;
  return new Proxy({}, { get: (_o, name) => name === 'pursuit' ? (t: any, d: any) => { if (d?.planner === 'bypassed-close-gather') s.now.set(a, { t, dist: d.distance, gather: d.gather }); } : noop });
};
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) { s = !compilingPlan() && this.offCall && (this.offCall.kind === 'run' || this.offCall.kind === 'pass') ? { now: new Map(), entered: new Set<string>(), open: [] as any[], seen: this.events.length } : null; st.set(this, s); }
  if (s) s.now = new Map();
  const out = tick.call(this);
  if (!s) return out;
  const sim = this;
  for (; s.seen < sim.events.length; s.seen++) {
    const e = sim.events[s.seen];
    if (!['missed_tackle', 'tackle_wrap'].includes(e.type) || (e.type === 'tackle_wrap' && e.note === 'assist')) continue;
    for (const o of s.open) if (!o.rec.next && sim.agents[e.a] === o.d && sim.t - o.t <= 1.5) o.rec.next = e.type === 'tackle_wrap' ? 'made' : 'missed';
  }
  for (const o of s.open) { const el = sim.t - o.t; const sp = r2(Math.hypot(o.d.vel.x, o.d.vel.y));
    if (o.rec.sp03 === undefined && el >= 0.3 - 1e-9) o.rec.sp03 = sp; if (o.rec.sp05 === undefined && el >= 0.5 - 1e-9) o.rec.sp05 = sp; }
  for (const [d, g] of s.now) {
    const c = g.t, key = `${d.idx}:${c.idx}`;
    if (s.entered.has(key) || c.team !== sim.offense[0].team) continue;
    s.entered.add(key);
    const ds = Math.hypot(d.vel.x, d.vel.y), cs = Math.hypot(c.vel.x, c.vel.y);
    const rx = c.pos.x - d.pos.x, ry = c.pos.y - d.pos.y, rd = Math.hypot(rx, ry) || 1;
    const closing = ((d.vel.x - c.vel.x) * rx + (d.vel.y - c.vel.y) * ry) / rd;
    const appr = ds > 0.5 && cs > 0.5 ? deg(Math.atan2(d.vel.y, d.vel.x) - Math.atan2(c.vel.y, c.vel.x)) : null;
    const bear = cs > 1 ? deg(Math.atan2(-ry, -rx) - Math.atan2(c.vel.y, c.vel.x)) : null;   // 0 = he is straight ahead of the carrier's travel
    s.open.push({ d, t: sim.t, rec: { ptype: sim.isPass && !sim.scrambled ? 'catch' : 'run', pos: d.player.position, dist: r2(g.dist ?? rd), gather: r2(g.gather ?? 1), ds: r2(ds), cs: r2(cs), closing: r2(closing),
      appr, where: bear === null ? 'carrier slow' : bear < 60 ? 'ahead' : bear <= 120 ? 'beside' : 'behind', next: null } });
  }
  return out;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (s) for (const o of s.open) rows.push(o.rec);
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${rows.length} entries`); }
writeFileSync(OUT, JSON.stringify(rows)); console.log('entries', rows.length);
