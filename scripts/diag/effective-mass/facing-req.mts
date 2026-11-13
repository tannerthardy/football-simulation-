// Step 2's first question: when sim hitters fail to turn after a front-on contact (NFL 43 -> 64 deg from square by
// +0.3 s, sim 37 -> 41), is it the request or the body? For the hitter and the runner of each front-on first contact on
// zone runs (first proximity <= 1.0 yd, the drive-alloc.mts selection), from torso distance (<= 0.65 yd) to +0.3 s:
//   achieved turn   |change of body facing|
//   requested turn  |change of the facing his intent asks for| (intent.facing; when absent, his requested velocity)
//   lag             |requested - achieved| at +0.3 s
//   bearing turn    |change of the direction to the other man| (how far the geometry itself turned)
// Diagnostic only. usage: node --import tsx scripts/diag/effective-mass/facing-req.mts [restage dir]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const DIR = process.argv[2] ?? 'out/matched-restage';
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a)), D = (a: number) => Math.abs(wrap(a)) * 180 / Math.PI;
const rows: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!/Zone/i.test(st.offCall?.run?.scheme ?? '')) continue;
  const sim: any = new PlaySim(st); const up = sim.attackDir('O'); let prox: number | null = null, front = false, hitter: any = null, t0: number | null = null;
  const marks: any = {}; const tick = sim.tick.bind(sim);
  const reqFacing = (a: any) => { const it = sim.intents?.[a.idx]; if (!it) return NaN; if (Number.isFinite(it.facing)) return it.facing;
    const v = it.vel; return Math.hypot(v.x, v.y) > 0.2 ? Math.atan2(v.y, v.x) : NaN; };
  const snap = (c: any) => ({ hf: hitter.body.facing, rf: c.body.facing, hq: reqFacing(hitter), rq: reqFacing(c), hasF: Number.isFinite(sim.intents?.[hitter.idx]?.facing),
    bearing: Math.atan2(c.pos.y - hitter.pos.y, c.pos.x - hitter.pos.x), up: hitter.body.support.state === 'up' && c.body.support.state === 'up' });
  sim.tick = () => { tick(); const c = sim.carrier; if (!c) return;
    if (prox === null && sim.handoffAt >= 0) { const d = sim.defense.find((a: any) => Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) <= 1.0);
      if (d) { prox = sim.t; hitter = d; const sp = Math.hypot(c.vel.x, c.vel.y), rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
        front = sp > 0.5 && (rx * c.vel.x + ry * c.vel.y) / (rd * sp) > Math.cos(Math.PI / 4) && (c.pos.x - sim.los) * up >= -1 && (c.pos.x - sim.los) * up < 3; } }
    if (hitter && t0 === null && sim.t - prox! <= 0.5 + 1e-9 && Math.hypot(hitter.pos.x - c.pos.x, hitter.pos.y - c.pos.y) <= 0.65) { t0 = sim.t; marks[0] = snap(c); }
    if (t0 !== null) for (const m of [0.1, 0.3]) if (!(m in marks) && sim.t >= t0 + m - 1e-9) marks[m] = snap(c); };
  sim.run();
  if (!front || t0 === null || !marks[0.3]) continue;
  const a = marks[0], b = marks[0.3];
  rows.push({ blocked: sim.offense.some((o: any) => o !== sim.carrier && Math.hypot(o.pos.x - hitter.pos.x, o.pos.y - hitter.pos.y) < 1.2),
    hAch: D(b.hf - a.hf), hReq: D(b.hq - a.hq), hLag: D(b.hq - b.hf), hLag0: D(a.hq - a.hf), rAch: D(b.rf - a.rf), rReq: D(b.rq - a.rq), rLag: D(b.rq - b.rf),
    bear: D(b.bearing - a.bearing), hasF: a.hasF, up: a.up && b.up });
}
const q = (v: number[], f = 0.5) => { const s = v.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const t3 = (v: number[]) => [0.25, 0.5, 0.75].map(f => q(v, f).toFixed(0)).join('/');
const line = (label: string, rs: any[]) => console.log(`  ${label.padEnd(26)} n ${String(rs.length).padStart(3)} | hitter: achieved ${t3(rs.map(r => r.hAch))}, requested ${t3(rs.map(r => r.hReq))}, request - body at contact ${t3(rs.map(r => r.hLag0))}, at +0.3 ${t3(rs.map(r => r.hLag))} | runner: achieved ${t3(rs.map(r => r.rAch))}, requested ${t3(rs.map(r => r.rReq))}, lag ${t3(rs.map(r => r.rLag))} | bearing turned ${t3(rs.map(r => r.bear))}`);
console.log('front-on first contacts on zone runs, from torso distance to +0.3 s; degrees, p25/p50/p75');
line('all', rows); line('both on their feet', rows.filter(r => r.up)); line('hitter blocked', rows.filter(r => r.blocked)); line('hitter free', rows.filter(r => !r.blocked));
console.log(`  hitter's intent names a facing on ${(100 * rows.filter(r => r.hasF).length / rows.length).toFixed(0)}% (else his requested velocity stands in)`);
