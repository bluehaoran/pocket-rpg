import { hideWelcome } from './prefs.ts';
import { replace } from './router.svelte.ts';
import { app } from './session.svelte.ts';

/**
 * On launch, land on the welcome screen unless the person turned it off, a story is in progress (so a
 * phone that killed the app reopens where they were), or they opened a specific screen (a link). `replace` keeps Back from returning to a blank page.
 */
export function maybeShowWelcome(): boolean {
  if (hideWelcome()) return false;
  if (app.session?.started) return false;
  if (!['', '#', '#/'].includes(location.hash)) return false;
  replace('/welcome');
  return true;
}
