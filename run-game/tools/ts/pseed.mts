const root = process.cwd();
const { captureNativePursuit } = await import(root + '/scripts/diag/pursuit-arrival.ts');
for (const s of process.argv.slice(2).map(Number)) {
  const t = Date.now();
  try { const c = captureNativePursuit(s); console.log(`seed ${s}: ok ${c.pick.actorSlot}->${c.pick.targetSlot} clocks ${c.pick.clocks} (${((Date.now() - t) / 1000).toFixed(0)} s)`); }
  catch (e: any) { console.log(`seed ${s}: ${e.message} (${((Date.now() - t) / 1000).toFixed(0)} s)`); }
}
