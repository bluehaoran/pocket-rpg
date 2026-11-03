// Svelte action: call `fn` on a press-and-hold (touch or mouse) or on right-click, the keyboard's menu key, or Enter / Space on a focused element.
// Browsers differ on whether a long press fires `contextmenu` (iOS Safari mostly does not), so a timer covers touch.
const HOLD_MS = 500;
const MOVE_PX = 10;

export function longpress(node: HTMLElement, fn: () => void) {
  let handler = fn;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let fired = false;
  let x = 0;
  let y = 0;
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    fired = false;
    x = e.clientX;
    y = e.clientY;
    cancel();
    timer = setTimeout(() => {
      timer = undefined;
      fired = true;
      handler();
    }, HOLD_MS);
  };
  const move = (e: PointerEvent) => {
    if (timer && Math.hypot(e.clientX - x, e.clientY - y) > MOVE_PX) cancel();
  };
  const menu = (e: Event) => {
    e.preventDefault();
    cancel();
    // A long press can fire both the timer and `contextmenu`; open once.
    if (fired) fired = false;
    else handler();
  };
  const key = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    handler();
  };
  node.addEventListener('keydown', key);
  node.addEventListener('pointerdown', down);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerup', cancel);
  node.addEventListener('pointercancel', cancel);
  node.addEventListener('pointerleave', cancel);
  node.addEventListener('contextmenu', menu);
  return {
    update(next: () => void) {
      handler = next;
    },
    destroy() {
      cancel();
      node.removeEventListener('keydown', key);
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', cancel);
      node.removeEventListener('pointercancel', cancel);
      node.removeEventListener('pointerleave', cancel);
      node.removeEventListener('contextmenu', menu);
    }
  };
}
