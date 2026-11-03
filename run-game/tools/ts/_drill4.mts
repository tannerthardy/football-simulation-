import { drill, show } from './_drill.mts';
const LOS = 40, CY = 26.65;
// Lateral race: both moving +y at 3 yd/s at contact; ball 10 yd playside (+y), 3 yd behind the line.
for (const [nm, read] of [['LB unsure', 'unsure'], ['LB reads run', 'run']] as const)
  show(drill({ name: `race +y 3 yd/s, ${nm}`, carrier: { x: LOS - 3, y: CY + 10, vy: 3 }, v0: { x: 0, y: 3 }, verbose: true,
    setup: (sim: any, c: any, lb: any) => { lb.recog.read = read; } } as any));
