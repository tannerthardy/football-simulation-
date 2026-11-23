// Tackle geometry, sim side (2026-11-23): default games written in the shared play format of tackle_geometry.py, so the
// NFL and the sim go through one operator (`rows`, `tables`). Measurement only.
// Usage (repo root): node --import tsx scripts/diag/tackles/tackle-geometry-dump.mts GAMES OUT.plays.jsonl [FIRST_SEED=201]
// Carrier and window as on the NFL side: catches from the catch, handoffs from the handoff, other carries (QB runs and
// scrambles) from the snap; pocket sacks are left out (they are not rush attempts in the NFL file); to the end.
// Labels from engine events (src/sim/tackle.ts), mirroring PFF's per-defender coding with a miss first:
//   missed = a missed_tackle (reach, dive, grab that did not connect) or a broken hold (broken_tackle) by him;
//   tackle = otherwise the initial wrap on the play that ended in a tackle; assist = otherwise any other wrap.
// Frames: 0.1 s from the snap, +x downfield, LOS at x = 0 (y is not mirrored; the operator is mirror-safe).
// Weight is body mass in lb, height in inches.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { Rng } = await import(`${W}/src/core/rng.ts`);
const { generateTeam } = await import(`${W}/src/league/team.ts`);
const { simulateGame } = await import(`${W}/src/game/game.ts`);
const { compilingPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const { createWriteStream } = await import('node:fs');
const GAMES = Number(process.argv[2] ?? 4), OUT = process.argv[3], FIRST = Number(process.argv[4] ?? 201);
const r2 = (v: number) => Math.round(v * 100) / 100, r3 = (v: number) => Math.round(v * 1000) / 1000;
const out = createWriteStream(OUT);
const st = new WeakMap<any, any>();
const proto = PlaySim.prototype as any, tick = proto.tick, run = proto.run;
let nPlays = 0, nLab = 0;
proto.tick = function (this: any) {
  let s = st.get(this);
  if (s === undefined) {
    s = !compilingPlan() && this.offCall && this.defCall && (this.offCall.kind === 'run' || this.offCall.kind === 'pass')
      ? { next: 0, tracks: {} as Record<string, any[]>, dir: this.attackDir(this.offense[0].team), los: this.los } : null;
    st.set(this, s);
  }
  const out_ = tick.call(this);
  if (!s) return out_;
  if (this.t >= s.next - 1e-9) {
    const f = Math.round(this.t * 10); s.next = (f + 1) / 10;
    for (const a of [...this.offense, ...this.defense]) {
      const fc = a.body?.facing;
      (s.tracks[a.slot] ??= []).push([f, r2((a.pos.x - s.los) * s.dir), r2(a.pos.y), r2(a.vel.x * s.dir), r2(a.vel.y),
        fc == null ? null : r3(Math.atan2(Math.sin(fc), Math.cos(fc) * s.dir))]);
    }
  }
  return out_;
};
proto.run = function (this: any) {
  const r = run.call(this); const s = st.get(this);
  if (!s) return r;
  const off = this.offense[0].team;
  const fr = (t: number) => Math.round(t * 10);
  const ev: Record<string, number> = { ball_snap: 0 };
  let carrier: any = null, k0 = 0, ptype: 'catch' | 'run' = 'run';
  for (const e of this.events) {
    if (e.type === 'catch' || e.type === 'handoff') {
      const a = this.agents[e.type === 'catch' ? e.a : e.b];
      if (a && a.team === off) { carrier = a; k0 = fr(e.t); ptype = e.type === 'catch' ? 'catch' : 'run'; ev[e.type === 'catch' ? 'pass_outcome_caught' : 'handoff'] ??= k0; }
    }
    if (/^(tackle|out_of_bounds|touchdown|fumble)$/.test(e.type)) ev[e.type] ??= fr(e.t);
  }
  if (!carrier) {
    const qb = this.qb;
    if (qb && (!this.isPass || this.scrambled) && this.stats.completed !== true) { carrier = qb; k0 = 0; ptype = 'run'; }
  }
  if (!carrier || !s.tracks[carrier.slot]) return r;
  const ends = ['tackle', 'out_of_bounds', 'touchdown', 'fumble'].map((k) => ev[k]).filter((x) => x != null && x >= k0);
  const ke = ends.length ? Math.min(...ends) : s.tracks[carrier.slot].at(-1)[0];
  const per: Record<string, { miss: boolean; initial: boolean; wrap: boolean }> = {};
  for (const e of this.events) {
    if (fr(e.t) < k0) continue;
    const broken = e.type === 'broken_tackle';
    if (e.type !== 'missed_tackle' && e.type !== 'tackle_wrap' && !broken) continue;
    const [d, c] = broken ? [this.agents[e.b], this.agents[e.a]] : [this.agents[e.a], this.agents[e.b]];
    if (!d || c !== carrier) continue;
    const p = (per[d.slot] ??= { miss: false, initial: false, wrap: false });
    if (e.type === 'tackle_wrap') { p.wrap = true; if (e.note !== 'assist') p.initial = true; } else p.miss = true;
  }
  const ended = ev.tackle != null;
  const labels: Record<string, string> = {};
  for (const [k, p] of Object.entries(per)) {
    if (p.miss) labels[k] = 'missed';
    else if (p.wrap && ended) labels[k] = p.initial ? 'tackle' : 'assist';
  }
  if (!Object.keys(labels).length) return r;
  const all = [...this.offense, ...this.defense];
  const lo = k0 - 12, hi = ke + 12;
  const tracks: Record<string, any[]> = {};
  for (const [k, tr] of Object.entries(s.tracks)) tracks[k] = (tr as any[]).filter((q) => q[0] >= lo && q[0] <= hi);
  out.write(JSON.stringify({ src: 'sim', key: [this.seed ?? null, nPlays], ptype, carrier: carrier.slot, k0, ke, los: 0, events: ev, labels,
    side: Object.fromEntries(all.map((a: any) => [a.slot, a.team === off ? 'off' : 'def'])),
    wt: Object.fromEntries(all.map((a: any) => [a.slot, Math.round(a.profile.massKg * 2.2046)])),
    ht: Object.fromEntries(all.map((a: any) => [a.slot, Math.round(a.profile.heightYd * 36)])),
    pos: Object.fromEntries(all.map((a: any) => [a.slot, a.player.position])), tracks }) + '\n');
  nPlays++; nLab += Object.keys(labels).length;
  return r;
};
const rng = new Rng(FIRST);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < GAMES; g++) { simulateGame(home, away, { seed: FIRST + g }); console.error(`game ${g + 1}/${GAMES}: ${nPlays} plays, ${nLab} labels`); }
out.end();
