import { hideWelcome } from './prefs.ts';
import { replace } from './router.svelte.ts';

/**
 * On launch, land on the welcome screen unless the person turned it off or opened a specific screen
 * (a link, or a reload part-way through the app). `replace` keeps Back from returning to a blank page.
 */
export function maybeShowWelcome(): boolean {
  if (hideWelcome()) return false;
  if (!['', '#', '#/'].includes(location.hash)) return false;
  replace('/welcome');
  return true;
}
