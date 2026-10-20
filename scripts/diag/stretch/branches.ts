/** Which decision branch produced the jitter? Runs only in an instrumented
 * copy (scripts/diag/stretch/instrument.sh DIR), whose behavior returns are
 * tagged file.function@line by tagreturns.mjs; line numbers are the copy's
 * source lines before tagging.
 * At 10 Hz like tracking, request speed oscillations (0.5 yd/s swings) and
 * left/right reversals (5 deg per 0.1 s, faster than 2 yd/s), and the same
 * for the achieved velocity. Each event is attributed to the branch path
 * that produced the request: unchanged over the last 0.2 s (the steering
 * law oscillates within one branch) or switched (another rule replaced the
 * objective). Engaged players are one category (contact controllers).
 * Scribble windows: 1 s windows (step 0.5 s) whose net displacement is under
 * 60% of the path travelled, by branch composition (engaged share, switches).
 * node --import tsx scripts/diag/stretch/branches.ts [--formations ..] [--concepts ..] [--seeds ..] [--depth 3] [--top 8] [--examples 'D DL'] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const DEPTH = Number(arg('--depth', '3'));
type V = { x: number; y: number };
const GROUP: Record<string, string> = { QB: 'O QB', RB: 'O RB', F: 'O FB', Y: 'O TE', H: 'O TE', X: 'O WR', Z: 'O WR', LT: 'O OL', LG: 'O OL', C: 'O OL', RG: 'O OL', RT: 'O OL' };
const groupOf = (team: string, slot: string) => team === 'O' ? GROUP[slot] ?? 'O other'
  : slot.startsWith('DE') || slot.startsWith('DT') || slot === 'NT' ? 'D DL' : slot.startsWith('LB') ? 'D LB' : 'D DB';
let cur: string[] = [];
(globalThis as any).__tag = (l: string, v: unknown) => { if (v && typeof v === 'object' && 'vel' in (v as object)) cur.push(l); return v; };
const wrapped = Symbol('wrapped');
const sig = (tags: string[]) => {
  const out: string[] = [];
  for (const t of [...tags].reverse()) if (out[out.length - 1] !== t) out.push(t);
  return out.slice(0, DEPTH).join(' > ') || '(none)';
};
const pulseAt = (s: number[]) => {
  const at: number[] = []; let last = s[0], dir = 0;
  for (let k = 1; k < s.length; k++) {
    const x = s[k];
    if (dir >= 0 && x < last - .5) { if (dir > 0) at.push(k); dir = -1; last = x; }
    else if (dir <= 0 && x > last + .5) { if (dir < 0) at.push(k); dir = 1; last = x; }
    else if ((dir >= 0 && x > last) || (dir <= 0 && x < last)) last = x;
  }
  return at;
};
const wobbleAt = (v: V[]) => {
  const at: number[] = []; let sign = 0;
  for (let k = 1; k < v.length; k++) {
    const a = v[k - 1], b = v[k];
    if (Math.hypot(a.x, a.y) < 2 || Math.hypot(b.x, b.y) < 2) continue;
    const d = Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y) * 180 / Math.PI;
    const sg = d > 5 ? 1 : d < -5 ? -1 : 0;
    if (sg && sign && sg !== sign) at.push(k);
    if (sg) sign = sg;
  }
  return at;
};
type Row = { sec: number; ev: Record<string, Record<string, number>>; occ: Record<string, number> };
const rows = new Map<string, Row>();
const examples: string[] = [], examplesFor = arg('--examples', '');
const Rs = rosters();
const KINDS = ['request pulse', 'request wobble', 'achieved pulse', 'achieved wobble', 'scribble window'];
for (const formation of list('--formations', 'ace_12,i_pro_21')) for (const concept of list('--concepts', 'iz,oz,power,counter'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77').map(Number)) {
      let sim;
      try { sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs); } catch { continue; }
      const s = sim as unknown as { cmds: { vel: V }[] };
      const paths = sim.agents.map(() => [] as string[]);
      const S = sim.agents.map(() => [] as { req: V; vel: V; pos: V; sig: string }[]);
      let tick = 0;
      while (sim.phase === 'live' && sim.t < 3.5) {
        for (const a of sim.agents) {
          const b = a.behavior as unknown as Record<string | symbol, unknown>;
          if (!b[wrapped]) {
            const orig = (b.update as (...x: unknown[]) => unknown).bind(b);
            b.update = (...x: unknown[]) => { cur = []; const r = orig(...x); paths[a.idx] = cur; cur = []; return r; };
            b[wrapped] = true;
          }
        }
        const ready = sim.t >= Math.max(...sim.agents.map(a => a.snapReadyAt));
        sim.tick();
        if (!ready || tick++ % 2) continue;
        for (const a of sim.agents) {
          if (a === sim.carrier) { S[a.idx].push({ req: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, pos: { ...a.pos }, sig: 'CARRIER' }); continue; }
          S[a.idx].push({ req: { ...s.cmds[a.idx].vel }, vel: { ...a.vel }, pos: { ...a.pos }, sig: a.engagement ? 'ENGAGED' : sig(paths[a.idx]) });
        }
      }
      for (const a of sim.agents) {
        const ser = S[a.idx];
        if (ser.length < 8) continue;
        const key = groupOf(a.team, a.slot);
        const row = rows.get(key) ?? { sec: 0, ev: {}, occ: {} }; rows.set(key, row);
        for (const p of ser) if (p.sig !== 'CARRIER') { row.sec += .1; row.occ[p.sig] = (row.occ[p.sig] ?? 0) + .1; }
        const sp = (v: V) => Math.hypot(v.x, v.y);
        const events: [string, number[]][] = [['request pulse', pulseAt(ser.map(p => sp(p.req)))], ['request wobble', wobbleAt(ser.map(p => p.req))],
          ['achieved pulse', pulseAt(ser.map(p => sp(p.vel)))], ['achieved wobble', wobbleAt(ser.map(p => p.vel))]];
        for (const [kind, at] of events) for (const k of at) {
          if (ser[k].sig === 'CARRIER') continue;
          // The request around the event: the branch over the preceding 0.3 s.
          const back = ser.slice(Math.max(0, k - 3), k + 1).map(p => p.sig);
          const cat = back.every(x => x === back[0]) ? `within ${back[0]}` : `switch ${back.filter((x, i) => i === 0 || x !== back[i - 1]).join(' => ')}`;
          const ev = row.ev[kind] ??= {};
          ev[cat] = (ev[cat] ?? 0) + 1;
        }
        // Scribbles: 1 s windows (step 0.5 s) whose net displacement is under
        // 60% of the path travelled (at least 0.5 yd), by branch composition.
        for (let k = 0; k + 10 < ser.length; k += 5) {
          const w = ser.slice(k, k + 11);
          if (w.some(p => p.sig === 'CARRIER')) continue;
          let tr = 0;
          for (let m = 0; m + 1 < w.length; m++) tr += Math.hypot(w[m + 1].pos.x - w[m].pos.x, w[m + 1].pos.y - w[m].pos.y);
          const net = Math.hypot(w[10].pos.x - w[0].pos.x, w[10].pos.y - w[0].pos.y);
          if (tr < .5 || net / tr >= .6) continue;
          const sigs = w.map(p => p.sig), eng = sigs.filter(x => x === 'ENGAGED').length;
          const cat = eng === sigs.length ? 'all engaged' : eng ? `engaged ${eng}/11 + ${[...new Set(sigs.filter(x => x !== 'ENGAGED'))].join(' | ')}`
            : new Set(sigs).size === 1 ? `free, one branch: ${sigs[0]}` : `free, switching: ${[...new Set(sigs)].join(' | ')}`;
          if (examplesFor && key === examplesFor && examples.length < 12) examples.push(`${concept}/${dir}/${formation}/${look}/${roster}/${seed} ${a.slot} t=${(k * .1).toFixed(1)}+ ${cat.slice(0, 80)}`);
          const ev = row.ev['scribble window'] ??= {};
          ev[cat] = (ev[cat] ?? 0) + 1;
        }
      }
    }
const top = Number(arg('--top', '8'));
for (const [k, r] of [...rows].sort()) {
  console.log(`\n== ${k}: ${r.sec.toFixed(0)} s observed`);
  console.log('  time share: ' + Object.entries(r.occ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, x]) => `${(100 * x / r.sec).toFixed(0)}% ${c}`).join(' | '));
  for (const kind of KINDS) {
    const ev = r.ev[kind] ?? {}, n = Object.values(ev).reduce((a, b) => a + b, 0);
    const sw = Object.entries(ev).filter(([c]) => c.startsWith('switch')).reduce((a, [, x]) => a + x, 0);
    console.log(`  ${kind}: ${(n / r.sec).toFixed(2)}/s, ${(100 * sw / Math.max(1, n)).toFixed(0)}% at a branch switch`);
    for (const [c, x] of Object.entries(ev).sort((a, b) => b[1] - a[1]).slice(0, top)) console.log(`     ${(x / r.sec).toFixed(3)}/s  ${c}`);
  }
}
if (examples.length) console.log('\nexamples:\n' + examples.join('\n'));
