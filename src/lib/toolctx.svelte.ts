// Bridges the session to the pure tools module.
import { packs, registry } from './content/index.ts';
import { effective } from './edits.svelte.ts';
import type { Pack } from './content/types.ts';
import type { ToolCtx } from './tools.ts';
import { mathRng, type Rng } from './engine/rng.ts';
import { app } from './session.svelte.ts';

export const sessionPack = (): Pack | undefined => packs[app.session?.packIds[0] ?? ''];

/**
 * The pack the Tools tab follows: the session's, but only once play has started. Before that the default
 * session's genre is a placeholder, so Tools works as a plain toolbox (no pack generators, no genre defaults).
 */
export const toolPack = (): Pack | undefined => (app.session?.started ? sessionPack() : undefined);

/** Context for rolling tools. `recent` is the session's live no-repeat memory, so call inside `mutate`. */
export function toolCtx(rng: Rng = mathRng): ToolCtx {
  return { rng, recent: app.session?.recent ?? {}, registry, lists: effective(), pack: toolPack() };
}
