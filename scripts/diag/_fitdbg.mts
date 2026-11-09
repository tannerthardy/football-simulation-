import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, seed, call] = process.argv.slice(2);
const p = (JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]).find(x => !x.pass && x.call.startsWith(call));
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); sim.run();
