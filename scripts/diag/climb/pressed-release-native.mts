/**
 * Pressed-climber releases on native snaps (Run Game's #164 follow-up).
 *
 * Usage: tsx scripts/diag/climb/pressed-release-native.mts [repoRoot]
 * Reads out/matched-restage/seed{7,8}.json (saved setups from the
 * matched-restage overlay, evidence/counter-scorecard 0e680e2d) and replays
 * every non-pass snap. At each block_climb release it records the mean centre
 * distance to the released DL over the last 0.3 s (pressed < 0.9 yd, Run
 * Game's doublerelg definition), then for 0.6 s: behaviour request vs final
 * intent vs achieved velocity, hand joints, engagement, torso contact impulse
 * by partner, and the DL's own leg request (toward the climber, his engaged
 * blocker, the carrier). Rows go to out/pressed-rows.json.
 */
import { readFileSync } from 'node:fs';
const W = process.argv[2] ?? process.cwd(), SCH = new Set((process.argv[3] ?? 'power,counter,insideZone,outsideZone,iz,oz,zone').split(','));
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const deg = (x: number, y: number) => Math.atan2(y, x) * 57.2958;
const adiff = (a: number, b: number) => { let d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return Math.abs(d); };
const rows: any[] = []; const dump: any[] = []; const schemes = new Map<string, number>();
for (const seed of [7, 8]) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}.json`, 'utf8'));
  snaps.forEach((p: any, idx: number) => {
    if (p.pass) return; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    const scheme = String(st.offCall?.run?.scheme); schemes.set(scheme, (schemes.get(scheme) ?? 0) + 1);
    const sim: any = new PlaySim(st);
    const req = new Map<any, any>();
    for (const a of sim.offense) if (a.behavior instanceof RunBlocker) { const b: any = a.behavior, up = b.update.bind(b); b.update = (ag: any, s: any) => { const c = up(ag, s); req.set(ag, c); return c; }; }
    const hist = new Map<string, number[]>(); // OL-DL centre distance history, one per tick
    const open: any[] = [];
    const ev0 = sim.event.bind(sim);
    sim.event = (type: string, a: any, b: any, note?: string) => { ev0(type, a, b, note);
      if (type === 'block_climb' && a && note) { const m = /(?:secured|check) (\S+); (\S+) stays/.exec(note);
        const dl = m && sim.defense.find((d: any) => d.slot === m[1]);
        if (dl) { const h = hist.get(`${a.slot}:${dl.slot}`) ?? []; const k = Math.max(1, Math.round(0.3 / sim.dt));
          const last = h.slice(-k), pd = last.reduce((s, v) => s + v, 0) / Math.max(1, last.length);
          open.push({ a, dl, t0: sim.t, pre: { ...a.vel }, pd, rsum: a.profile.radius + dl.profile.radius, ticks: [] as any[], off15: null as number | null, scheme, seed, idx }); } } };
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      for (const o of sim.offense) for (const d of sim.defense) if (/^(DE|DT|NT)/.test(d.slot)) {
        const key = `${o.slot}:${d.slot}`; const h = hist.get(key) ?? []; h.push(Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y)); if (h.length > 30) h.shift(); hist.set(key, h); }
      for (const r of open) { if (r.done) continue; const dt = sim.t - r.t0; if (dt > 0.6 + 1e-9) { r.done = true; continue; }
        const a = r.a, c = req.get(a), dl = r.dl, d = Math.hypot(a.pos.x - dl.pos.x, a.pos.y - dl.pos.y);
        const joint = sim.world.joints.some((j: any) => (j.a === a.body && j.b === dl.body) || (j.b === a.body && j.a === dl.body));
        if (r.off15 === null && d >= 1.5) r.off15 = dt;
        const ux = (dl.pos.x - a.pos.x) / (d || 1), uy = (dl.pos.y - a.pos.y) / (d || 1);
        const rin = c?.vel ? (c.vel.x * ux + c.vel.y * uy) / (Math.hypot(c.vel.x, c.vel.y) || 1) : NaN;
        const ain = (a.vel.x * ux + a.vel.y * uy);
        const fi = sim.intents[a.idx], fv = fi?.vel ?? { x: NaN, y: NaN };
        const fin = (fv.x * ux + fv.y * uy) / (Math.hypot(fv.x, fv.y) || 1);
        const imp = (sim.lastStep?.contacts ?? []).filter((k: any) => (k.i === a.idx && k.j === dl.idx) || (k.j === a.idx && k.i === dl.idx)).reduce((s2: number, k: any) => s2 + k.impulse, 0);
        const anyImp = (sim.lastStep?.contacts ?? []).filter((k: any) => k.i === a.idx || k.j === a.idx).reduce((s2: number, k: any) => s2 + k.impulse, 0);
        const partners: Record<string, number> = {};
        for (const k of sim.lastStep?.contacts ?? []) if (k.i === a.idx || k.j === a.idx) { const o = sim.agents[k.i === a.idx ? k.j : k.i]; const key = o === dl ? 'DL' : o.team === a.team ? 'mate' : 'opp'; partners[key] = (partners[key] ?? 0) + k.impulse; }
        const preIn = r.ticks.length ? null : (r.pre.x * ux + r.pre.y * uy);
        const dlIn = -(dl.vel.x * ux + dl.vel.y * uy); // DL closing toward climber (+)
        const fs = Math.hypot(fv.x, fv.y), along = c?.vel ? (a.vel.x * c.vel.x + a.vel.y * c.vel.y) / (Math.hypot(c.vel.x, c.vel.y) || 1) : NaN;
        const di = sim.intents[dl.idx], dv = di?.vel ?? { x: 0, y: 0 };
        const dlReqIn = -(dv.x * ux + dv.y * uy); const dlEngWith = dl.engagement ? (dl.engagement.blocker?.slot ?? dl.engagement.offender?.slot ?? Object.keys(dl.engagement).join('/')) : '-';
        const face = Math.cos(a.facing) * ux + Math.sin(a.facing) * uy;
        const eb = dl.engagement?.blocker; const ex = eb ? eb.pos.x - dl.pos.x : 0, ey = eb ? eb.pos.y - dl.pos.y : 0, ed = Math.hypot(ex, ey) || 1, dvs = Math.hypot(dv.x, dv.y) || 1;
        const dlToEb = eb ? (dv.x * ex + dv.y * ey) / ed / dvs : NaN, dlToC = -(dv.x * ux + dv.y * uy) / dvs;
        const cr = sim.carrier; const cx = cr ? cr.pos.x - dl.pos.x : 0, cy = cr ? cr.pos.y - dl.pos.y : 0; const dlToBall = cr ? (dv.x * cx + dv.y * cy) / (Math.hypot(cx, cy) || 1) / dvs : NaN;
        const dlBeh = dl.behavior?.kind ?? dl.behavior?.constructor?.name;
        r.ticks.push({ dlToEb, dlToC, dlToBall, dlBeh, dlReqIn, dlReqS: Math.hypot(dv.x, dv.y), dlPush: di?.push ?? 0, dlEngWith, face, partners, preIn, fin, fs, imp, anyImp, dlIn, along, fpush: fi?.push ?? 0, rin, ain, rs: c?.vel ? Math.hypot(c.vel.x, c.vel.y) : NaN, rh: c?.vel ? deg(c.vel.x, c.vel.y) : NaN, gs: Math.hypot(a.vel.x, a.vel.y), gh: deg(a.vel.x, a.vel.y),
          d, ov: r.rsum - d, joint, eng: a.engagement ? (a.engagement.defender === dl ? 'DL' : 'other') : '-', dlEng: dl.engagement ? 'yes' : 'no' }); } };
    try { sim.run(); } catch { return; }
    for (const r of open) if (r.ticks.length) rows.push(r);
  });
}
import('node:fs').then(fs=>fs.writeFileSync(`${W}/out/pressed-rows.json`, JSON.stringify(rows.map((r:any)=>({seed:r.seed,idx:r.idx,scheme:r.scheme,a:r.a.slot,dl:r.dl.slot,t0:r.t0,pd:r.pd,rsum:r.rsum,ticks:r.ticks})))));
console.log('run schemes in captures', JSON.stringify([...schemes]));
const med = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : NaN; };
const pct = (f: (r: any) => boolean, rs: any[]) => (rs.filter(f).length / Math.max(1, rs.length) * 100).toFixed(0) + '%';
const f2 = (x: number) => Number.isFinite(x) ? x.toFixed(2) : '-';
for (const [lab, g] of [['ALL', rows], ['PRESSED (pd<0.9)', rows.filter(r => r.pd < .9)], ['CLEAR', rows.filter(r => r.pd >= .9)]] as const) {
  const m = (h: (t: any) => number, k = 6) => med(g.map((r: any) => med(r.ticks.slice(0, k).map(h))));
  console.log(`\n${lab}: n ${g.length}  by scheme ${JSON.stringify(Object.fromEntries([...new Set(g.map((r: any) => r.scheme))].map(s => [s, g.filter((r: any) => r.scheme === s).length])))}`);
  console.log(`  pre-release mean dist ${f2(med(g.map((r: any) => r.pd)))} | radius sum ${f2(med(g.map((r: any) => r.rsum)))} | overlap at release ${f2(med(g.map((r: any) => r.ticks[0].ov)))} (>0 = bodies compressed)`);
  console.log(`  req speed 0-0.3s ${f2(m(t => t.rs))} got ${f2(m(t => t.gs))} | first 0.1s req ${f2(m(t => t.rs, 2))} got ${f2(m(t => t.gs, 2))} | pre-release speed ${f2(med(g.map((r: any) => Math.hypot(r.pre.x, r.pre.y))))}`);
  console.log(`  request into DL (cos) first tick ${f2(med(g.map((r: any) => r.ticks[0].rin)))} | share request into DL (>0.2) ${pct((r: any) => r.ticks[0].rin > .2, g)} | share request away (<-0.2) ${pct((r: any) => r.ticks[0].rin < -.2, g)}`);
  console.log(`  achieved velocity toward DL first 0.2s ${f2(m(t => t.ain, 4))} yd/s | heading err achieved vs request 0-0.3s ${f2(m(t => adiff(t.gh, t.rh)))} deg`);
  console.log(`  joint with DL: release ${pct((r: any) => r.ticks[0].joint, g)} 0.2s ${pct((r: any) => r.ticks[3]?.joint, g)} | overlap>0 at 0.2s ${pct((r: any) => (r.ticks[3]?.ov ?? -1) > 0, g)} 0.4s ${pct((r: any) => (r.ticks[7]?.ov ?? -1) > 0, g)} | climber still engaged w/ DL 0.2s ${pct((r: any) => r.ticks[3]?.eng === 'DL', g)}`);
  console.log(`  FINAL intent speed 0-0.3s ${f2(m(t => t.fs))} (behavior ${f2(m(t => t.rs))}) | final intent into DL cos first tick ${f2(med(g.map((r: any) => r.ticks[0].fin)))} | final push first tick ${f2(med(g.map((r: any) => r.ticks[0].fpush)))}`);
  console.log(`  achieved along behavior request 0-0.3s ${f2(m(t => t.along))} | DL closing on climber 0-0.2s ${f2(m(t => t.dlIn, 4))} yd/s | climber-DL normal impulse/tick 0-0.3s ${f2(m(t => t.imp))} (all contacts ${f2(m(t => t.anyImp))}) | share with DL impulse>0 at 0.2s ${pct((r: any) => r.ticks[3]?.imp > 0, g)}`);
  console.log(`  1.5 yd off DL within 0.6s ${pct((r: any) => r.off15 !== null, g)} median ${f2(med(g.map((r: any) => r.off15 ?? NaN)))} s | dist 0.3s ${f2(med(g.map((r: any) => r.ticks[5]?.d)))}`);
}
