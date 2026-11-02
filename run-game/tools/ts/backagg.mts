// Native counter snaps (seeds 7..29 odd): carrier crossing lateral (play-side signed, from OL centre and from the
// play-side tackle's snap y), follow end time/depth, and at the last 'aim' read before crossing: preferred, selected,
// and the best candidate within 0.6 yd of preferred (its risk and score) vs the selected score. argv: worktree [concept]
import { readFileSync } from 'node:fs';
const W = process.argv[2], CON = process.argv[3] ?? 'counter';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { runReadObservers } = await import(`${W}/src/sim/run-read-observer.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const { RUN_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { liveAim } = await import(`${W}/src/sim/behaviors/carrier.ts`);
const { linePicture } = await import(`${W}/src/sim/live-gaps.ts`);
const r = (v: number) => v === undefined || Number.isNaN(v) ? 'nan' : (v >= 0 ? '+' : '') + v.toFixed(2);
const rows: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) {
  let snaps: any[]; try { snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8')); } catch { continue; }
  snaps.forEach((p: any, i: number) => {
    if (p.pass) return; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.id !== CON) return;
    if (process.env.INSTALLED) st.offCall.run = { ...st.offCall.run, ...RUN_BY_ID[CON] };
    const sim: any = new PlaySim(st); const los = sim.los, dir = sim.attackDir('O');
    const ol = sim.offense.filter((a: any) => ['LT','LG','C','RG','RT'].includes(a.slot)); const cy = ol.reduce((s: number, a: any) => s + a.pos.y, 0) / 5;
    const pulls = sim.offense.filter((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'pull');
    const path = pulls[0]?.behavior.plan.pullPath; if (!path) return;
    const ps = Math.sign(path.at(-1).y - cy) || 1;
    const stay = ol.filter((a: any) => !pulls.includes(a)); const pst = stay.reduce((b: any, a: any) => ((a.pos.y - cy) * ps > (b.pos.y - cy) * ps ? a : b)).pos.y;
    let aim: any = null, crossed: any = null, fe: any = null; const fe2: any = {};
    runReadObservers.set(sim, (e: any) => { if (e.phase === 'aim' && !crossed) aim = { ...e, t: sim.t }; });
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); const c = sim.carrier; if (!c || c === sim.qb || crossed) return;
      const b: any = c.behavior; if (fe === null && b.followEnded) fe = { t: sim.t, x: (c.pos.x - los) * dir };
      if (process.env.DBG && Math.abs(sim.t - 1.5) < 0.011) console.log('dbg', sim.t, sim.dt, b.constructor.name, !!b.opts?.aim);
      for (const T of [1.5, 1.8, 2.0, 2.2]) if (Math.abs(sim.t - T) < sim.dt / 2 && b.opts?.aim) { const la = liveAim(c, sim, b.opts); const lp = linePicture(sim, c);
        (fe2[T] = { la: la ? (la.y - pst) * ps : NaN, des: (b.opts.aimUntil ?? 0) > sim.t, n: lp.outward[ps > 0 ? '1' : '-1'].length, o: lp.outward[ps > 0 ? '1' : '-1'].map((q: any) => ((q.y - pst) * ps).toFixed(1) + (q.vacancy ? 'v' : '')).join(' '), car: (c.pos.y - pst) * ps }); }
      if ((c.pos.x - los) * dir >= 0) crossed = { t: sim.t, lat: (c.pos.y - cy) * ps, pst: (c.pos.y - pst) * ps }; };
    const kickT = pulls.find((q: any) => q.behavior.plan?.pullRole === 'kick')?.behavior.plan.target, leadT = pulls.find((q: any) => q.behavior.plan?.pullRole === 'lead')?.behavior.plan.target;
    sim.run();
    if (!crossed) return;
    const row: any = { fe2, los, pstY: pst, ps, kickT, leadT, seed, i, t: crossed.t, lat: crossed.lat, pst: crossed.pst, fe };
    if (aim) {
      row.aimT = aim.t; row.pref = (aim.preferred - pst) * ps; row.sel = aim.selected ? (aim.selected.y - pst) * ps : NaN;
      const cands = aim.candidates as any[]; const selC = cands.reduce((b: any, c: any) => (c.score < b.score ? c : b));
      const near = cands.filter((c: any) => Math.abs(c.entry.y - aim.preferred) < .6); const nb = near.length ? near.reduce((b: any, c: any) => (c.score < b.score ? c : b)) : null;
      row.selC = selC; row.nb = nb; row.selRisk = selC.risk; row.selScore = selC.score; row.prefRisk = nb?.risk ?? NaN; row.prefScore = nb?.score ?? NaN;
    }
    rows.push(row);
  });
}
const fmt = (c: any) => c ? `obs ${c.obstruct?.toFixed(1)} (O ${c.obsO?.toFixed(1)} D ${c.obsD?.toFixed(1)}) m1 ${c.m1?.toFixed(2)} m2 ${c.m2?.toFixed(2)}` : '-';
for (const w of rows) if (w.nb && w.selC) console.log('   comp pref:', fmt(w.nb), '| sel:', fmt(w.selC));
const agg = (k: string, f: (c: any) => number) => console.log(k, 'pref', r(med(rows.filter(w=>w.nb).map(w => f(w.nb)))), 'sel', r(med(rows.filter(w=>w.selC).map(w => f(w.selC)))));
const med0 = 0;
for (const w of rows) console.log(w.seed, w.i, 't', w.t.toFixed(1), 'lat', r(w.lat), 'pst', r(w.pst), 'fe', w.fe ? `${w.fe.t.toFixed(1)}@${w.fe.x.toFixed(1)}` : '-',
  w.aimT !== undefined ? `aim@${w.aimT.toFixed(1)} pref ${r(w.pref)} sel ${r(w.sel)} selRisk ${w.selRisk.toFixed(1)} prefRisk ${w.prefRisk.toFixed(1)} prefScore-selScore ${(w.prefScore - w.selScore).toFixed(1)}` : 'no aim');
const med = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v[v.length >> 1]; };
console.log('n', rows.length, 'cross lat ctr', r(med(rows.map(w => w.lat))), 'vs pst', r(med(rows.map(w => w.pst))), 'pref', r(med(rows.map(w => w.pref))), 'sel', r(med(rows.map(w => w.sel))));

agg('obstruct', c => c.obstruct); agg('obsO', c => c.obsO); agg('obsD', c => c.obsD); agg('m1', c => c.m1); agg('m2', c => c.m2);
console.log('pref m1<0', rows.filter(w=>w.nb&&w.nb.m1<0).length, 'pref obsO>0', rows.filter(w=>w.nb&&w.nb.obsO>0).length, 'pref obsD>0', rows.filter(w=>w.nb&&w.nb.obsD>0).length, 'of', rows.filter(w=>w.nb).length);

const C: Record<string, number> = {}; console.log('dbg', JSON.stringify(rows.slice(0,3).map(w => w.nb && Object.keys(w.nb))), rows.slice(0,3).map(w=>typeof w.nb?.who));
for (const w of rows) if (w.nb?.who) { const d = w.nb.who; const k = `${d.slot} ${w.nb.whoEng ? 'ENG' : 'free'} ${d === w.kickT ? 'KICKMAN' : d === w.leadT ? 'LEADMAN' : ''}`; C[k] = (C[k] ?? 0) + 1; }
console.log(Object.entries(C).sort((a, b) => b[1] - a[1]));

const T: Record<string, number[]> = {};
for (const w of rows) if (w.nb?.who) { const k = `${w.nb.who === w.kickT ? 'KICKMAN' : w.nb.who.slot.slice(0,2)} ${w.nb.whoEng ? 'ENG' : 'free'}`; (T[k] ??= []).push(w.nb.whoT, w.nb.m1); }
for (const [k, v] of Object.entries(T)) { const tt = v.filter((_, i) => i % 2 === 0), mm = v.filter((_, i) => i % 2 === 1); console.log('who', k, 'n', tt.length, 'threatT', r(med(tt)), 'm1', r(med(mm))); }

let shown = 0;
for (const w of rows) if (w.nb?.who === w.kickT && w.nb.whoEng && shown++ < 8) { const g = w.nb.geo, L = (P: any) => `(${(P.x - w.los).toFixed(2)},${((P.y - w.pstY) * w.ps).toFixed(2)})`;
  console.log('geo', w.seed, w.i, 'end', L(g.w), 'pt', L(g.q), 'entry', L(w.nb.entry), 'me', L(g.me), 'blk', g.blk.map((b: any) => b.slot + L(b) + ' d' + Math.hypot(b.x - g.w.x, b.y - g.w.y).toFixed(2)).join(' ')); }

for (const T of [1.5, 1.8, 2.0, 2.2]) { const v = rows.map(w => w.fe2[T]).filter(Boolean); console.log('T', T, 'n', v.length, 'liveAim vs PST', r(med(v.map((q: any) => q.la))), 'car vs PST', r(med(v.map((q: any) => q.car))), 'designed', v.filter((q: any) => q.des).length, 'nOut', med(v.map((q: any) => q.n))); }
for (const w of rows.slice(0, 6)) console.log('pic', w.seed, w.i, JSON.stringify(w.fe2));
