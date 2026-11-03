import { drill, show } from './_drill.mts';
// C walls the LB off from a ball 12 yd to his left (-y). LB legacy work goes toward e.side.
const LOS = 40, CY = 26.65;
for (const wp of [0, .6, 1.2, 2.0]) {
  (globalThis as any).__wallPush = wp;
  for (const [nm, wall] of [['no wall', false], ['wall', true]] as const) {
    if (!wall && wp) continue;
    show(drill({ name: `${nm}${wall ? ' push ' + wp : ''}`, carrier: { x: LOS - 4, y: CY - 12 }, drive: wall ? { x: .86, y: .51 } : { x: 1, y: 0 },
      setup: (sim: any, c: any, lb: any) => { lb.recog.read = 'run'; }, after: wall } as any));
  }
}
