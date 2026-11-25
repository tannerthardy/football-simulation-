// A receiver's redirect in play against the same body stepped alone (redirect-law.mts's question, in the sim). Staged pass plays (the QB lane's nativeTraceSetup, every
// concept but screens, three coverages, three seeds, mirrored). Every offensive WR / TE / RB is tracked at 10 Hz; redirect-op.mts finds the events (entry 4.5-5.5 yd/s, 80-130 deg
// turn). For each, the body's state just before the onset tick is replayed alone with stepBody under the intents the play gave him over the next second, so what differs is
// the world (contacts, the trunk, the solver), not the request. Reported (p50, pooled): the turn achieved at +0.3 / +0.6 / +1.0 s in play and alone; the turn the request asked at those
// times (his intent's heading off the stem); the speed in play and alone; how often the request itself was held (heading within 15 deg of the exit) from the onset.
// usage: node --import tsx scripts/diag/route-speed/redirect-inplay.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { stepBody } = await import(`${W}/src/physics/kinematics.ts`);
const { redirects, summary, measureAt } = await import(`${W}/scripts/diag/route-speed/redirect-op.mts`);
const wrap = (a: number) => ((a + 540) % 360) - 180, deg = (v: { x: number; y: number }) => Math.atan2(v.y, v.x) * 180 / Math.PI;
const q = (v: number[], f = .5) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))]! : NaN; };
const evs: any[] = []; const rows: Record<string, number[]> = {}; const push = (k: string, v: number) => (rows[k] ??= []).push(v);
const concepts = Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id));
let plays = 0, tracks = 0;
for (const concept of concepts) for (const coverage of ['cover1', 'cover2', 'cover3']) for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) for (const flip of [false, true]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 1 + (seed % 3), formation: 'gun_doubles_11', flip })); } catch { continue; }
  plays++;
  const recv = sim.offense.filter((a: any) => a !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot));
  const snaps = new Map<any, any[]>(recv.map((a: any) => [a, []])), wstep = sim.world.step.bind(sim.world);
  sim.world.step = (intents: any[], dt: number) => {
    for (const a of recv) { const b = a.body, it = intents[a.idx]; snaps.get(a)!.push({ b: { ...b, pos: { ...b.pos }, vel: { ...b.vel }, support: b.support ? { ...b.support } : undefined }, it: it ? { ...it, vel: { ...it.vel } } : null, pos: { ...b.pos } }); }
    return wstep(intents, dt);
  };
  while (sim.phase === 'live' && sim.t < 4.5 && sim.throwAt < 0 || (sim.phase === 'live' && sim.t < sim.throwAt + 0.5 && sim.t < 4.5)) sim.tick();
  for (const a of recv) {
    const S = snaps.get(a)!; if (S.length < 40) continue; tracks++;
    const tr: Array<[number, number] | null> = []; for (let i = 0; i < S.length; i += 2) tr.push([S[i].pos.x, S[i].pos.y]);
    for (const e of redirects(tr, 0.1)) { void e; }
    // locate the onsets again to replay them: the operator returns no index, so scan with the same call on suffixes
    let from = 0;
    for (;;) {
      const sub = tr.slice(from), found = redirects(sub, 0.1); if (!found.length) break;
      // onset index: re-derive by searching the first k whose measureAt matches the first found event's r6 and v3
      let k0 = -1; for (let k = 6; k + 16 < sub.length; k++) { const m = measureAt(sub, k, 0.1); if (m && Math.abs(m.r6 - found[0]!.r6) < 1e-9 && Math.abs(m.vmin - found[0]!.vmin) < 1e-9) { k0 = k; break; } }
      if (k0 < 0) break;
      const onset = (from + k0) * 2, stemH = deg(S[Math.max(0, onset - 4)].b.vel);
      const clone = { ...S[onset].b, pos: { ...S[onset].b.pos }, vel: { ...S[onset].b.vel }, support: S[onset].b.support ? { ...S[onset].b.support } : undefined };
      const turnedAlone: number[] = [], speedAlone: number[] = [], asked: number[] = [], heldReq: number[] = [];
      for (let j = 0; j < 20; j++) {
        const it = S[onset + j]?.it; if (!it || it.free) { break; }
        stepBody(clone, it, sim.dt);
        const tt = (j + 1) * sim.dt;
        for (const T of [0.3, 0.6, 1.0]) if (Math.abs(tt - T) < 1e-6) { turnedAlone.push(Math.abs(wrap(deg(clone.vel) - stemH))); speedAlone.push(Math.hypot(clone.vel.x, clone.vel.y)); asked.push(Math.abs(wrap(deg(it.vel) - stemH))); }
      }
      const inplay = S[onset + 6]?.b, i3 = S[onset + 6]?.b, i6 = S[onset + 12]?.b, i10 = S[onset + 20]?.b;
      if (turnedAlone.length === 3 && i3 && i6 && i10) {
        const tp = [i3, i6, i10].map((b: any) => Math.abs(wrap(deg(b.vel) - stemH))), sp = [i3, i6, i10].map((b: any) => Math.hypot(b.vel.x, b.vel.y));
        ['0.3', '0.6', '1.0'].forEach((T, i) => { push(`play${T}`, tp[i]!); push(`alone${T}`, turnedAlone[i]!); push(`ask${T}`, asked[i]!); push(`vplay${T}`, sp[i]!); push(`valone${T}`, speedAlone[i]!); });
        evs.push(1);
      }
      from += k0 + 16;
    }
  }
}
console.log(`${plays} staged plays, ${tracks} receiver tracks, ${evs.length} redirects replayed`);
for (const T of ['0.3', '0.6', '1.0']) console.log(`+${T} s: turned in play ${q(rows[`play${T}`]!).toFixed(0)} deg, alone under his intents ${q(rows[`alone${T}`]!).toFixed(0)} deg, his request ${q(rows[`ask${T}`]!).toFixed(0)} deg off the stem | speed in play ${q(rows[`vplay${T}`]!).toFixed(1)}, alone ${q(rows[`valone${T}`]!).toFixed(1)} yd/s`);
