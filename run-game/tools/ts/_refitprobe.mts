// Smallest re-fit probe: one blocker with hands on one defender asks his feet to step sideways (re-fit) while
// staying connected. How far does he get around the man, and how far is the man dragged? Three grips.
const W = process.argv[2];
const { World } = await import(`${W}/src/physics/world.ts`);
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const prof = (mass: number) => ({ massKg: mass, radius: 0.24 + (mass * 2.20462 - 180) / 1100, reach: 1, heightYd: 2.05, vmax: 7, tau: 1.3,
  brake: 6, lateral: 5, turnRate: 8, backpedal: 0.6, shuffle: 0.55, maxCatchHeight: 3, reactReach: 2.6,
  reactionTime: 0.25, power: mass, balance: 0.5, bend: 0.5, stepSpeed: 3.4, getUp: 0.9 });
const run = (mode: 'grip' | 'slide' | 'none', lat = 2) => {
  const pb = prof(140), pd = prof(130);
  const sep = pb.radius + pd.radius;
  const b: any = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: pb };
  const d: any = { pos: { x: sep, y: 0 }, vel: { x: 0, y: 0 }, facing: Math.PI, energy: 1, profile: pd };
  const w = new World([b, d]);
  const sp = supportParams(pb);
  if (mode !== 'none') w.joints.push({ kind: 'hands', a: b, b: d, actor: b, extension: sep + 0.1,
    push: sp.pressForce * 0.7, hold: 0, steer: mode === 'grip' ? sp.armForce * 0.43 : 0 });
  for (let k = 0; k < 20; k++) {
    const nx = d.pos.x - b.pos.x, ny = d.pos.y - b.pos.y, l = Math.hypot(nx, ny);
    // Blocker: stay connected (close any gap) and step to his left around the man.
    const ux = nx / l, uy = ny / l, tx = -uy, ty = ux;
    const close = Math.max(0, l - sep) * 3 + 0.3;
    w.step([{ vel: { x: ux * close + tx * lat, y: uy * close + ty * lat }, push: 1 },
      { vel: { x: -ux * 0.4, y: -uy * 0.4 }, push: 1 }], 0.05);
  }
  const ang = Math.atan2(b.pos.y - d.pos.y, -(b.pos.x - d.pos.x)) * 180 / Math.PI;
  return { mode, blockerMovedY: +b.pos.y.toFixed(3), defenderDraggedY: +d.pos.y.toFixed(3),
    angleAroundMan: +ang.toFixed(1), distance: +Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y).toFixed(3) };
};
for (const m of ['grip', 'slide', 'none'] as const) console.log(JSON.stringify(run(m)));
