// Per-device conveniences. localStorage can be missing or throw (private windows, blocked storage),
// so every access is guarded and the app behaves the same without it.
const HIDE_WELCOME = 'pocketrpg.hideWelcome';

export function hideWelcome(): boolean {
  try {
    return localStorage.getItem(HIDE_WELCOME) === '1';
  } catch {
    return false;
  }
}

export function setHideWelcome(hide: boolean): void {
  try {
    if (hide) localStorage.setItem(HIDE_WELCOME, '1');
    else localStorage.removeItem(HIDE_WELCOME);
  } catch {
    // Not saved; the welcome screen simply shows again next time.
  }
}
