import { drill, show } from './_drill.mts';
const swap = (slot: string) => (sim: any, c: any, lb: any) => {
  // Put a different defender in the LB's place (and the LB out of the way).
  const d = sim.slot(slot); const p = { ...lb.pos }; lb.body.pos = { x: 95, y: 50 }; d.body.pos = { x: c.pos.x + c.profile.radius + d.profile.radius + .05, y: p.y }; d.body.facing = Math.PI;
  (sim as any).__def = d;
};
const LOS = 40, CY = 26.65;
for (const [name, slot] of [['vs LB_M', null], ['vs DT_S', 'DT_S'], ['vs CB_W', 'CB_W']] as const) {
  for (const [bname, car] of [['ball behind C', { x: LOS - 6, y: CY }], ['ball 12 yd wide', { x: LOS - 6, y: CY - 12 }]] as const) {
    show(drill({ name: `${name}, ${bname}`, carrier: car, setup: slot ? swap(slot) : undefined, defender: slot ?? undefined } as any));
  }
}
