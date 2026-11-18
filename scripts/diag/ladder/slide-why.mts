// Why he does not slide (Coverage, 2026-11-18). Staged zone set; underneath zone men within 8 yd of the true track whose
// eventual target is the eligible receiver nearest him at the release ("his area") and whose lateral velocity toward the
// catch side at the release is under 0.5 yd/s. Over -0.6 s .. release, per tick: his command's technique label, the
// receiver he has picked (ZoneCoverage target / CoverageDefender job), settled, pinned at his radius, tags.
const W = process.cwd(), seeds = Number(process.argv[2] ?? 1), NEX = Number(process.argv[3] ?? 0);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { isDeepZone } = await import(`${W}/src/playbook/alignment.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const out: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6', 'cover3_mable', 'cover9', 'cover1_robber'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const log = new Map<any, any[]>(); let rel: number | null = null; let TT: any = null; let offAt: any[] = [];
        const tb = sim.throwBall.bind(sim); sim.throwBall = (p: any, target: any, ...r: any[]) => { if (p === sim.qb && !TT && target) TT = target; return tb(p, target, ...r); };
        const dec = sim.decide.bind(sim);
        sim.decide = (i: number, t: number) => {
          const a = sim.agents[i]; const z = a.behavior?.zone ?? a.behavior?.recordedZone?.();
          if (a.team !== 'D' || !z || isDeepZone(z) || rel !== null) return dec(i, t);
          dec(i, t);
          const b = a.behavior, inner = b.constructor?.name === 'CoverageDefender' ? (b.inner ?? b.zoneBehavior ?? null) : b;
          const lab = facingTechnique(sim.cmds[i] ?? {})?.label ?? '-';
          const zb = b.constructor?.name === 'ZoneCoverage' ? b : null;
          const lm = zb?.landmark, pinned = lm ? Math.hypot(a.pos.x - lm.x, a.pos.y - lm.y) >= (zb.radius - 0.5) : null;
          (log.get(a) ?? log.set(a, []).get(a)!).push({ t, lab, kind: b.constructor?.name, job: b.job ?? null, picked: zb?.target?.slot ?? (b.target?.slot ?? null), settled: zb ? zb.settledAt >= 0 : null, pinned, tags: [...a.tags], vel: { ...a.vel }, pos: { ...a.pos }, lm: lm ? { ...lm } : null, off: Object.fromEntries(sim.offense.map((o: any) => [o.slot, { x: o.pos.x, y: o.pos.y, vx: o.vel.x, vy: o.vel.y }])), eyes: sim.qbEyes?.slot ?? null });
        };
        const tick = sim.tick.bind(sim);
        sim.tick = () => { const t = sim.t; tick(); if (rel === null && sim.ball?.kind === 'air') { rel = t; offAt = sim.offense.filter((o: any) => o !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot)).map((o: any) => ({ slot: o.slot, pos: { ...o.pos } })); } };
        try { sim.run(); } catch { continue; }
        if (rel === null || !sim.ballPath?.length) continue;
        const end = sim.ballPath[sim.ballPath.length - 1], T = TT;
        const tgt = T?.slot ?? null;
        for (const [d, L] of log) {
          const r0 = L[L.length - 1]; if (!r0 || Math.abs(r0.t - (rel - sim.dt)) > 1e-6 && Math.abs(r0.t - rel) > 1e-6) continue;
          const track = sim.ballPath.filter((p: any) => p.z <= d.profile.maxCatchHeight);
          if (!track.length || Math.min(...track.map((p: any) => Math.hypot(p.x - r0.pos.x, p.y - r0.pos.y))) > 8) continue;
          const lat = r0.vel.y * (end.y >= r0.pos.y ? 1 : -1);
          const win = L.filter((s) => s.t >= rel! - 0.6 - 1e-6);
          const nearest = offAt.reduce((m: any, o: any) => (!m || Math.hypot(o.pos.x - r0.pos.x, o.pos.y - r0.pos.y) < Math.hypot(m.pos.x - r0.pos.x, m.pos.y - r0.pos.y) ? o : m), null);
          if (!tgt || nearest?.slot !== tgt) continue;
          out.push({ key: `${concept}/${coverage}/${formation}/${seed}/${flip}`, slot: d.slot, zone: d.behavior?.zone ?? d.behavior?.recordedZone?.(), tgt, lat, win });
        }
      }
// "His area": the picked receiver or the eventual target is the one he is reading; we use the target being the receiver he
// picked at any tick in the window, or, failing that, report all.
const slow = out.filter((r) => r.lat < 0.5);
const cls = (r: any) => {
  const w = r.win, last = w[w.length - 1];
  const share = (f: (s: any) => boolean) => w.filter(f).length / w.length;
  if (last.kind === 'CoverageDefender' && last.job && !last.job.startsWith('zone')) return `rule job ${last.job.split(':')[0]}`;
  if (share((s) => /landmark|settle/.test(s.lab)) >= 0.5) return 'no receiver picked (landmark/settle: QB lean only)';
  if (share((s) => s.picked && s.picked !== r.tgt) >= 0.5) return 'picked another receiver';
  if (share((s) => /stem-read|lane-hold/.test(s.lab)) >= 0.5) return 'picked target, held (stem-read / flat hold)';
  if (share((s) => s.pinned) >= 0.5) return 'picked target, pinned at his radius';
  if (share((s) => /carry/.test(s.lab)) >= 0.5) return 'carrying (lane-carry / open-carry)';
  return `picked target, lane (${last.lab})`;
};
const c = new Map<string, number>(); for (const r of slow) c.set(cls(r), (c.get(cls(r)) ?? 0) + 1);
console.log(`underneath men whose area holds the target ${out.length}, sliding < 0.5 yd/s toward the catch side at the release ${slow.length}`);
for (const [k, v] of [...c].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v} (${(100 * v / slow.length).toFixed(0)}%)`);
const tg = new Map<string, number>(); for (const r of slow) for (const t of new Set<string>(r.win.flatMap((s: any) => s.tags))) tg.set(t, (tg.get(t) ?? 0) + 1);
console.log('  tags seen in the window: ' + [...tg].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${k} ${v}`).join(', '));
const labs = new Map<string, number>(); for (const r of slow) { const l = r.win[r.win.length - 1].lab; labs.set(l, (labs.get(l) ?? 0) + 1); }
console.log('  label at the release: ' + [...labs].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', '));
for (const r of slow.slice(0, NEX)) console.log(`   ${r.key} ${r.slot} ${r.zone} target ${r.tgt} lat ${r.lat.toFixed(2)} | ${cls(r)} | ${r.win.filter((_: any, i: number) => i % 3 === 0).map((s: any) => `${s.lab}/${s.picked ?? s.job ?? '-'}${s.settled ? '/set' : ''}${s.pinned ? '/pin' : ''}`).join(' ')}`);

// The pick on 'picked another receiver': score = distance of (pos + 0.7 vel) to his landmark (lower wins), the QB's
// eyes take 3 x anticipation off, the held pick ZONE_HOLD_PICK_BEAT (1.5 x scale). Arriving = the receiver's distance
// to the landmark falling.
const pk = slow.filter((r) => cls(r) === 'picked another receiver');
let arrT = 0, depP = 0, held = 0, eyesP = 0;
for (const r of pk.slice(0, 200)) {
  const s0 = r.win[r.win.length - 1]; if (!s0.lm) continue;
  const sc = (o: any) => Math.hypot(o.x + o.vx * 0.7 - s0.lm.x, o.y + o.vy * 0.7 - s0.lm.y);
  const rate = (o: any) => ((o.x - s0.lm.x) * o.vx + (o.y - s0.lm.y) * o.vy) / Math.max(0.1, Math.hypot(o.x - s0.lm.x, o.y - s0.lm.y));
  const T = s0.off[r.tgt], P = s0.off[s0.picked]; if (!T || !P) continue;
  const heldLong = r.win.filter((w: any) => w.picked === s0.picked).length / r.win.length;
  if (rate(T) < 0) arrT++; if (rate(P) > 0) depP++; if (heldLong > 0.8) held++; if (s0.eyes === s0.picked) eyesP++;
  if (pk.indexOf(r) < 8) console.log(`   ${r.key} ${r.slot} ${r.zone}: target ${r.tgt} score ${sc(T).toFixed(1)} (${rate(T) < 0 ? 'arriving' : 'leaving'} ${rate(T).toFixed(1)} yd/s) vs picked ${s0.picked} score ${sc(P).toFixed(1)} (${rate(P) < 0 ? 'arriving' : 'leaving'} ${rate(P).toFixed(1)}) | picked held ${(100 * heldLong).toFixed(0)}% of the window | QB eyes on ${s0.eyes}`);
}
console.log(`picked another (${pk.length}): target arriving ${arrT}, picked one leaving ${depP}, picked held >80% of the window ${held}, QB eyes on the picked one ${eyesP}`);
