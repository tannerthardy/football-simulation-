// Attribute pursuit aim jumps to the chooser input that changed (TKL-2, Stage 4; diagnosis only).
// A window pairs a defender's chase rows 0.2 s apart on the same carrier, with the pursuer
// 1.5-15 yd away and moving faster than 2 yd/s. A jump is a feasible<->fallback flip, or a
// chosen intercept time that departs by more than 0.3 s from steady motion (0.2 s earlier
// after 0.2 s); a raw move over 0.3 s that steady motion explains is "steady drift".
// Every jump is re-run offline through interceptPoint (chooser.ts) by substitution: start
// from the earlier row's inputs and swap in one group of later inputs at a time
//   self     his own position and velocity
//   pos      the runner's consumed position (dead reckoned to now)
//   dir      the forecast heading
//   speed    the observed speed (relaxed speed shifted by the same amount)
//   accel    the observed acceleration term (relaxed speed only)
//   request  effort/speed budget, horizon and radius
// A group that alone reproduces the later choice owns the jump. For slow pursuers (below
// 0.8 of the runner's speed) at 6-15 yd, every window is also re-read with inputs held
// equal (`rules`), cumulatively and one at a time, to count the jumps each input causes.
// The slack curve shape uses the whole sampled curve (interceptPoint stops at its first
// feasible sample, so the traced curve is truncated there).
//   node --import tsx scripts/diag/aim-jump/attribute.ts scan.jsonl [out.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { choose, curve, inputs, swaps } from './chooser.js';
const [scanPath, out] = process.argv.slice(2);
const rows = readFileSync(scanPath, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const profiles = JSON.parse(readFileSync(scanPath.replace(/\.jsonl$/, '') + '.profiles.json', 'utf8'));
const deg = (v: any) => Math.atan2(v.y, v.x) * 180 / Math.PI;
const turn = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const hyp = (v: any) => Math.hypot(v.x, v.y);
const inc = (m: any, k: string, v = 1) => { m[k] = (m[k] ?? 0) + v; };
const groups = new Map<string, any[]>();
for (const r of rows) { const k = `${r.k}|${r.slot}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }
let checked = 0, recomputeMismatch = 0; const rounding: any = {};
const rules: any = {}, bearing: any = {}, tally: any = {}, owner: any = {}, steady: any = {}, ex: any[] = [], landscape: any = {};
const bandOf = (d: number) => d < 3 ? '1.5-3' : d < 6 ? '3-6' : d < 10 ? '6-10' : '10-15';
for (const [key, seq] of groups) {
  const hdRangeOf = (n: any) => { const hds = seq.filter(r => r.t > n.t - 0.6 - 1e-6 && r.t <= n.t + 1e-6 && r.c.id === n.c.id).map(r => deg(r.c.vel));
    return Math.max(...hds.map(h => turn(h, hds[0]))); };
  const at = new Map(seq.map(r => [Math.round(r.t * 1000), r]));
  for (const n of seq) {
    if (n.ipT === undefined) continue;
    const o = at.get(Math.round((n.t - 0.2) * 1000));
    if (!o || o.ipT === undefined || o.c.id !== n.c.id || n.planner !== 'used' || o.planner !== 'used') continue;
    if (n.dist < 1.5 || n.dist > 15 || hyp(n.vel) < 2) continue;
    const ratio = hyp(n.vel) / Math.max(0.1, hyp(n.c.vel));
    const speedK = ratio < 0.8 ? 'slow' : 'not slow';
    const b = bandOf(n.dist), cell = `${speedK} ${b}`;
    inc(tally, `${cell} | windows`);
    const profile = profiles[`${key.split('|')[0]}:${n.slot}`];
    if (checked < 20000) { checked++; const re = choose(inputs(n), profile);
      if (Math.abs(re.t - n.ipT) > 1e-6 || re.status !== n.status) { recomputeMismatch++;
        // Inputs are stored to 0.001; say what kind of choice that rounding was enough to move.
        const sl = curve(inputs(n), profile).map(q => q.slack), b = Math.max(...sl);
        inc(rounding, n.status === 'B' ? `fallback, ends differ by ${Math.abs(sl[0] - sl.at(-1)!) < 0.02 ? '<0.02 s' : '>=0.02 s'}`
          : `feasible, whole-curve best slack ${b < 0.25 ? '< 0.25 s' : '>= 0.25 s'}`); } }
    const aimTurn = turn(Math.atan2(n.aim.y - n.pos.y, n.aim.x - n.pos.x) * 180 / Math.PI, Math.atan2(o.aim.y - o.pos.y, o.aim.x - o.pos.x) * 180 / Math.PI);
    const flip = o.status !== n.status, raw = Math.abs(n.ipT - o.ipT) > 0.3;
    const slow6 = ratio < 0.8 && n.dist >= 6;
    if (slow6) {
      inc(bearing, 'windows');
      if (n.status === 'F') { const b = Math.max(...curve(inputs(n), profile).map(q => q.slack));
        inc(landscape, `all slow 6-15 windows choosing feasible | whole-curve best slack ${b < 0.25 ? '< 0.25' : b < 0.5 ? '0.25-0.5' : '>= 0.5'} s`); }
      // The same two pictures read with inputs held equal, cumulatively: does the jump survive?
      const cum: Array<[string, (o: any, n: any) => [any, any]]> = [
        ['1 as traced', (x, y) => [x, y]],
        ['2 no accel term', (x, y) => [{ ...x, V: x.sp }, { ...y, V: y.sp }]],
        ['3 + same effort budget/horizon', (x, y) => [{ ...x, V: x.sp, req: y.req, horizon: y.horizon, radius: y.radius }, { ...y, V: y.sp }]],
        ['4 + same observed speed', (x, y) => [{ ...x, V: y.sp, sp: y.sp, req: y.req, horizon: y.horizon, radius: y.radius }, { ...y, V: y.sp }]],
        ['only: same effort budget/horizon', (x, y) => [{ ...x, req: y.req, horizon: y.horizon, radius: y.radius }, y]],
        ['only: same observed speed', (x, y) => [{ ...x, sp: y.sp, V: x.V + (y.sp - x.sp) }, y]],
        ['only: same heading', (x, y) => [{ ...x, h: y.h }, y]],
        ['only: horizon 6 s', (x, y) => [{ ...x, horizon: 6 }, { ...y, horizon: 6 }]],
        ['only: no accel term, horizon 6 s', (x, y) => [{ ...x, V: x.sp, horizon: 6 }, { ...y, V: y.sp, horizon: 6 }]],
        ['5 + same heading', (x, y) => [{ ...x, V: y.sp, sp: y.sp, h: y.h, req: y.req, horizon: y.horizon, radius: y.radius }, { ...y, V: y.sp }]],
      ];
      const hd = hdRangeOf(n) < 10 ? 'carrier heading steady' : 'carrier turned';
      for (const [rule, fn] of cum) {
        const [x, y] = fn(inputs(o), inputs(n));
        const a = choose(x, profile), b = choose(y, profile);
        const j = a.status !== b.status || Math.abs(b.t - (a.t - 0.2)) > 0.3;
        const br = (q: any, r: any) => Math.atan2(q.y - r.mpos.y, q.x - r.mpos.x) * 180 / Math.PI;
        const tt = turn(br(b.point, n), br(a.point, o));
        inc(rules, `${rule} | jumps`, j ? 1 : 0); inc(rules, `${rule} | forecast-point bearing turned >15 deg`, tt > 15 ? 1 : 0);
        inc(rules, `${rule} | ${hd} | jumps`, j ? 1 : 0); inc(rules, `${rule} | ${hd} | bearing >15`, tt > 15 ? 1 : 0);
        if (j && rule === '5 + same heading') inc(rules, `${rule} | residual jumps, ${a.status === b.status ? (a.status === 'F' ? 'switch feasible' : 'switch fallback') : 'flip'}`);
      }
      inc(rules, `windows | ${hd}`);
    }
    // Steady motion moves the chosen time 0.2 s earlier in 0.2 s; a real jump departs from that.
    const excess = Math.abs(n.ipT - (o.ipT - 0.2)) > 0.3;
    if (!flip && !raw) { if (slow6 && aimTurn > 15) inc(bearing, 'aim turned >15 deg | no jump'); continue; }
    const kind = flip ? (n.status === 'B' ? 'flip to fallback' : 'flip to feasible') : `switch ${o.status === 'F' ? 'feasible' : 'fallback'}`;
    inc(tally, `${cell} | ${kind}`);
    if (!flip && !excess) { inc(tally, `${cell} | ${kind} | steady drift only`); }
    if (!(ratio < 0.8 && n.dist >= 6)) continue;
    const H = n.horizonIp;
    const co = curve(inputs(o), profile).map(q => q.slack), cn = curve(inputs(n), profile).map(q => q.slack);
    // Shape of the slack curve the chooser read (before and after).
    const best = (s: number[]) => Math.max(...s);
    const end = (t: number) => t < 0.05 || t > H - 0.05;
    const shape = !flip && o.status === 'B' && end(o.ipT) && end(n.ipT) && Math.abs(n.ipT - o.ipT) > H / 2 ? 'fallback hops between ends'
      : !flip && o.status === 'B' ? 'fallback interior'
      : Math.max(best(co), best(cn)) < 0.25 ? 'feasible window barely open (whole-curve best slack < 0.25 s)'
      : 'feasible window open wider';
    const real = flip || excess ? 'jump' : 'steady drift';
    // Did the runner really change? His true motion over the window.
    const trueTurn = turn(deg(n.c.vel), deg(o.c.vel)), trueDv = Math.abs(hyp(n.c.vel) - hyp(o.c.vel));
    // Steady over everything the picture could hold: his true motion over the last 0.6 s.
    const hist = seq.filter(r => r.t > n.t - 0.6 - 1e-6 && r.t <= n.t + 1e-6 && r.c.id === n.c.id);
    const sps = hist.map(r => hyp(r.c.vel)), hds = hist.map(r => deg(r.c.vel));
    const spRange = Math.max(...sps) - Math.min(...sps), hdRange = Math.max(...hds.map(h => turn(h, hds[0])));
    const steadyK = hdRange < 10 && spRange < 0.75 ? 'carrier steady (0.6 s: turn <10 deg, speed range <0.75)'
      : hdRange < 10 ? 'carrier speed varied, heading steady' : 'carrier turned';
    const I = inputs(o), J = inputs(n);
    const alone = Object.entries(swaps).filter(([, f]) => { const r = choose(f(I, J), profile);
      return r.status === n.status && Math.abs(r.t - n.ipT) <= 0.15; }).map(([g]) => g);
    const label = alone.length ? alone.join('+') : 'needs several';
    const dVacc = Math.abs((n.fc.V - n.fc.sp) - (o.fc.V - o.fc.sp));
    const reqK = (o.req?.effort ?? 1) !== (n.req?.effort ?? 1) ? 'effort budget changed' : o.horizonIp !== n.horizonIp ? 'horizon changed' : 'request same';
    inc(owner, `${real} | ${kind} | ${label}`);
    if (aimTurn > 15) { inc(bearing, `aim turned >15 deg | ${real} | ${shape}`); inc(bearing, `aim turned >15 deg | ${real} | ${kind}`); }
    inc(bearing, `deg summed | ${real} | ${shape}`, Math.round(aimTurn));
    inc(steady, `${real} | ${steadyK}`);
    inc(steady, `${real} | ${shape} | ${steadyK}`);
    inc(landscape, `${real} | ${shape}`);
    inc(landscape, `${real} | ${shape} | accel term moved ${dVacc > 1.5 ? '>1.5' : dVacc > 0.5 ? '0.5-1.5' : '<0.5'} yd/s`);
    inc(landscape, `${real} | ${reqK}`);
    if (shape === 'fallback hops between ends') { const tie = Math.min(Math.abs(co[0] - co.at(-1)!), Math.abs(cn[0] - cn.at(-1)!));
      inc(landscape, `${real} | ${shape} | ends tied within ${tie < 0.02 ? '0.02' : tie < 0.1 ? '0.1' : 'more than 0.1'} s`); }
    if (ex.length < 5000) ex.push({ key, slot: n.slot, t: n.t, kind, real, shape, label, steady: steadyK, dist: n.dist, ratio: +ratio.toFixed(2),
      ipT: [o.ipT, n.ipT], status: [o.status, n.status], trueTurn: +trueTurn.toFixed(1), trueDv: +trueDv.toFixed(2), spRange: +spRange.toFixed(2), hdRange: +hdRange.toFixed(1), aimTurn: +aimTurn.toFixed(1), cmdTurn: n.final && o.final && hyp(n.final) > .5 && hyp(o.final) > .5 ? +turn(deg(n.final), deg(o.final)).toFixed(1) : null, owner: n.owner,
      sp: [o.fc.sp, n.fc.sp], acc: [o.fc.acc, n.fc.acc], V: [o.fc.V, n.fc.V], req: [o.req?.effort, n.req?.effort], horizon: [o.horizonIp, n.horizonIp],
      bestSlack: [+best(co).toFixed(2), +best(cn).toFixed(2)] });
  }
}
const sorted = (m: any) => Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b)));
const res = { rows: rows.length, recomputeChecked: checked, recomputeMismatch, rounding, tally: sorted(tally), owner: sorted(owner), steady: sorted(steady), landscape: sorted(landscape), bearing: sorted(bearing), rules: sorted(rules) };
console.log(JSON.stringify(res, null, 1));
if (out) writeFileSync(out, JSON.stringify({ ...res, examples: ex }, null, 1));
