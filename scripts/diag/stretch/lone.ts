/** A lone body with a constant request: does the achieved speed oscillate on its own?
 * The slot's behavior is replaced by a fixed velocity (and optional facing, radians).
 * node --import tsx scripts/diag/stretch/lone.ts CASE_ID SLOT VX VY [FACING] */
export {};
async function main() {
  const { makeSim, rosters } = await import(process.cwd() + '/scripts/diag/zone-lab/lab.ts');
  const [id, slot, vx, vy, faceArg] = process.argv.slice(2);
  const [concept, dir, formation, look, roster, seed] = id.split('/');
  const sim = makeSim({ concept, dir, look, roster, seed: Number(seed), formation }, rosters()) as any;
  const a = sim.agents.find((x: any) => x.slot === slot);
  const face = faceArg === undefined ? undefined : Number(faceArg);
  a.behavior = { kind: 'probe', update: () => ({ vel: { x: Number(vx), y: Number(vy) }, facing: face }) };
  const out: string[] = [];
  while (sim.phase === 'live' && sim.t < 3) {
    sim.tick();
    const sup = a.body.support;
    out.push(`${sim.t.toFixed(2)} spd ${Math.hypot(a.vel.x, a.vel.y).toFixed(2)} hd ${(Math.atan2(a.vel.y, a.vel.x) * 180 / Math.PI).toFixed(0)} face ${(a.body.facing * 180 / Math.PI).toFixed(0)} st ${sup?.state} xi ${Math.hypot(sup?.xi?.x ?? 0, sup?.xi?.y ?? 0).toFixed(2)} foot ${sup?.foot ? 1 : 0} near ${Math.min(...sim.agents.filter((o: any) => o !== a).map((o: any) => Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y))).toFixed(1)}`);
  }
  console.log(out.filter((_, i) => i % 2 === 1).join('\n'));
}
main();
