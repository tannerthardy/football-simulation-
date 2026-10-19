/** The carrier's first second after a handoff (observation only, sim
 * internals). Per tick from the handoff to +1.0 s: his behavior's command
 * speed, the final intent speed after contact controllers and teammate
 * spacing, his achieved speed, and the nearest teammate within 1.5 yd ahead
 * of him (by slot kind) when the intent is cut below 70% of the command.
 * Also how often his command reverses its lateral direction (jitter). By concept.
 * node --import tsx scripts/diag/stretch/afterhand.ts [--formations ace_12,i_pro_21] [--concepts power,counter,duo,iz] [--seeds 77,71001] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const q = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? `${s[s.length >> 2].toFixed(2)}/${s[s.length >> 1].toFixed(2)}/${s[(3 * s.length) >> 2].toFixed(2)}` : '-'; };
type Row = { cmd: number[]; intent: number[]; vel: number[]; cut: number; ticks: number; who: Record<string, number>; flips: number[]; heading: number[] };
const rows = new Map<string, Row>();
const Rs = rosters();
for (const formation of list('--formations', 'ace_12,i_pro_21')) for (const concept of list('--concepts', 'power,counter,duo,iz'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,71001').map(Number)) {
      const sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs);
      const cmds = (sim as unknown as { cmds: { vel: { x: number; y: number } }[] }).cmds;
      const row = rows.get(concept) ?? { cmd: [], intent: [], vel: [], cut: 0, ticks: 0, who: {}, flips: [], heading: [] }; rows.set(concept, row);
      let h = -1, flips = 0, lastSign = 0, turn = 0, lastHd: number | null = null;
      while (sim.phase === 'live' && sim.t < 8) {
        sim.tick();
        const c = sim.carrier;
        if (!c || c.team !== 'O' || c === sim.qb) continue;
        if (h < 0) h = sim.t;
        if (sim.t - h > 1.0 + 1e-9) break;
        const cv = cmds[c.idx].vel, iv = sim.intents[c.idx].vel;
        const cs = Math.hypot(cv.x, cv.y), is = Math.hypot(iv.x, iv.y);
        row.cmd.push(cs); row.intent.push(is); row.vel.push(Math.hypot(c.vel.x, c.vel.y)); row.ticks++;
        const s = Math.abs(cv.y) > .8 ? Math.sign(cv.y) : 0;
        if (s && lastSign && s !== lastSign) flips++;
        if (s) lastSign = s;
        const hd = Math.atan2(cv.y, cv.x);
        if (lastHd !== null && cs > 1) turn += Math.abs(Math.atan2(Math.sin(hd - lastHd), Math.cos(hd - lastHd)));
        if (cs > 1) lastHd = hd;
        if (cs > 1 && is < .7 * cs) {
          row.cut++;
          const ahead = sim.offense.filter(o => o !== c && Math.hypot(o.pos.x - c.pos.x, o.pos.y - c.pos.y) < 1.5
            && (o.pos.x - c.pos.x) * cv.x + (o.pos.y - c.pos.y) * cv.y > 0)
            .sort((a, b) => Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) - Math.hypot(b.pos.x - c.pos.x, b.pos.y - c.pos.y))[0];
          const k = !ahead ? (c.engagement || sim.bond?.carrier === c ? 'contact' : 'no teammate ahead') : ahead === sim.qb ? 'QB' : ahead.slot === 'F' ? 'FB' : ['LT', 'LG', 'C', 'RG', 'RT'].includes(ahead.slot) ? 'OL' : ahead.slot;
          row.who[k] = (row.who[k] ?? 0) + 1;
        }
      }
      if (h >= 0) { row.flips.push(flips); row.heading.push(turn * 180 / Math.PI); }
    }
for (const [c, r] of rows) {
  console.log(`${c}: plays ${r.flips.length} | first second after the handoff: command ${q(r.cmd)} yd/s, intent ${q(r.intent)}, achieved ${q(r.vel)} | ticks with intent cut below 70% of command ${(100 * r.cut / r.ticks).toFixed(0)}%`);
  console.log(`   cut by: ${Object.entries(r.who).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${(100 * n / Math.max(1, r.cut)).toFixed(0)}%`).join(', ')}`);
  console.log(`   command lateral reversals per play ${q(r.flips)} | command heading turned (deg, 1 s) ${q(r.heading)}`);
}
