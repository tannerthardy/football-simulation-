// NOTE: laws B (DIAG_GRASP_NO_TANGENT) and the all-holds grasp path (DIAG_GRASP_PATCH) were temporary engine switches
// used once on 2026-11-10 and not committed; without them this script runs laws A and C (--patch) only.
// Step 2 (b): who holds a grasped runner centred? For front-on first contacts on zone runs (facing-req.mts's
// selection), at the tick the first-proximity hitter's grasp on the runner forms:
//   offset   the hitter's lateral offset from the runner's path (path = his travel at first proximity), yd
//   free     no offensive player within 1.2 yd of the hitter at first proximity (frontcourse's rule)
// and every tick from the grasp to +0.3 s, relative to the line of centres (n: runner -> hitter, t across it, signed so
// + is the way the runner is slipping at the grasp):
//   runner   request across (t) and into (n) the hitter, achieved across; angle of his request off "straight at him"
//   hitter   request across, achieved across
//   slip     relative velocity across (runner - hitter)
// Then the bench replay: the two bodies cloned at the grasp tick into a fresh World with only them and the same grasp
// joint, stepped with the game's recorded requests for 0.3 s. If the replay locks like the game, the requests hold
// the pair centred; if it releases, something else in the game World does.
// Diagnostic only. usage: node --import tsx scripts/diag/effective-mass/lock-requests.mts [restage dir]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { World } = await import(`${W}/src/physics/world.ts`);
const DIR = process.argv.slice(2).find(a => !a.startsWith('--')) ?? 'out/matched-restage';
const rows: any[] = [];
const clone = (b: any) => ({ ...b, pos: { ...b.pos }, vel: { ...b.vel }, support: b.support ? structuredClone(b.support) : undefined });
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!/Zone/i.test(st.offCall?.run?.scheme ?? '')) continue;
  const sim: any = new PlaySim(st); const up = sim.attackDir('O');
  let prox: number | null = null, front = false, hitter: any = null, free = false, path = 0, g: any = null; const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const c0 = sim.carrier;
    // State before this tick, for the replay's starting point.
    const pre = g && !g.start ? { r: clone(c0.body), h: clone(hitter.body), joint: sim.world.joints.find((j: any) => j.kind === 'grasp' && !j.broken && j.a === hitter.body && j.b === c0.body) } : null;
    tick(); const c = sim.carrier; if (!c) return;
    if (prox === null && sim.handoffAt >= 0) { const d = sim.defense.find((a: any) => Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) <= 1.0);
      if (d) { prox = sim.t; hitter = d; const sp = Math.hypot(c.vel.x, c.vel.y), rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
        path = Math.atan2(c.vel.y, c.vel.x);
        free = !sim.offense.some((o: any) => o !== c && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) <= 1.2);
        front = sp > 0.5 && (rx * c.vel.x + ry * c.vel.y) / (rd * sp) > Math.cos(Math.PI / 4) && (c.pos.x - sim.los) * up >= -1 && (c.pos.x - sim.los) * up < 3; } }
    if (!hitter || c !== sim.carrier) return;
    const joint = sim.world.joints.find((j: any) => j.kind === 'grasp' && !j.broken && j.a === hitter.body && j.b === c.body);
    if (!g && joint && sim.t - prox! <= 0.6) {
      const ux = Math.cos(path), uy = Math.sin(path);
      g = { t0: sim.t, offset: Math.abs(-(hitter.pos.x - c.pos.x) * uy + (hitter.pos.y - c.pos.y) * ux), ticks: [], legs: joint.legs, origin: joint.origin };
      g.start = { r: clone(c.body), h: clone(hitter.body), joint: { ...joint, a: 'H', b: 'R' } }; g.path = path;
    }
    if (g && sim.t > g.t0 + 1e-9 && sim.t <= g.t0 + 1.0 + 1e-9) {
      const nx0 = hitter.pos.x - c.pos.x, ny0 = hitter.pos.y - c.pos.y, L = Math.hypot(nx0, ny0) || 1, nx = nx0 / L, ny = ny0 / L, tx = -ny, ty = nx;
      const rq = sim.intents[c.idx], hq = sim.intents[hitter.idx];
      if (g.sgn === undefined) g.sgn = Math.sign((c.vel.x - hitter.vel.x) * tx + (c.vel.y - hitter.vel.y) * ty) || 1;
      const s = g.sgn, T = (v: any) => s * ((v?.x ?? 0) * tx + (v?.y ?? 0) * ty), N = (v: any) => (v?.x ?? 0) * nx + (v?.y ?? 0) * ny;
      const rs = Math.hypot(rq?.vel?.x ?? 0, rq?.vel?.y ?? 0);
      g.ticks.push({ rReqT: T(rq?.vel), rReqN: N(rq?.vel), rAchT: T(c.vel), hReqT: T(hq?.vel), hAchT: T(hitter.vel), slip: T(c.vel) - T(hitter.vel),
        rAng: rs > 0.3 ? Math.acos(Math.max(-1, Math.min(1, N(rq.vel) / rs))) * 180 / Math.PI : NaN, rI: rq ? structuredClone(rq) : null, hI: hq ? structuredClone(hq) : null });
    }
  };
  sim.run();
  if (front && g && g.ticks.length >= 4) rows.push({ ...g, free });
}
// Bench replay of each contact with the game's requests.
const replay = (g: any, mode = '') => {
  const r = clone(g.start.r), h = clone(g.start.h); const w = new World([r, h]);
  const jt: any = { ...g.start.joint, a: h, b: r };
  if (mode === 'upper') jt.legs = 0;
  if (mode === 'half') jt.capacity = jt.capacity * 0.5;
  if (mode === 'nopull') jt.pull = 0;
  w.joints = mode === 'nograsp' ? [] : [jt] as any;
  let slip3 = NaN, turn = NaN; const a0 = Math.atan2(h.pos.y - r.pos.y, h.pos.x - r.pos.x);
  g.ticks.forEach((k: any, i: number) => {
    let rI = k.rI ?? { vel: { x: 0, y: 0 } };
    if (mode === 'across') { // the runner's request with its part into the hitter removed (across part unchanged)
      const nx0 = h.pos.x - r.pos.x, ny0 = h.pos.y - r.pos.y, L = Math.hypot(nx0, ny0) || 1, nx = nx0 / L, ny = ny0 / L;
      const into = Math.max(0, rI.vel.x * nx + rI.vel.y * ny); rI = { ...rI, vel: { x: rI.vel.x - into * nx, y: rI.vel.y - into * ny } };
    }
    w.step([rI, k.hI ?? { vel: { x: 0, y: 0 } }] as any, 0.05);
    if (i === g.ticks.length - 1) { const nx0 = h.pos.x - r.pos.x, ny0 = h.pos.y - r.pos.y, L = Math.hypot(nx0, ny0) || 1;
      slip3 = Math.abs(-(r.vel.x - h.vel.x) * ny0 / L + (r.vel.y - h.vel.y) * nx0 / L);
      const a = Math.atan2(ny0, nx0); turn = Math.abs(Math.atan2(Math.sin(a - a0), Math.cos(a - a0))) * 180 / Math.PI; } });
  return { slip3, turn };
};
const q = (v: number[], f = 0.5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const at = (g: any, i: number, k: string) => g.ticks[Math.min(i, g.ticks.length - 1)][k];
const mean = (g: any, k: string) => g.ticks.reduce((a: number, t: any) => a + t[k], 0) / g.ticks.length;
for (const [label, set] of [['all', rows], ['free', rows.filter(r => r.free)], ['blocked', rows.filter(r => !r.free)]] as const) {
  const rs = set.map(g => replay(g)), ra = set.map(g => replay(g, 'across'));
  const extra = ['nograsp', 'upper', 'half', 'nopull'].map(m => { const x = set.map(g => replay(g, m)); return `${m} ${q(x.map(r => r.slip3)).toFixed(2)}/${q(x.map(r => r.turn)).toFixed(0)}deg`; }).join(' | ');
  console.log(`${label}: n ${set.length} | offset at grasp p25/p50/p75 ${[0.25, 0.5, 0.75].map(f => q(set.map(g => g.offset), f).toFixed(2)).join('/')} yd | legs share p50 ${q(set.map(g => g.legs)).toFixed(2)}`);
  console.log(`  over +0..+0.3 s (mean per contact, then median; across the line of centres, + = his slipping way, yd/s):`);
  console.log(`    runner: request across ${q(set.map(g => mean(g, 'rReqT'))).toFixed(2)}, into him ${q(set.map(g => mean(g, 'rReqN'))).toFixed(2)}, achieved across ${q(set.map(g => mean(g, 'rAchT'))).toFixed(2)} | his request ${q(set.map(g => q(g.ticks.map((t: any) => t.rAng)))).toFixed(0)} deg off straight at the hitter`);
  console.log(`    hitter: request across ${q(set.map(g => mean(g, 'hReqT'))).toFixed(2)}, achieved across ${q(set.map(g => mean(g, 'hAchT'))).toFixed(2)}`);
  console.log(`    slip across at +0.1 / +0.3 s: game ${q(set.map(g => Math.abs(at(g, 1, 'slip')))).toFixed(2)} / ${q(set.map(g => Math.abs(at(g, 5, 'slip')))).toFixed(2)} | bench replay with the game's requests: +0.3 ${q(rs.map(r => r.slip3)).toFixed(2)}, line turned ${q(rs.map(r => r.turn)).toFixed(0)} deg | replay with the runner's push into him removed: +0.3 ${q(ra.map(r => r.slip3)).toFixed(2)}, line turned ${q(ra.map(r => r.turn)).toFixed(0)} deg`);
  console.log(`    replay variants (slip at +0.3 / line turned): ${extra} | capacity p50 ${q(set.map(g => g.start.joint.capacity)).toFixed(0)}, pull p50 ${q(set.map(g => g.start.joint.pull ?? 0)).toFixed(1)}, runner foot held ${(100 * set.filter(g => !!g.start.r.support?.foot).length / set.length).toFixed(0)}%`);
}

// Integration's three laws on the replayed contacts (2026-11-10): (A) today's grasp; (B) the grasp as a distance link
// only (its tangential row removed; set by the process env DIAG_GRASP_NO_TANGENT=1 when this runs, so run per law);
// (C) the World's patch law (the grip-point version with its yaw coupling). Each contact replayed for 1.0 s with the
// game's recorded requests.
const law = (process.env['DIAG_GRASP_NO_TANGENT'] == '1' ? 'B: distance link only' : process.argv.includes('--patch') ? 'C: patch law' : 'A: today') + (process.argv.includes('--upper') ? ', every hold forced upper (legs 0)' : '');
const replay3 = (g: any, free = false) => {
  const r = clone(g.start.r), h = clone(g.start.h);
  const w = new World([r, h], process.argv.includes('--patch') ? { handContact: 'patch', handIntegration: 'centered' } as any : {});
  w.joints = [{ ...g.start.joint, a: h, b: r, ...(process.argv.includes('--upper') ? { legs: 0 } : {}) }] as any;
  const a0 = Math.atan2(h.pos.y - r.pos.y, h.pos.x - r.pos.x), ux = Math.cos(g.path), uy = Math.sin(g.path);
  const o: any = { down: NaN, err: 0 };
  const T = Array.from({ length: 20 }, (_, i) => g.ticks[Math.min(i, g.ticks.length - 1)]);
  T.forEach((k: any, i: number) => {
    const p0x = r.vel.x * r.profile.massKg + h.vel.x * h.profile.massKg;
    const rep = w.step(free ? [{ vel: { x: 0, y: 0 }, free: true }, { vel: { x: 0, y: 0 }, free: true }] as any : [k.rI ?? { vel: { x: 0, y: 0 } }, k.hI ?? { vel: { x: 0, y: 0 } }] as any, 0.05);
    o.err = Math.max(o.err, Math.abs(r.vel.x * r.profile.massKg + h.vel.x * h.profile.massKg - p0x - rep.groundImpulse[0].x - rep.groundImpulse[1].x));
    const s = i + 1, nx0 = h.pos.x - r.pos.x, ny0 = h.pos.y - r.pos.y, L = Math.hypot(nx0, ny0) || 1;
    const slip = Math.abs(-(r.vel.x - h.vel.x) * ny0 / L + (r.vel.y - h.vel.y) * nx0 / L);
    if (s === 2) o.s1 = slip; if (s === 6) { o.s3 = slip; const a = Math.atan2(ny0, nx0); o.turn = Math.abs(Math.atan2(Math.sin(a - a0), Math.cos(a - a0))) * 180 / Math.PI;
      o.sq = Math.abs(Math.atan2(Math.sin(h.facing - (g.path + Math.PI)), Math.cos(h.facing - (g.path + Math.PI)))) * 180 / Math.PI; o.hv3 = Math.hypot(h.vel.x, h.vel.y); }
    const along = r.vel.x * ux + r.vel.y * uy;
    if (s === 2) o.v1 = along; if (s === 10) o.v5 = along; if (s === 20) o.v10 = along;
    if (Number.isNaN(o.down) && r.support?.state !== 'up') o.down = s * 0.05;
  });
  return o;
};
const full = rows.filter(g => g.ticks.length >= 6); // padded to 1.0 s with the last request (plays that ended early included)
console.log(`\nLAW ${law}: ${full.length} contacts replayed 1.0 s with the game's requests, the last one held after the play ended (median; runner speed along his path at the grasp, yd/s)`);
for (const [label, set] of [['all', full], ['free', full.filter(g => g.free)], ['blocked', full.filter(g => !g.free)]] as const) {
  const x = set.map(g => replay3(g)), fr = set.slice(0, 20).map(g => replay3(g, true));
  console.log(`  ${label.padEnd(8)} n ${String(set.length).padStart(3)} | slip +0.1 ${q(x.map(o => o.s1)).toFixed(2)} +0.3 ${q(x.map(o => o.s3)).toFixed(2)} | line turned +0.3 ${q(x.map(o => o.turn)).toFixed(0)} deg | hitter from square +0.3 ${q(x.map(o => o.sq)).toFixed(0)} deg, hitter speed ${q(x.map(o => o.hv3)).toFixed(2)} | runner +0.1 ${q(x.map(o => o.v1)).toFixed(2)} +0.5 ${q(x.map(o => o.v5)).toFixed(2)} +1.0 ${q(x.map(o => o.v10)).toFixed(2)} | runner down within 1.0 s ${(100 * x.filter(o => Number.isFinite(o.down)).length / x.length).toFixed(0)}% (median at ${q(x.map(o => o.down)).toFixed(2)} s) | momentum error, free intents, max ${Math.max(...fr.map(o => o.err)).toExponential(1)}`);
}
