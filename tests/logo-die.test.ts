// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import Logo from '../src/components/Logo.svelte';
import Die from '../src/components/Die.svelte';

afterEach(cleanup);

describe('Logo', () => {
  it('sizes the wordmark from the size prop, defaulting to 24px', () => {
    const { container, unmount } = render(Logo);
    expect(container.querySelector('.logo')!.getAttribute('style')).toContain('--logo-size: 24px');
    unmount();
    const big = render(Logo, { size: '40px' });
    expect(big.container.querySelector('.logo')!.getAttribute('style')).toContain('--logo-size: 40px');
  });
});

describe('Die', () => {
  it('draws pips for 1-6 and labels the face', () => {
    const { container } = render(Die, { value: 5 });
    const die = container.querySelector('.die')!;
    expect(die.getAttribute('aria-label')).toBe('d6 showing 5');
    expect(die.querySelectorAll('i')).toHaveLength(9);
    expect(die.querySelectorAll('i.on')).toHaveLength(5);
  });

  it('shows an empty face labelled with the number for values with no pips (a d6 face never has 7)', () => {
    const { container } = render(Die, { value: 7, size: 'lg', state: 'ok' });
    const die = container.querySelector('.die')!;
    expect(die.getAttribute('aria-label')).toBe('7');
    expect(die.querySelectorAll('i')).toHaveLength(0);
    expect(die.classList.contains('lg')).toBe(true);
    expect(die.classList.contains('ok')).toBe(true);
  });
});
