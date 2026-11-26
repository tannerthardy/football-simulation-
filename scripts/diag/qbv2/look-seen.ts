/** QB_LOOK_SEEN staged cases (diag): his pre-snap read with the DB rule and the canonical looks from what he sees.
 * Prints, per play: the personnel and front his looks use, his top pre-snap coverage and its belief, how far the
 * cover-3 look's front seven sits from the bodies at the snap, and which bodies he counts as defensive backs.
 *   QB_LOOK_SEEN=0|1 node --import tsx scripts/diag/qbv2/look-seen.ts ordinary|stem|lbsafety */
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import { FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { isDbBody, isDbSlot, QB_LOOK_SEEN } from '../../../src/sim/qbv2/roles.js';
const mode = process.argv[2] ?? 'ordinary';
const r2 = (x: number) => Math.round(x * 100) / 100;
for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const seed of [1, 2, 3]) {
  const setup: any = nativeTraceSetup({ concept: 'slant_flat', coverage, seed, roster: 3, formation: 'gun_doubles_11', flip: false });
  if (mode === 'stem') setup.defCall = { ...setup.defCall, frontStem: { from: FRONT_BY_ID.under, secondsBeforeSnap: Number(process.env.STEM_S ?? 0.4) } };
  if (mode === 'lbsafety') { // a linebacker in the strong safety's slot (a roster short of safeties: pickDefense's fallback)
    const lb = Object.values(setup.defense).find((p: any) => p.position === 'LB' && !Object.entries(setup.defense).some(([k, q]) => q === p && k.startsWith('LB')));
    const spare = lb ?? { ...(setup.defense.LB_M), id: 'spare-lb' };
    setup.defense = { ...setup.defense, SS: spare };
  }
  const sim: any = new PlaySim(setup), m: any = sim.qbMind;
  if (!m) continue;
  const top = Object.entries(m.belief as Record<string, number>).sort((a, b) => b[1] - a[1])[0];
  const c3 = m.canon.get('cover3'), front = sim.defense.filter((d: any) => !['CB', 'S'].includes(d.player.position));
  // Label-free: each template front spot paired with the nearest unused true front body at the snap, closest pair first.
  const tpl = Object.entries(c3?.spots ?? {}).filter(([sl]) => !['CB_S', 'CB_W', 'NB', 'DB', 'FS', 'SS'].includes(sl)).map(([, sp]: any) => sp.pos);
  const used = new Set<number>(), done = new Set<number>(); let err = 0, n = 0;
  for (let k = 0; k < Math.min(tpl.length, front.length); k++) {
    let bi = -1, bj = -1, bd = Infinity;
    for (let i = 0; i < tpl.length; i++) if (!done.has(i)) for (let j = 0; j < front.length; j++) if (!used.has(j)) { const dd = Math.hypot(tpl[i].x - front[j].pos.x, tpl[i].y - front[j].pos.y); if (dd < bd) { bd = dd; bi = i; bj = j; } }
    done.add(bi); used.add(bj); err += bd; n++;
  }
  const dbs = sim.defense.filter((d: any) => (QB_LOOK_SEEN ? isDbBody(d) : isDbSlot(sim.defCall.personnel, d.slot))).map((d: any) => `${d.slot}:${d.player.position}`).join(' ');
  console.log(`${mode} ${coverage} s${seed} look ${m.lookSeen ? `${m.lookSeen.personnel}/${m.lookSeen.front}` : `${sim.defCall.personnel}/${sim.defCall.front.id} (call)`} top ${top[0]} ${r2(top[1])} actual ${sim.defCall.coverage.id} front7 err ${r2(err / (n || 1))} | DBs ${dbs}`);
}
