/** Engine worker: one per engine-switch set, so each runs with its own process.env. */
import { parentPort } from 'node:worker_threads';
import * as engine from './engine.js';

type Request = { id: number; op: string; args: Record<string, unknown> };

parentPort!.on('message', ({ id, op, args }: Request) => {
  try {
    let value: unknown;
    if (op === 'catalog') value = engine.catalog();
    else if (op === 'rosters') value = engine.rosters(args.rosterSeed as number, args.strength as number);
    else if (op === 'build') value = engine.scenarioFromRecipe(args.recipe as engine.Recipe, args.base as Partial<engine.Scenario>);
    else if (op === 'preview') value = engine.preview(args.scenario as engine.Scenario);
    else if (op === 'run') value = { ...engine.run(args.scenario as engine.Scenario, { seed: args.seed as number | undefined }), identity: engine.identity() };
    else if (op === 'batch') value = engine.runSummary(args.scenario as engine.Scenario, args.seed as number);
    else if (op === 'trace') value = engine.trace(args.scenario as engine.Scenario, args.actor as { team: 'O' | 'D'; slot: string },
      args.from as number, args.to as number, args.seed as number | undefined);
    else if (op === 'identity') value = engine.identity();
    else throw new Error(`Unknown engine operation ${op}`);
    parentPort!.postMessage({ id, value });
  } catch (error) {
    parentPort!.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
});
