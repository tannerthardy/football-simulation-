// Lateral slide toward the throw by technique (Coverage, 2026-11-18). Staged zone set. Underneath zone defenders within
// 8 yd of the true catchable track at the release. At -0.6 s and at the release: lateral velocity toward the catch
// point's side, his technique (CoverageDefender job prefix, or ZoneCoverage + style), tags; whether the target is the
// eligible receiver nearest him at the release. usage: node --import tsx out/slide-tech.mts seeds [dump.json]
const W = process.cwd(), seeds = Number(process.argv[2] ?? 1), DUMP = process.argv[3];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { isDeepZone } = await import(`${W}/src/playbook/alignment.ts`);
const rows: any[] = [];
const tech = (d: any) => { const b = d.behavior; if (!b) return '-'; if (b.constructor?.name === 'CoverageDefender') return (b.job || 'zone').split(':')[0] + (b.job?.startsWith('zone') ? '' : ''); return `${b.constructor?.name === 'ZoneCoverage' ? 'zone' : b.kind}:${b.style ?? sim0Style}`; };
let sim0Style = '?';
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6', 'cover3_mable', 'cover9', 'cover1_robber'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        sim0Style = sim.defCall?.zoneStyle ?? '?';
        const hist = new Map<any, any[]>(); let rel: number | null = null;
        const tick = sim.tick.bind(sim);
        sim.tick = () => { const t = sim.t; tick(); if (rel === null && sim.ball?.kind === 'air') rel = t; if (rel !== null && t > rel + 1e-9) return;
          for (const d of sim.defense) { const z = d.behavior?.zone ?? d.behavior?.recordedZone?.(); if (!z || isDeepZone(z)) continue;
            (hist.get(d) ?? hist.set(d, []).get(d)!).push({ t, pos: { ...d.pos }, vel: { ...d.vel }, tech: tech(d), zone: z, tags: [...d.tags] }); } };
        try { sim.run(); } catch { continue; }
        if (rel === null || !sim.ballPath?.length) continue;
        const end = sim.ballPath[sim.ballPath.length - 1], T = sim.ball?.target ?? null;
        const elig = sim.offense.filter((o: any) => o !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot));
        for (const [d, H] of hist) {
          const at = (k: number) => H.find((h) => Math.abs(h.t - (rel! + k)) < 1e-6);
          const r0 = at(0), m6 = at(-0.6); if (!r0 || !m6) continue;
          const track = sim.ballPath.filter((p: any) => p.z <= d.profile.maxCatchHeight);
          if (!track.length || Math.min(...track.map((p: any) => Math.hypot(p.x - r0.pos.x, p.y - r0.pos.y))) > 8) continue;
          const lat = (h: any) => h.vel.y * (end.y >= h.pos.y ? 1 : -1);
          // His area: the target is the eligible receiver nearest him at the release (positions at the end of the run are
          // not his; use the recorded positions at the release via the target's history is not kept, so use distance now
          // to the catch point as the proxy only if no target).
          rows.push({ key: `${concept}/${coverage}/${formation}/${seed}/${flip}`, slot: d.slot, zone: r0.zone, tech6: m6.tech, tech0: r0.tech, tags6: m6.tags, tags0: r0.tags, lat6: lat(m6), lat0: lat(r0), down0: r0.vel.x * sim.attackDir(sim.offense[0].team), target: T?.slot ?? null, style: sim0Style });
        }
      }
const q = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(2)).join('/') : '-'; };
const by = new Map<string, any[]>(); for (const r of rows) (by.get(r.tech0) ?? by.set(r.tech0, []).get(r.tech0)!).push(r);
console.log(`underneath men ${rows.length}; lateral toward the catch side p25/50/75 yd/s at -0.6 s and the release; share sliding < 0.5 at the release`);
for (const [k, R] of [...by].sort((a, b) => b[1].length - a[1].length)) console.log(`  ${k.padEnd(18)} n ${String(R.length).padStart(4)} | -0.6 ${q(R.map(r => r.lat6))} | release ${q(R.map(r => r.lat0))} | <0.5 ${(100 * R.filter(r => r.lat0 < 0.5).length / R.length).toFixed(0)}%`);
const byz = new Map<string, any[]>(); for (const r of rows) (byz.get(r.zone) ?? byz.set(r.zone, []).get(r.zone)!).push(r);
console.log('by zone:'); for (const [k, R] of [...byz].sort((a, b) => b[1].length - a[1].length)) console.log(`  ${k.padEnd(18)} n ${String(R.length).padStart(4)} | -0.6 ${q(R.map(r => r.lat6))} | release ${q(R.map(r => r.lat0))}`);
if (DUMP) (await import('node:fs')).writeFileSync(DUMP, JSON.stringify(rows));
