// Two taps for a destructive button: the first arms it for a few seconds, the second runs the action.
import { onDestroy } from 'svelte';

/** Call during component init: it registers its own cleanup. */
export function createConfirm(ms = 4000) {
  let armed = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function reset() {
    clearTimeout(timer);
    armed = false;
  }
  onDestroy(() => clearTimeout(timer));

  return {
    get armed() {
      return armed;
    },
    /** Arms on the first tap; on the second, disarms and runs `action`. */
    trigger<T>(action: () => T): T | undefined {
      if (!armed) {
        armed = true;
        timer = setTimeout(() => (armed = false), ms);
        return;
      }
      reset();
      return action();
    },
    reset
  };
}
