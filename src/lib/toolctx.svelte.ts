// Bridges the session to the pure tools module.
import { lists, packs, registry } from './content/index.ts';
import type { Pack } from './content/types.ts';
import type { ToolCtx } from './tools.ts';
import { mathRng, type Rng } from './engine/rng.ts';
import { app } from './session.svelte.ts';

export const sessionPack = (): Pack | undefined => packs[app.session?.packIds[0] ?? ''];

/** Context for rolling tools. `recent` is the session's live no-repeat memory, so call inside `mutate`. */
export function toolCtx(rng: Rng = mathRng): ToolCtx {
  return { rng, recent: app.session?.recent ?? {}, registry, lists, pack: sessionPack() };
}
