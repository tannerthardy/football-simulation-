// Counter back: why he crosses inside the kick. Saved stream, seeds 7..29. Per play: back lat at cross vs kicker lat
// (+ = outside). For each runReadAim 'aim' read: preferred lat, selected lat, the candidate nearest preferred
// (risk/score) vs the selected one. First read where selected is >1 yd inside preferred: time, back depth, why.
import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker, playSideSign } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const { runReadObservers } = await import(`${W}/src/sim/run-read-observer.ts`);
const rows: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  snaps.forEach((p: any, idx: number) => {
    if (p.pass) return; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== 'counter') return;
    const sim: any = new PlaySim(st);
    const ps = playSideSign(sim, sim.offCall.run), dir = sim.attackDir('O'), lat = (y: number) => (y - sim.ballY) * ps;
    const kick = sim.offense.find((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.pullRole === 'kick');
    const reads: any[] = []; let cross: any = null;
    runReadObservers.set(sim, (e: any) => { if (e.phase !== 'aim' || !e.candidates?.length || !e.selected) return;
      const c = sim.agents[e.actor];
      const pref = lat(e.preferred), sel = lat(e.selected.y);
      const near = e.candidates.reduce((b: any, q: any) => Math.abs(lat(q.entry.y) - pref) < Math.abs(lat(b.entry.y) - pref) ? q : b);
      const chosen = e.candidates.reduce((b: any, q: any) => q.score < b.score ? q : b);
      reads.push({ t: e.t, depth: (c.pos.x - sim.los) * dir, pref, sel, chosenLat: lat(chosen.entry.y), chosenRisk: chosen.risk, chosenScore: chosen.score,
        nearLat: lat(near.entry.y), nearRisk: near.risk, nObs: near.parts?.obstruct, nM1: near.parts?.m1, nM2: near.parts?.m2, nWho: near.parts?.who, cObs: chosen.parts?.obstruct, cM1: chosen.parts?.m1, cM2: chosen.parts?.m2, nearScore: near.score, kickLat: kick ? lat(kick.pos.y) : NaN, tags: [...c.tags].join(',') }); });
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); const c = sim.carrier; if (!cross && c && c !== sim.qb && (c.pos.x - sim.los) * dir >= 0) cross = { t: sim.t, lat: lat(c.pos.y), kick: kick ? lat(kick.pos.y) : NaN }; };
    try { sim.run(); } catch { return; }
    if (!cross) return;
    const firstIn = reads.find(r => r.chosenLat < r.pref - 1);
    rows.push({ seed, idx, cross, nReads: reads.length, firstIn, first: reads[0], last: reads.at(-1) });
  });
}
const q = (v: number[], p: number) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? +s[Math.floor(p * (s.length - 1))].toFixed(2) : NaN; };
const inside = rows.filter(r => r.cross.lat - r.cross.kick < -1);
console.log('plays', rows.length, 'crossed >1 yd inside kick', inside.length);
const fi = inside.filter(r => r.firstIn).map(r => r.firstIn);
console.log('inside plays with a read choosing >1 yd inside preferred:', fi.length);
for (const k of ['nObs','nM1','nM2','cObs','cM1','cM2','t', 'depth', 'pref', 'chosenLat', 'kickLat', 'chosenRisk', 'nearLat', 'nearRisk', 'chosenScore', 'nearScore'])
  console.log(k.padEnd(12), 'p25', q(fi.map((r: any) => r[k]), .25), 'med', q(fi.map((r: any) => r[k]), .5), 'p75', q(fi.map((r: any) => r[k]), .75));
const W2: Record<string,number>={}; for (const r of fi as any[]) { const k=(r.nWho||'').replace(/^[A-Z_]+?(\*?)@/, (m:string)=>m.replace(/^[A-Z]+_?[A-Z]*/,'X')); W2[k]=(W2[k]??0)+1; } console.log('near closer', W2);
console.log('nearRisk components: share nearRisk>=4 (someone beats him there)', (fi.filter((r: any) => r.nearRisk >= 4).length / fi.length).toFixed(2), 'obstruction-only (1.5..4)', (fi.filter((r: any) => r.nearRisk >= 1.5 && r.nearRisk < 4).length / fi.length).toFixed(2));
console.log('pref lat of first read (all plays)', q(rows.map(r => r.first?.pref), .25), q(rows.map(r => r.first?.pref), .5), q(rows.map(r => r.first?.pref), .75));
for (const r of inside.slice(0, 8)) console.log(`s${r.seed}#${r.idx} cross ${r.cross.t.toFixed(2)} lat ${r.cross.lat.toFixed(2)} kick ${r.cross.kick.toFixed(2)} | firstIn ${r.firstIn ? JSON.stringify(Object.fromEntries(Object.entries(r.firstIn).map(([k, v]: any) => [k, typeof v === 'number' ? +v.toFixed(2) : v]))) : '-'}`);
