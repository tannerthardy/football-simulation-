// Blocker job churn on native captured snaps (seeds 7..29 odd, saved stream): for every OL/TE/back RunBlocker,
// every blocking change (reason, from target/kind -> to target/kind, t) before carrier cross + 0.6 s. Counts per
// scheme: changes per blocker, reversals (back to a target held within the previous 0.6 s), and by reason.
// argv: worktree [schemes]
import { readFileSync } from 'node:fs';
const W = process.argv[2], SCH = new Set((process.argv[3] ?? 'insideZone,outsideZone,wideZone,splitZone,duo,power,counter,trap').split(','));
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const out: any = {};
for (let seed = 7; seed <= 29; seed += 2) {
  let snaps: any[]; try { snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8')); } catch { continue; }
  snaps.forEach((p: any, idx: number) => {
    if (p.pass) return; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    const sc = st.offCall?.run?.scheme; if (!SCH.has(sc)) return;
    const sim: any = new PlaySim(st);
    const rec: any[] = []; let crossT = Infinity;
    const blockers = sim.offense.filter((a: any) => a.behavior instanceof RunBlocker);
    const hist = new Map<any, Array<{ t: number; tgt: any }>>();
    for (const a of blockers) hist.set(a, [{ t: 0, tgt: a.behavior.plan.target }]);
    const bs = sim.blockingSink.bind(sim);
    sim.blockingSink = (ag: any) => { const real = bs(ag); if (!blockers.includes(ag)) return real;
      return { blockingState: (x: any) => real?.blockingState(x) ?? null,
        blockingChange: (x: any, prev: any, reason: string, s2: any) => { real?.blockingChange(x, prev, reason, s2);
          const plan = x.behavior.plan; rec.push({ a: x, t: sim.t, reason: reason.split(':')[0], from: (prev?.target?.slot ?? prev?.plan?.target?.slot) ?? null, to: plan.target?.slot ?? null, kind: plan.kind }); } }; };
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); const c = sim.carrier; if (crossT === Infinity && c && c !== sim.qb && (c.pos.x - sim.los) * sim.attackDir('O') >= 0) crossT = sim.t;
      for (const a of blockers) { const h = hist.get(a)!; const tg = a.behavior.plan?.target ?? null; if (h.at(-1)!.tgt !== tg) h.push({ t: sim.t, tgt: tg }); } };
    try { sim.run(); } catch { return; }
    const o = out[sc] ??= { plays: 0, blockers: 0, changes: 0, reversals: 0, reasons: {}, revReasons: {}, ex: [] };
    o.plays++; o.blockers += blockers.length;
    for (const a of blockers) {
      const h = hist.get(a)!.filter(e => e.t <= crossT + 0.6);
      o.changes += h.length - 1;
      for (let i = 2; i < h.length; i++) {
        const back = h.slice(0, i - 1).some(e => e.tgt === h[i].tgt && h[i].t - e.t < 1.2 && h[i].tgt);
        if (back && h[i].t - h[i-1].t < 0.6) { o.reversals++;
          const r = rec.filter(x => x.a === a && Math.abs(x.t - h[i].t) < 1e-6).map(x => x.reason).join('+') || 'unattributed';
          const r0 = rec.filter(x => x.a === a && Math.abs(x.t - h[i-1].t) < 1e-6).map(x => x.reason).join('+') || 'unattributed';
          const k = `${r0} -> ${r}`; o.revReasons[k] = (o.revReasons[k] ?? 0) + 1;
          if (o.ex.length < 4) o.ex.push(`s${seed}#${idx} ${a.slot} ${h[i-2]?.tgt?.slot}->${h[i-1].tgt?.slot}@${h[i-1].t.toFixed(2)}->${h[i].tgt?.slot}@${h[i].t.toFixed(2)} (${k})`); }
      }
    }
    for (const x of rec) if (x.t <= crossT + 0.6) o.reasons[x.reason] = (o.reasons[x.reason] ?? 0) + 1;
  });
}
for (const [sc, o] of Object.entries<any>(out)) {
  console.log(`\n${sc}: plays ${o.plays} blockers ${o.blockers} | target changes/blocker ${(o.changes / o.blockers).toFixed(2)} | quick reversals (back to a man held <1.2 s ago, within 0.6 s) ${o.reversals} (${(o.reversals / o.plays * 100).toFixed(0)} per 100 plays)`);
  console.log('  reasons: ' + Object.entries<any>(o.reasons).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join(' | '));
  console.log('  reversal pairs: ' + Object.entries<any>(o.revReasons).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k} ${v}`).join(' | '));
  for (const e of o.ex) console.log('   ex ' + e);
}
