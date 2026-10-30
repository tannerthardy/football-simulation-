process.env.FRONT_ALIGN = '1';
const { CENTER_Y } = await import('/home/user/fs-develop/src/core/field.js');
const { alignDefense, alignOffense } = await import('/home/user/fs-develop/src/playbook/alignment.js');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('/home/user/fs-develop/src/playbook/defense.js');
const { FORMATION_BY_ID } = await import('/home/user/fs-develop/src/playbook/formations.js');
const { DEF_PERSONNEL } = await import('/home/user/fs-develop/src/playbook/types.js');
const off = alignOffense(FORMATION_BY_ID.i_pro_21, false, 40, CENTER_Y);
const E = (off.spots.Y.pos.y - CENTER_Y) * off.strongSign;
for (const [front, pers] of [['over','base43'],['over','nickel'],['under','base43'],['under','nickel'],['wide9','nickel'],['tite','base34'],['odd','base34']] as const)
  for (const edge of ['tight','base','wide'] as const) {
    const row: string[] = [];
    for (const m of [112, 118, 124, 132, 138]) {
      const present = Object.keys(DEF_PERSONNEL[pers]) as any[];
      const d = alignDefense({ personnel: pers, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '', edge }, off, present, {}, { mass: Object.fromEntries(present.map((s: string) => [s, m])) });
      const ends = present.filter((s: string) => FRONT_BY_ID[front].slots[s]?.side === 'S' && FRONT_BY_ID[front].slots[s]!.depth < 2).map((s: string) => (d.spots[s]!.pos.y - CENTER_Y) * off.strongSign);
      const dy = Math.max(...ends) - E;
      row.push(`${m}kg ${dy.toFixed(2)}${Math.abs(dy) < .3 ? '(6)' : dy < 0 ? '(in)' : dy > 1.5 ? '(w9)' : '(9)'}`);
    }
    console.log(`${front.padEnd(5)} ${pers.padEnd(6)} ${edge.padEnd(5)} | ${row.join('  ')}`);
  }
