/** How often do players spin? (observation only). Lab cases: per player, the
 * body's unwrapped yaw; a spin is any 1.0 s window whose net turn is at least
 * 270 degrees. Also requested-facing flips (an explicit command facing that
 * jumps by 150 degrees or more in one tick) and the branch-free culprit
 * count: flips while free (not engaged) vs engaged. By group, per 100 plays.
 * node --import tsx scripts/diag/stretch/spins.ts [--concepts ..] [--formations ..] [--seeds 77,1] [--group OL] [--examples CLASS] */
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const GROUP: Record<string, string> = { QB: 'QB', RB: 'RB', F: 'FB', Y: 'TE', H: 'TE', X: 'WR', Z: 'WR', LT: 'OL', LG: 'OL', C: 'OL', RG: 'OL', RT: 'OL' };
const groupOf = (team: string, slot: string) => team === 'O' ? GROUP[slot] ?? 'O?' : /^(DE|DT|NT)/.test(slot) ? 'DL' : /^LB/.test(slot) ? 'LB' : 'DB';
const wrap = (r: number) => Math.atan2(Math.sin(r), Math.cos(r));
const spins: Record<string, number> = {}, flipsFree: Record<string, number> = {}, flipsEng: Record<string, number> = {};
let plays = 0;
const examplesOf = arg('--examples', ''), groupFor = arg('--group', '');
const cause: Record<string, Record<string, number>> = {};
const examples: string[] = [];
const Rs = rosters();
for (const formation of list('--formations', 'ace_12,i_pro_21')) for (const concept of list('--concepts', 'iz,oz,wz,power,counter,duo'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,1').map(Number)) {
      let sim;
      try { sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs); } catch { continue; }
      plays++;
      const yaw = sim.agents.map(a => [a.body.facing]);
      const want = sim.agents.map(a => [a.body.facing]);
      const eng = sim.agents.map(() => [] as boolean[]);
      const lastFace = sim.agents.map(() => undefined as number | undefined);
      while (sim.phase === 'live' && sim.t < 4) {
        sim.tick();
        for (const a of sim.agents) {
          const y = yaw[a.idx]; y.push(y[y.length - 1] + wrap(a.body.facing - y[y.length - 1]));
          const f = (sim as any).cmds[a.idx]?.facing as number | undefined, g = groupOf(a.team, a.slot);
          // What he asked for: the command facing, else the intent's travel direction.
          const it = (sim as any).intents[a.idx], iv = it?.vel ?? { x: 0, y: 0 };
          const asked = it?.facing ?? (Math.hypot(iv.x, iv.y) > .4 ? Math.atan2(iv.y, iv.x) : a.body.facing);
          const ww = want[a.idx]; ww.push(ww[ww.length - 1] + wrap(asked - ww[ww.length - 1]));
          eng[a.idx].push(!!a.engagement);
          if (f !== undefined && lastFace[a.idx] !== undefined && Math.abs(wrap(f - lastFace[a.idx]!)) >= 150 * Math.PI / 180) {
            const m = a.engagement ? flipsEng : flipsFree; m[g] = (m[g] ?? 0) + 1;
          }
          lastFace[a.idx] = f;
        }
      }
      const w = Math.round(1 / sim.dt);
      for (const a of sim.agents) {
        const y = yaw[a.idx];
        for (let k = w; k < y.length; k++) if (Math.abs(y[k] - y[k - w]) >= 270 * Math.PI / 180) {
          const g = groupOf(a.team, a.slot); spins[g] = (spins[g] ?? 0) + 1;
          const asked = Math.abs(want[a.idx][k] - want[a.idx][k - w]) * 180 / Math.PI;
          const engaged = eng[a.idx].slice(k - w, k).some(Boolean);
          const cls = `${asked >= 200 ? 'asked to turn' : 'not asked (<200)'}${engaged ? ', engaged' : ', free'}`;
          (cause[g] ??= {})[cls] = ((cause[g] ??= {})[cls] ?? 0) + 1;
          if (examples.length < 8 && (!examplesOf || cls === examplesOf) && (!groupFor || g === groupFor)) examples.push(`${concept}/${dir}/${formation}/${look}/${roster}/${seed} ${a.slot} t=${(k * sim.dt).toFixed(2)} (${cls})`);
          break;
        }
      }
    }
console.log(`plays ${plays}; per 100 plays: players with a spin (>=270 deg in 1 s) | requested-facing flips (>=150 deg in a tick) free / engaged`);
for (const g of ['OL', 'TE', 'FB', 'RB', 'QB', 'WR', 'DL', 'LB', 'DB'])
  console.log(`  ${g.padEnd(3)} spins ${(100 * (spins[g] ?? 0) / plays).toFixed(1).padStart(5)} | flips free ${(100 * (flipsFree[g] ?? 0) / plays).toFixed(1).padStart(6)} engaged ${(100 * (flipsEng[g] ?? 0) / plays).toFixed(1).padStart(6)}`);
for (const g of Object.keys(cause)) console.log(`  ${g} spin causes: ` + Object.entries(cause[g]).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join('; '));
console.log('examples:\n  ' + examples.join('\n  '));
