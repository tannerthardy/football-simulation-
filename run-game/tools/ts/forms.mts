const { CENTER_Y } = await import('/home/user/fs-develop/src/core/field.js');
const { alignOffense } = await import('/home/user/fs-develop/src/playbook/alignment.js');
const { FORMATIONS } = await import('/home/user/fs-develop/src/playbook/formations.js');
for (const f of FORMATIONS) {
  const off = alignOffense(f, false, 40, CENTER_Y), s = off.strongSign;
  const backs = Object.values(off.spots).filter(sp => sp.backfield && sp.slot !== 'QB').map(sp => `${sp.slot}${((sp.pos.y - CENTER_Y) * s).toFixed(1)}`);
  const wings = Object.values(off.spots).filter(sp => !sp.inline && !sp.backfield && !['LT','LG','C','RG','RT','QB'].includes(sp.slot) && Math.abs(sp.pos.y - CENTER_Y) < 6.5 && 40 - sp.pos.x < 2.5).map(sp => `${sp.slot}${((sp.pos.y - CENTER_Y) * s).toFixed(1)}`);
  console.log(f.id.padEnd(16), 'TE', JSON.stringify(off.hasTE), 'backs', backs.join(' '), '| wings', wings.join(' '));
}
