/** Where the back's speed goes around the exchange (observation only, sim
 * internals). Per tick from 0.4 s before the handoff to 1.0 s after it, the
 * back's speed at each layer: the behavior's request, the request after the
 * contact controllers (engagements, bond), after teammate spacing, and the
 * achieved body speed after the World step. Ticks where spacing removes 10%+
 * of the request are attributed to the nearest teammate within 4 yd in front
 * of the request (by slot). Also the share of ticks where the back's request
 * is the designed press's fixed lead pace, with the lead's speed along it.
 * Same for the QB from the handoff (his carry-out). By concept and window.
 * node --import tsx scripts/diag/stretch/layers.ts [--formations ace_12,i_pro_21] [--concepts power,counter] [--seeds 77,71001] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1].toFixed(2) : '-'; };
type V = { x: number; y: number };
const sp = (v: V | undefined) => (v ? Math.hypot(v.x, v.y) : 0);
// Windows relative to the handoff (s).
const WINDOWS: [string, number, number][] = [['-0.4..0', -.4, 0], ['0..0.25', 0, .25], ['0.25..0.5', .25, .5], ['0.5..1.0', .5, 1.0]];
type Cell = { cmd: number[]; contact: number[]; spaced: number[]; vel: number[]; spaceCut: number; contactCut: number; n: number; who: Record<string, number>; paced: number; lead: number[] };
const cell = (): Cell => ({ cmd: [], contact: [], spaced: [], vel: [], spaceCut: 0, contactCut: 0, n: 0, who: {}, paced: 0, lead: [] });
const table = new Map<string, Cell>();
const get = (k: string) => { let c = table.get(k); if (!c) table.set(k, c = cell()); return c; };
const Rs = rosters();
for (const formation of list('--formations', 'ace_12,i_pro_21')) for (const concept of list('--concepts', 'power,counter'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,71001').map(Number)) {
      const sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs);
      const s = sim as unknown as { cmds: { vel: V }[]; intents: { vel: V }[] };
      const back = sim.offense.find(o => o.slot === 'RB' && o.behavior.kind !== 'block') ?? sim.offense.find(o => o.slot === 'RB')!;
      // Capture each watched body's request as spacing receives it.
      const watched = new Set([back.idx, sim.qb.idx]);
      const preSpacing = new Map<number, V>();
      s.intents = new Proxy(s.intents, { set(target, prop, value) {
        const i = Number(prop);
        if (watched.has(i) && (new Error().stack ?? '').includes('spaceTeammates')) preSpacing.set(i, target[i]?.vel ?? { x: 0, y: 0 });
        (target as unknown as Record<string | symbol, unknown>)[prop] = value; return true;
      } });
      const ticks: { t: number; who: number; cmd: V; contact: V; spaced: V; vel: V; mate: string; paced: boolean; lead: number | null }[] = [];
      // The designed press paces a lead blocker at a fixed share of top speed.
      const pacedSpeed = back.profile.vmax * (0.28 + 0.12 * (1 - back.r('patience')));
      let handoff = -1;
      while (sim.phase === 'live' && sim.t < 8) {
        preSpacing.clear();
        const t = sim.t;
        sim.tick();
        if (handoff < 0 && sim.carrier && sim.carrier !== sim.qb && sim.carrier.team === 'O') handoff = t;
        for (const i of watched) {
          const a = sim.agents[i], cmd = s.cmds[i].vel, spaced = s.intents[i].vel;
          // Nearest teammate within 4 yd in front of the request.
          const ahead = sim.offense.filter(o => o !== a && Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y) < 4
            && (o.pos.x - a.pos.x) * cmd.x + (o.pos.y - a.pos.y) * cmd.y > 0)
            .sort((p, q) => Math.hypot(p.pos.x - a.pos.x, p.pos.y - a.pos.y) - Math.hypot(q.pos.x - a.pos.x, q.pos.y - a.pos.y));
          const paced = i === back.idx && Math.abs(sp(cmd) - pacedSpeed) < 1e-6;
          // The lead's speed along the back's request when pacing.
          const follow = paced ? ((a.behavior as unknown as { opts?: { follow?: typeof sim.offense } }).opts?.follow ?? []) : [];
          const h = sp(cmd) > 1e-6 ? { x: cmd.x / sp(cmd), y: cmd.y / sp(cmd) } : { x: 1, y: 0 };
          const lead = follow.filter(b => !b.engagement).sort((p, q) => Math.hypot(p.pos.x - a.pos.x, p.pos.y - a.pos.y) - Math.hypot(q.pos.x - a.pos.x, q.pos.y - a.pos.y))[0];
          ticks.push({ t, who: i, cmd: { ...cmd }, contact: { ...(preSpacing.get(i) ?? spaced) }, spaced: { ...spaced }, vel: { ...a.vel }, mate: ahead[0]?.slot ?? '-',
            paced, lead: lead ? lead.vel.x * h.x + lead.vel.y * h.y : null });
        }
        if (handoff >= 0 && sim.t - handoff > 1.0 + 1e-9) break;
      }
      if (handoff < 0) continue;
      for (const k of ticks) {
        const rel = k.t - handoff, w = WINDOWS.find(([, a, b]) => rel >= a - 1e-9 && rel < b - 1e-9);
        if (!w || (k.who === sim.qb.idx && rel < 0)) continue;
        const c = get(`${concept} ${k.who === sim.qb.idx ? 'QB' : 'RB'} ${w[0]}`);
        const cs = sp(k.cmd), ks = sp(k.contact), ss = sp(k.spaced);
        c.cmd.push(cs); c.contact.push(ks); c.spaced.push(ss); c.vel.push(sp(k.vel)); c.n++;
        if (ks < .9 * cs) c.contactCut++;
        if (k.paced) { c.paced++; if (k.lead !== null) c.lead.push(k.lead); }
        if (ss < .9 * ks && ks > 1) { c.spaceCut++; c.who[k.mate] = (c.who[k.mate] ?? 0) + 1; }
      }
    }
console.log('median speed yd/s: request -> after contact -> after spacing -> achieved | ticks with 10%+ cut by contact / spacing (nearest teammate) | pacing a lead (his speed along the request)');
for (const [k, c] of [...table].sort()) {
  const who = Object.entries(c.who).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s, n]) => `${s} ${n}`).join(', ');
  console.log(`${k.padEnd(22)} ${med(c.cmd)} -> ${med(c.contact)} -> ${med(c.spaced)} -> ${med(c.vel)} | n ${c.n} contact ${(100 * c.contactCut / c.n).toFixed(0)}% spacing ${(100 * c.spaceCut / c.n).toFixed(0)}% (${who}) | paced ${(100 * c.paced / c.n).toFixed(0)}% lead ${med(c.lead)}`);
}
