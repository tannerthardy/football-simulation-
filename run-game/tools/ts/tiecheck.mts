/** Scan run-only matched-restage captures for first-carrier-contact ties (the ledger census), on code defaults with the
 * single recorded stream, as responsibility-ledger.test.ts plays them. args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { initialJobCensus } = await import(root + '/src/sim/responsibility-views.ts');
PlaySim.recordedSingleStream = true;
for (const arg of process.argv.slice(2)) { const [seed, idx] = arg.split(":"); const i = +idx; const p = (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, "utf8")) as any[])[i];
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const ledger = sim.recordResponsibility(); sim.run();
  const census = initialJobCensus(ledger.data); const first = census[0]?.firstCarrierContact;
  console.log(`R${seed}-P${String(i).padStart(3, '0')} ${sim.offCall.run?.scheme ?? ''} ${sim.offCall.label ?? ''} t=${first?.t ?? "no contact"} ${first?.defenders.map((d: number) => ledger.data.actors[d].slot).join("+") ?? ""}`);
}
