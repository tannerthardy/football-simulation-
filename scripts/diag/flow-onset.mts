/**
 * Native box-LB flow onset on zone runs: when does the full-speed flow request
 * begin, and how fast does the body follow it from that moment?
 *
 * For each unengaged box LB on outside/wide/toss/stretch runs, onset is the
 * first tick whose final intent asks for > 6 yd/s (a flow/pursuit request). From onset we
 * report the snap time of onset, the velocity he already had along that
 * request (a read step or backpedal makes it negative), and his achieved speed
 * along the onset request direction at +0.25/+0.5/+1.0 s, against his own
 * sprint law from that starting speed (src/players/physical.ts). Rows where he
 * becomes engaged or the play ends inside the window are dropped from later
 * columns.
 *
 * Usage: tsx scripts/diag/flow-onset.mts [repoRoot] [captures...]
 */
import { readFileSync } from 'node:fs';
const W = process.argv[2] ?? process.cwd();
const files = process.argv.length > 3 ? process.argv.slice(3) : [7, 8].map(k => `${W}/out/matched-restage/seed${k}.json`);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const OFF = [.25, .5, 1];
const rows: any[] = [];
for (const file of files) for (const p of JSON.parse(readFileSync(file, 'utf8'))) {
  if (p.pass) continue;
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
  if (!/outside|wide|toss|stretch/i.test(String(st.offCall?.run?.scheme))) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const box = sim.defense.filter((a: any) => { const s = sim.defAlign.spots[a.slot]?.pos; return a.slot.startsWith('LB') && s && Math.abs(s.x - sim.los) >= 2.5 && Math.abs(s.x - sim.los) <= 8 && Math.abs(s.y - sim.ballY) < 6; });
  const st8 = new Map<any, any>();
  while (sim.phase === 'live' && sim.t < 4) {
    const t0 = sim.t, pre = new Map(box.map((a: any) => [a, { ...a.vel }]));
    sim.tick();
    for (const a of box) {
      let s = st8.get(a);
      const iv = sim.intents[a.idx]?.vel, sp = iv ? Math.hypot(iv.x, iv.y) : 0;
      if (!s) {
        if (a.engagement || sp <= 6) continue;
        const u = { x: iv.x / sp, y: iv.y / sp }, v0: any = pre.get(a);
        s = { t: t0, u, v0: v0.x * u.x + v0.y * u.y, s0: Math.hypot(v0.x, v0.y), at: [] as (number | null)[], tau: a.profile.tau, vmax: a.profile.vmax, alive: true, req: [] as number[] };
        st8.set(a, s);
      }
      if (!s.alive) continue;
      if (a.engagement) { s.alive = false; continue; }
      const dt = sim.t - s.t; s.req.push(iv ? (iv.x * s.u.x + iv.y * s.u.y) : 0);
      for (let i = 0; i < OFF.length; i++) if (s.at[i] === undefined && dt >= OFF[i] - 1e-9) s.at[i] = a.vel.x * s.u.x + a.vel.y * s.u.y;
    }
  }
  for (const s of st8.values()) rows.push(s);
}
const med = (v: number[]) => { v = v.filter(x => x != null && Number.isFinite(x)).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : NaN; };
const q = (v: number[]) => { v = v.filter(x => x != null && Number.isFinite(x)).sort((a, b) => a - b); return v.length ? `${v[v.length >> 2].toFixed(2)}/${v[v.length >> 1].toFixed(2)}/${v[(3 * v.length) >> 2].toFixed(2)} (n ${v.length})` : '-'; };
// Sprint law from an initial speed v0 along the request: v(t) = V - (V - v0) e^{-t/tau}.
const law = (s: any, t: number) => s.vmax - (s.vmax - Math.max(0, s.v0)) * Math.exp(-t / s.tau);
console.log('zone-run box LBs with a flow onset:', rows.length);
console.log('onset time since snap p25/50/75', q(rows.map(r => r.t)));
console.log('speed along request at onset p25/50/75', q(rows.map(r => r.v0)), '| total speed', q(rows.map(r => r.s0)));
console.log('share starting against the request (v0 < -0.3)', (rows.filter(r => r.v0 < -.3).length / rows.length * 100).toFixed(0) + '%');
for (let i = 0; i < OFF.length; i++) {
  const g = rows.filter(r => r.at[i] != null);
  console.log(`+${OFF[i]} s: achieved along request ${q(g.map(r => r.at[i]))} | own sprint law from v0 ${q(g.map(r => law(r, OFF[i])))} | achieved/law p50 ${med(g.map(r => r.at[i] / law(r, OFF[i]))).toFixed(2)}`);
}
for (let i = 0; i < OFF.length; i++) {
  const n = Math.round(OFF[i] / 0.05);
  const g = rows.filter(r => r.at[i] != null && r.req.length >= n && r.req.slice(0, n).every((x: number) => x > 6));
  console.log(`steady (request > 6 along onset direction throughout) +${OFF[i]} s: achieved ${q(g.map(r => r.at[i]))} | law ${q(g.map(r => law(r, OFF[i])))} | achieved/law p50 ${med(g.map(r => r.at[i] / law(r, OFF[i]))).toFixed(2)}`);
}
console.log('request along onset direction over window (p50 of per-row mean)', med(rows.map(r => r.req.reduce((a: number, b: number) => a + b, 0) / Math.max(1, r.req.length))).toFixed(2));
