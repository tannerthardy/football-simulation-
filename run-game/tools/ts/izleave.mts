/** IZ doubles with a backer: per combo the timeline join -> secure-ready -> backer gate passes -> release decision
 * -> physical leave (last tick climber centre within 1.3 yd of the DL) -> climb mark (>= 2 yd from DL, past him, > 0.5 yd
 * past LOS). Gate held between join and release, per tick (best member). args: seeds... (env SCH) */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const SCH = (process.env.SCH ?? 'insideZone').split(',');
let cur = new Map<any, Map<any, [string, number | undefined]>>();
(globalThis as any).__CMB = (obs: any, combo: any, why: string, d?: number) => {
  if (!cur.has(combo)) cur.set(combo, new Map()); cur.get(combo)!.set(obs, [why, d]);
};
const rank = (w: string) => w.startsWith('proposed') ? 0 : w === 'nofill' ? 1 : w === 'noroute' ? 2 : w === 'secure' ? 3 : w === 'surface' ? 4 : w === 'keeper' ? 5 : 6;
const R: Record<string, number[]> = {}; const push = (k: string, v: number) => (R[k] ??= []).push(v);
const T: Record<string, number> = {}; const add = (k: string, n = 1) => T[k] = (T[k] ?? 0) + n;
const med = (a: number[]) => { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : NaN; };
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme;
  if (!SCH.includes(sch) || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const dir = sim.attackDir('O');
  const st = new Map<any, any>();
  while (sim.phase === 'live' && sim.t < 4.5) {
    cur = new Map();
    sim.tick();
    for (const o of sim.offense) { const cb = o.behavior instanceof RunBlocker && o.behavior.plan.combination;
      if (cb && cb.backer && !st.has(cb)) st.set(cb, { join: null, ready: null, fill: null, rel: null, climber: null, leave: null, mark: null, gates: [] as string[], fillD: [] as number[], why: null }); }
    for (const [cb, s] of st) {
      if (s.mark !== null) continue;
      if (s.rel === null) {
        const ws0 = cur.get(cb);
        if (cb.released) {
          s.rel = sim.t; s.climber = cb.members.find((m: any) => m.behavior?.plan?.kind === 'climb') ?? null;
          const pr = ws0 && [...ws0.values()].find(w => w[0].startsWith('proposed')); s.why = pr ? pr[0] : 'other';
          if (s.climber) { const m = s.climber, t = cb.defender; s.d0 = Math.hypot(m.pos.x - t.pos.x, m.pos.y - t.pos.y); s.x0 = (m.pos.x - sim.los) * dir; s.p0 = { ...m.pos };
            s.dlx0 = (t.pos.x - sim.los) * dir; const k = cb.members.find((q: any) => q !== m); s.kd = k ? Math.hypot(k.pos.x - t.pos.x, k.pos.y - t.pos.y) : NaN;
            s.bd = Math.hypot(cb.backer.pos.x - m.pos.x, cb.backer.pos.y - m.pos.y); s.bx = (cb.backer.pos.x - sim.los) * dir; }
          continue;
        }
        const ws = ws0; if (!ws) continue;
        const best = [...ws.values()].sort((a, b) => rank(a[0]) - rank(b[0]))[0];
        if (best[0] !== 'unjoined' && s.join === null) s.join = sim.t;
        if (rank(best[0]) <= 2 && s.ready === null) s.ready = sim.t;
        if (rank(best[0]) <= 3 && s.surf === undefined) { s.surf = sim.t; s.di = Math.min(...cb.members.map((m: any) => m.mind.decisionInterval)); }
        if (rank(best[0]) <= 0 && s.fill === null) { s.fill = sim.t; s.why = best[0]; }
        if (best[0] === 'nofill' && best[1] !== undefined) s.fillD.push(best[1]);
        if (s.join !== null) s.gates.push(best[0].replace(/:.*/, ''));
      } else if (s.climber) {
        const m = s.climber, t = cb.defender;
        const dd = Math.hypot(m.pos.x - t.pos.x, m.pos.y - t.pos.y);
        if (dd < 1.3) s.leave = sim.t;
        if (s.s3 === undefined && sim.t - s.rel >= .3 - 1e-9) { s.s3 = Math.hypot(m.pos.x - s.p0.x, m.pos.y - s.p0.y) / (sim.t - s.rel); s.dd3 = dd; s.adv3 = (m.pos.x - sim.los) * dir - s.x0; s.kind3 = m.behavior?.plan?.kind; s.eng3 = m.engagement ? (m.engagement.defender === t ? 'reengaged DL' : 'engaged other') : 'free'; }
        if (dd >= 2 && (m.pos.x - sim.los) * dir > .5 && (m.pos.x - t.pos.x) * dir > 0) s.mark = sim.t;
      }
    }
  }
  for (const [cb, s] of st) {
    add('combos'); if (s.join === null) { add('never joined'); continue; }
    add('joined');
    if (s.rel === null) { add('no release'); }
    else { add('released'); push('release t', s.rel); push('join t', s.join); if (s.ready !== null) push('ready t', s.ready); add('release via ' + s.why);
      if (s.ready !== null) push('ready->release', s.rel - s.ready);
      push('join->release', s.rel - s.join);
      if (s.surf !== undefined) { push('join->first secure read', s.surf - s.join); push('first secure read->release', s.rel - s.surf); push('member decision interval (min)', s.di); add('released on first secure read? ' + (s.surf === s.rel)); }
      else add('released with no secure read recorded');
      if (s.d0 !== undefined) { push('at release: climber-DL', s.d0); push('at release: climber x', s.x0); push('at release: DL x', s.dlx0); push('at release: keeper-DL', s.kd); push('at release: climber-backer', s.bd); push('at release: backer x', s.bx); }
      if (s.s3 !== undefined) { push('first 0.3 s: speed', s.s3); push('first 0.3 s: climber-DL after', s.dd3); push('first 0.3 s: x gained', s.adv3); add('at +0.3 s plan ' + s.kind3 + ' / ' + s.eng3); }
      if (s.mark !== null) { add('reached mark'); push('mark t', s.mark); push('release->mark', s.mark - s.rel); push('release->leave', (s.leave ?? s.rel) - s.rel); }
      for (const g of s.gates) add('gate ticks (released combos): ' + g);
      if (s.fillD.length) push('backer dist while nofill (median per combo)', med(s.fillD));
    }
    if (s.rel === null) for (const g of s.gates) add('gate ticks (unreleased): ' + g);
  }
}
if (process.env.DUMP) console.log("JSON " + JSON.stringify({ R, T }));
for (const [k, v] of Object.entries(R).sort()) console.log(k.padEnd(48), 'n', String(v.length).padStart(4), 'median', med(v).toFixed(2), 'p25', med(v.filter(x => x <= med(v))).toFixed(2), 'p75', med(v.filter(x => x >= med(v))).toFixed(2));
for (const k of Object.keys(T).sort()) console.log(k.padEnd(48), T[k]);
