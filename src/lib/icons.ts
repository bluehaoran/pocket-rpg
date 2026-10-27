// The PocketRPG icon pack: 24x24 grid, stroke 2, round caps and joins, currentColor.
// Values are the inner SVG markup; Icon.svelte supplies the <svg> wrapper. `ID` is replaced with a
// per-instance id so mask ids stay unique when several copies share a page.
// Don't override stroke-width globally: `reroll` and `d6` use 1.4 on their double-pass parts.

export const ICONS = {
  reroll: `<g stroke-width="1.4"><path d="M3.07 15.25A9.5 9.5 0 1 0 3.07 8.75"/><path d="M3.7 15.8A9.2 9.2 0 1 0 3.4 8.2"/><path d="M2.18 11.19 5.33 9.57 0.81 7.93Z"/><path d="M2.5 11.8 5.8 9.9 1.3 7.4Z"/></g><path d="M7.6 7.4C10.4 7 13.6 7.1 16.3 7.3 16.9 7.4 17 8 16.9 8.6 16.8 11 16.9 13.6 16.8 16.1 16.7 16.7 16.2 16.9 15.6 16.9 13 17 10.4 16.8 8 16.9 7.4 16.9 7.1 16.5 7.1 15.9 7 13.2 7.2 10.6 7 8.2 7 7.7 7.2 7.4 7.6 7.4Z"/><g fill="currentColor" stroke="none"><circle cx="9.8" cy="9.6" r="1.15"/><circle cx="14.2" cy="9.8" r="1.05"/><circle cx="12.1" cy="12" r="1.1"/><circle cx="9.6" cy="14.3" r="1.05"/><circle cx="14.3" cy="14.2" r="1.15"/></g>`,
  'reroll-alt': `<defs><mask id="ID-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff" stroke="none"/><circle cx="18" cy="6" r="6.4" fill="#000" stroke="none"/></mask></defs><path d="M14.54 4A4 4 0 1 0 20 2.54"/><path d="M20.67 5.05 20 2.54 22.51 1.87"/><rect x="2" y="9" width="13" height="13" rx="3" mask="url(#ID-cut)"/><g fill="currentColor" stroke="none"><circle cx="11.5" cy="12.5" r="1.3"/><circle cx="8.5" cy="15.5" r="1.3"/><circle cx="5.5" cy="18.5" r="1.3"/></g>`,
  d6: `<g stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="4"/><rect x="3.6" y="2.5" width="17.6" height="18.8" rx="3.6"/></g><g fill="currentColor" stroke="none"><circle cx="8.1" cy="7.6" r="1.5"/><circle cx="15.9" cy="7.4" r="1.4"/><circle cx="7.9" cy="12.1" r="1.45"/><circle cx="16.1" cy="12" r="1.5"/><circle cx="8.1" cy="16.6" r="1.4"/><circle cx="15.9" cy="16.4" r="1.5"/></g>`,
  d20: `<g transform="rotate(-6 12 12)"><path d="M13.04 2.6 19.62 6.4Q20.66 7 20.66 8.2L20.66 15.8Q20.66 17 19.62 17.6L13.04 21.4Q12 22 10.96 21.4L4.38 17.6Q3.34 17 3.34 15.8L3.34 8.2Q3.34 7 4.38 6.4L10.96 2.6Q12 2 13.04 2.6Z"/><path d="M12 7.2 17.1 15.6 6.9 15.6Z"/><path d="M12 2.3 12 7.2M20.4 7.15 12 7.2 3.6 7.15M20.4 7.15 17.1 15.6 20.4 16.85M3.6 7.15 6.9 15.6 3.6 16.85M6.9 15.6 12 21.7 17.1 15.6"/></g>`,
  notes: `<defs><mask id="ID-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff" stroke="none"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L13 14l-4 1 1-4Z" fill="#000" stroke="#000" stroke-width="5"/></mask></defs><g mask="url(#ID-cut)"><rect x="3" y="5" width="14" height="16" rx="2.5"/><path d="M6.5 9.5h4M6.5 13.5h2M6.5 17.5h7"/></g><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L13 14l-4 1 1-4Z"/>`,
  'arrow-right': `<path d="M3.2 12.9Q12 11.3 21 12.1"/><path d="M14.4 7.4Q17 9.4 19.6 12.1M19.4 11.7Q17.2 14.6 15.6 17.6"/>`,
  'arrow-left': `<path d="M20.6 12.3Q12 11.2 4 12.1"/><path d="M8.4 6.4Q8.3 10.5 4 12.1 8.2 13.6 8.9 17.6"/>`,
  check: `<path d="M4 13Q7 14.6 9 18 12.6 9.8 20.6 5.6"/>`,
  plus: `<path d="M12.2 4.4Q11.7 12 12.1 19.8"/><path d="M4.3 12.3Q12 11.6 19.9 12.1"/>`,
  minus: `<path d="M4.3 12.4Q12 11.5 19.9 12.1"/>`,
  question: `<path d="M8.2 8.8C8.4 5.8 10.4 4.1 12.4 4.2 15 4.3 16.4 6 16.2 8.4 16 10.4 14.4 11.3 13.2 12.2 12.2 13 12 14 12.1 15.2"/><circle cx="12.2" cy="19.5" r="1.35" fill="currentColor" stroke="none"/>`
} as const;

export type IconName = keyof typeof ICONS;
