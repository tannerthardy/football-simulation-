// CALL_MIX fit input: each pool concept's route-class profile and every route id's class, from src/game/call-mix.ts.
//   node --import tsx scripts/diag/call-mix/profiles.ts > out/call-mix/profiles.json
import { conceptProfile, routeClass } from '../../../src/game/call-mix.js';
import { PASS_CONCEPTS } from '../../../src/playbook/concepts.js';
import { ROUTES } from '../../../src/playbook/routes.js';
console.log(JSON.stringify({
  profiles: Object.fromEntries(PASS_CONCEPTS.map((c) => [c.id, conceptProfile(c)])),
  routes: Object.fromEntries(Object.keys(ROUTES).map((id) => [id, routeClass(id)])),
}, null, 1));
