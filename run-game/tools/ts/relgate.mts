/** Double-team release gates: for each combo with a backer, per read tick, the gate that stopped each member's
 * release read, until release or until the carrier reaches the backer's depth (carrier x >= backer x - 1).
 * args: seeds... (env SCH=comma list of schemes) */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const SCH = (process.env.SCH ?? 'insideZone').split(',');
const tally: Record<string, number> = {}; const add = (k: string, n = 1) => tally[k] = (tally[k] ?? 0) + n;
let cur: Map<any, Map<any, string>> = new Map();
(globalThis as any).__CMB = (obs: any, combo: any, why: string, d?: number) => {
  if (!cur.has(combo)) cur.set(combo, new Map());
  cur.get(combo)!.set(obs, why + (d !== undefined ? `@${d < 5 ? '<5' : d < 7 ? '5-7' : '7+'}` : ''));
};
const rank = (w: string) => w.startsWith('proposed') ? 0 : w.startsWith('nofill') ? 1 : w.startsWith('noroute') ? 2 : w.startsWith('secure') ? 3 : w.startsWith('surface') ? 4 : w.startsWith('keeper') ? 5 : 6;
for (const seed of process.argv.slice(2)) for (const [pi, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme;
  if (!SCH.includes(sch) || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const dir = sim.attackDir('O');
  const st = new Map<any, any>();
  while (sim.phase === 'live' && sim.t < 5) {
    cur = new Map();
    sim.tick();
    const c = sim.carrier;
    for (const o of sim.offense) { const cb = o.behavior instanceof RunBlocker && o.behavior.plan.combination; if (cb && cb.backer && !st.has(cb)) st.set(cb, { t0: sim.t, hist: [] as string[], rel: null as number | null, arr: null as number | null, join: null as number | null }); }
    for (const [cb, s] of st) {
      if (s.rel !== null || s.arr !== null) continue;
      if (cb.released) { s.rel = sim.t; continue; }
      if (c && c !== sim.qb && (c.pos.x - cb.backer.pos.x) * dir >= -1) { s.arr = sim.t; continue; }
      const ws = cur.get(cb); if (!ws) continue;
      const best = [...ws.values()].sort((a, b) => rank(a) - rank(b))[0];
      if (!best.startsWith('unjoined') && s.join === null) s.join = sim.t;
      if (best.startsWith('unjoined')) {
        const e = cb.defender.engagement;
        const role = (m: any) => { const me = m.engagement; if (me && me === e) return me.blocker === m ? 'B' : 'H';
          if (me) return 'other'; const d = Math.hypot(m.pos.x - cb.defender.pos.x, m.pos.y - cb.defender.pos.y) - m.profile.radius - cb.defender.profile.radius;
          const pl = m.behavior?.plan; if (pl?.combination !== cb || pl?.target !== cb.defender) return 'replanned:' + pl?.kind;
          return d < .15 ? 'free-touch' : d < .6 ? 'free<.6' : 'free>.6'; };
        const tb = sim.t < .5 ? '<0.5' : sim.t < 1 ? '0.5-1' : sim.t < 1.5 ? '1-1.5' : '1.5+';
        add(sch + ` UNJOINED ${tb} ` + cb.members.map(role).sort().join('/') + (e && !cb.members.includes(e.blocker) ? ' (DL engaged by other)' : ''));
      }
      s.hist.push(best);
    }
  }
  for (const [cb, s] of st) {
    const k = `${sch}`;
    add(k + ' combos');
    { const h = s.hist; const n = h.length || 1; for (const w of h) add(k + ' ALL gate ticks: ' + w.replace(/@.*/, '').replace(/^keeper:.*/, 'keeper'), 1); add(k + ' ALL ticks', n); }
    add(k + ` join at ${s.join === null ? 'never' : s.join < .5 ? '<0.5' : s.join < .8 ? '0.5-0.8' : s.join < 1.1 ? '0.8-1.1' : s.join < 1.4 ? '1.1-1.4' : '1.4+'}`);
    if (s.rel !== null) { add(k + ' released'); add(k + ` released at ${s.rel < .8 ? '<0.8' : s.rel < 1.2 ? '0.8-1.2' : s.rel < 1.6 ? '1.2-1.6' : '1.6+'}`); continue; }
    if (s.arr === null) { add(k + ' neither (play ended)'); continue; }
    add(k + ' carrier arrived first');
    add(k + ` arrived first, joined ${s.join === null ? 'never' : s.join < .5 ? '<0.5' : s.join < 1 ? '0.5-1' : '1+'}`);
    const h = s.hist; const n = h.length || 1;
    const share: Record<string, number> = {};
    for (const w of h) share[w.replace(/@.*/, '')] = (share[w.replace(/@.*/, '')] ?? 0) + 1 / n;
    for (const [w, v] of Object.entries(share)) add(k + ' arrived-first gate time: ' + w, v);
    const last = h.slice(-5); add(k + ' arrived-first last gate: ' + (last[last.length - 1] ?? 'no reads'));
    if ((tally[k + ' printed'] ?? 0) < 12) { add(k + ' printed'); console.log(`s${seed}#${pi} ${sch} ${cb.members.map((m: any) => m.slot).join('+')} on ${cb.defender.slot} -> ${cb.backer.slot} arr ${s.arr?.toFixed(2)} join ${s.join?.toFixed(2)} | ${[...new Set(h)].join(' ')} | last ${last.join(',')}`); }
  }
}
for (const k of Object.keys(tally).sort()) console.log(k.padEnd(60), +tally[k].toFixed(2));
