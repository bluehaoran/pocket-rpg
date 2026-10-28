<script lang="ts">
  // The PocketRPG mark (public/pocketrpg-mark.svg), inlined so the die and pocket take the theme's
  // colours: --ink for the die, --accent for the pocket. Decorative; the wordmark carries the name.
  let { size = '1.4em' }: { size?: string } = $props();
  const uid = $props.id();
</script>

<svg class="mark" viewBox="0 0 48 48" width={size} height={size} fill="none" stroke-width="3.2"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <defs>
    <mask id="{uid}-pocket" maskUnits="userSpaceOnUse" x="-8" y="-8" width="64" height="64">
      <rect x="-8" y="-8" width="64" height="64" fill="#fff" />
      <path d="M9 20H39V34L24 42 9 34Z" fill="#000" stroke="#000" stroke-width="5" />
    </mask>
  </defs>
  <g mask="url(#{uid}-pocket)">
    <g transform="translate(0 -2) rotate(10 24 16)">
      <rect x="15" y="7" width="18" height="18" rx="4" stroke="var(--ink)" />
      <g fill="var(--ink)">
        <circle cx="19.5" cy="11.5" r="1.9" /><circle cx="28.5" cy="11.5" r="1.9" /><circle cx="24" cy="16" r="1.9" /><circle cx="19.5" cy="20.5" r="1.9" /><circle cx="28.5" cy="20.5" r="1.9" />
      </g>
    </g>
  </g>
  <g stroke="var(--accent)">
    <path d="M9 20H39V34L24 42 9 34Z" />
    <path d="M12.6 23.6H35.4V32L24 38 12.6 32Z" stroke-width="1.6" stroke-dasharray="2.2 2.6" />
  </g>
</svg>
