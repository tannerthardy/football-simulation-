/** Gap down blocks split by solo vs doubled: defender lateral (+ toward the play) at +0.3 and +1 s after contact, and for washed (< -0.8 yd) vs held (> -0.3) solo reps the 0.3-1.0 s means of both lateral requests, leg braces (World), felt load, pad level and control. Run under the launcher. */
import { RunBlocker, playSideSign } from '../../../src/sim/behaviors/blocking.js';
import { makeSim, rosters, LOOK_SPECS } from '../zone-lab/lab.js';
const R = rosters(), r2 = (x: number) => Math.round(x * 100) / 100;
const D: number[] = [], B: number[] = [], Dx: number[] = [], C: number[] = [], G: number[] = [];
let plays = 0; const ACC: any[] = []; const DD: number[] = [], DS: number[] = [], DQ: number[] = [];
for (const seed of (process.argv[2] ?? '77,71001').split(',').map(Number)) for (const concept of ['power', 'counter', 'trap'])
for (const formation of ['i_pro_21', 'ace_12']) for (const dir of ['strong', 'weak']) for (const [look] of LOOK_SPECS) {
  let sim; try { sim = makeSim({ concept, dir, formation, look, roster: 'pair11', seed } as never, R); } catch { continue; }
  plays++;
  const ps = playSideSign(sim, sim.offCall.run!), ad = sim.attackDir('O');
  const downs = sim.offense.filter(o => o.behavior instanceof RunBlocker && (o.behavior as RunBlocker).plan.kind === 'down');
  const c = sim.slot('C')!, c0 = c.pos.y;
  const st = new Map<any, any>();
  let cAt: number | null = null;
  while (sim.phase === 'live' && sim.t < 3) {
    sim.tick();
    if (cAt === null && sim.t >= 1.5) cAt = (c.pos.y - c0) * ps;
    for (const b of downs) {
      const p = (b.behavior as RunBlocker).plan; const d = p?.target; if (!d) continue;
      let s = st.get(b);
      if (!s && b.engagement?.defender === d) st.set(b, s = { t: sim.t, by: b.pos.y, dy: d.pos.y, solo: b.engagement.blocker === b && !b.engagement.helpers.length, dbl: 0, n: 0 });
      if (s && s.done === undefined && s.q === undefined && sim.t >= s.t + 0.3) s.q = (d.pos.y - s.dy) * ps;
      if (s && s.done === undefined && sim.t >= s.t + 0.3) {
        const w: any = sim.world, id = sim.intents[d.idx], ib = sim.intents[b.idx];
        s.acc ??= { k: 0, dreq: 0, breq: 0, dbr: 0, bbr: 0, dfy: 0, dfx: 0, dpad: 0, bpad: 0, ctl: 0, dface: 0 };
        const A = s.acc; A.k++; A.dreq += (id?.vel.y ?? 0) * ps; A.breq += (ib?.vel.y ?? 0) * ps;
        A.dbr += (w.braceY[d.idx] ?? 0) * ps; A.bbr += (w.braceY[b.idx] ?? 0) * ps;
        A.dfy += (d.body.support?.felt?.y ?? 0) * ps; A.dfx += Math.abs(d.body.support?.felt?.x ?? 0);
        A.dpad += d.body.support?.posture ?? 0; A.bpad += b.body.support?.posture ?? 0; A.ctl += d.engagement?.control ?? 0;
        A.dface += Math.abs(Math.cos(d.body.facing - Math.atan2(b.pos.y - d.pos.y, b.pos.x - d.pos.x)));
      }
      if (s && s.done === undefined) { s.n++; if (d.engagement && d.engagement.helpers.length) s.dbl++; }
      if (s && s.done === undefined && sim.t >= s.t + 1) { s.done = 1; ((s.dbl / s.n > 0.5) ? DD : DS).push((d.pos.y - s.dy) * ps); if (s.dbl / s.n <= 0.5) { DQ.push(s.q ?? 0); if (s.acc) ACC.push({ w: (d.pos.y - s.dy) * ps, ...Object.fromEntries(Object.entries(s.acc).map(([k, v]: any) => [k, k === 'k' ? v : v / s.acc.k])) }); } B.push((b.pos.y - s.by) * ps); D.push((d.pos.y - s.dy) * ps); Dx.push((d.pos.x - sim.los) * ad); }
    }
  }
  if (cAt !== null) C.push(cAt);
  G.push(sim.buildResult().offenseYards);
}
const q = (a: number[], f = .5) => { const b = [...a].sort((x, y) => x - y); return b.length ? r2(b[Math.floor(f * (b.length - 1))]) : null; };
const mean = (a: number[]) => r2(a.reduce((s, x) => s + x, 0) / a.length);
console.log(`plays ${plays} | down reps ${D.length}: defender lat +1 s p50 ${q(D)} blocker ${q(B)} | defender depth +1 s p50 ${q(Dx)} | center lat 1.5 s p50 ${q(C)} | gain p50 ${q(G)} mean ${mean(G)} <0 ${G.filter(x => x < 0).length} <=2 ${G.filter(x => x <= 2).length}`);

console.log('doubled', DD.length, 'p50', q(DD), '| solo', DS.length, 'p50', q(DS), 'solo at +0.3 s', q(DQ));

for (const [name, f] of [['washed (< -0.8)', (a: any) => a.w < -0.8], ['held (> -0.3)', (a: any) => a.w > -0.3]] as const) {
  const g = ACC.filter(f as any);
  const m = (k: string) => q(g.map((a) => a[k]));
  console.log(name, g.length, 'D req', m('dreq'), 'B req', m('breq'), '| D brace', m('dbr'), 'B brace', m('bbr'), '| D felt y', m('dfy'), '|x|', m('dfx'), '| pad D/B', m('dpad'), m('bpad'), '| ctl', m('ctl'), '| D faces B cos', m('dface'));
}
