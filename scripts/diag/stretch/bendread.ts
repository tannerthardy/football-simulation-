/** Inside zone, at the runner's first entry read inside 2.5 yd of the line
 * (observation only, via the run-read observer): the lane he selects, the
 * best middle (within 1 yd of the ball) candidate's risk against the chosen
 * one, and which defender his threat model expects at that middle entry
 * first (slot, engaged or free, margin in s, depth).
 * node --import tsx scripts/diag/stretch/bendread.ts [--seeds 77,71001,1,2] */
import { LOOK_SPECS, makeSim, rosters } from '../zone-lab/lab.js';
import { runReadObservers } from '../../../src/sim/run-read-observer.js';
import { timeToReach } from '../../../src/physics/reach.js';
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
type Cand = { entry: { x: number; y: number }; risk: number; score: number };
const R = rosters(); const rows: { lane: string; midRisk: number | null; selRisk: number; who: { m: number; key: string; depth: number } | null }[] = [];
for (const dir of ['strong', 'weak'] as const) for (const [lk] of LOOK_SPECS) for (const roster of ['pair11', 'pair31'])
  for (const seed of arg('--seeds', '77,71001,1,2').split(',').map(Number)) {
    const sim = makeSim({ concept: 'iz', dir, look: lk, roster, seed, formation: arg('--formation', 'ace_12') }, R);
    let done = false;
    runReadObservers.set(sim, (ev) => {
      const cands = (ev as unknown as { candidates?: Cand[] }).candidates;
      const c = sim.carrier;
      if (done || ev.phase !== 'aim' || !cands?.length || !c || (c.pos.x - sim.los) * sim.attackDir('O') < -2.5) return;
      done = true;
      const preferred = (ev as unknown as { preferred: number }).preferred, ps = Math.sign(preferred - sim.ballY) || 1;
      const lane = (y: number) => { const v = (y - sim.ballY) * ps; return v < -1 ? 'cutback' : v <= 1 ? 'middle' : v <= 4 ? 'playside' : 'outside'; };
      const best = (s: Cand[]) => s.reduce((m, k) => k.score < m.score ? k : m);
      const sel = best(cands), mids = cands.filter(k => lane(k.entry.y) === 'middle'), mid = mids.length ? best(mids) : null;
      let who: { m: number; key: string; depth: number } | null = null;
      if (mid) {
        const arrive = timeToReach({ pos: c.pos, vel: c.vel, profile: c.profile, speedScale: c.speedScale }, mid.entry, 0);
        for (const d of sim.defense) {
          const s = sim.see(c, d);
          if (Math.hypot(s.pos.x - mid.entry.x, s.pos.y - mid.entry.y) > 8) continue;
          const m = timeToReach({ ...s, profile: d.profile }, mid.entry, d.profile.radius + c.profile.radius + d.profile.reach * .75) - arrive;
          if (!who || m < who.m) who = { m, key: `${d.slot.slice(0, 2)} ${d.engagement ? 'engaged' : 'free'}`, depth: (d.pos.x - sim.los) * sim.attackDir('O') };
        }
      }
      rows.push({ lane: lane(sel.entry.y), midRisk: mid?.risk ?? null, selRisk: sel.risk, who });
    });
    while (sim.phase === 'live' && sim.t < 4 && !done) sim.tick();
  }
const q = (v: number[], f = .5) => { const s = v.slice().sort((a, b) => a - b); return s.length ? +s[Math.floor(f * (s.length - 1))].toFixed(2) : NaN; };
const count = <T,>(xs: T[], k: (x: T) => string) => Object.entries(xs.reduce((m, x) => (m[k(x)] = (m[k(x)] ?? 0) + 1, m), {} as Record<string, number>)).sort((a, b) => b[1] - a[1]);
console.log(`reads ${rows.length}, selected lane:`, count(rows, r => r.lane));
const other = rows.filter(r => r.lane !== 'middle' && r.who);
console.log(`not middle with a middle candidate: ${other.length} | middle risk p25/50/75 ${q(other.map(r => r.midRisk!), .25)}/${q(other.map(r => r.midRisk!))}/${q(other.map(r => r.midRisk!), .75)}, chosen risk p50 ${q(other.map(r => r.selRisk))}`);
console.log('first defender expected at the best middle entry:', count(other, r => r.who!.key));
console.log(`  his margin (s, < 0 = there first) p25/50/75 ${q(other.map(r => r.who!.m), .25)}/${q(other.map(r => r.who!.m))}/${q(other.map(r => r.who!.m), .75)}, depth p50 ${q(other.map(r => r.who!.depth))} yd`);
