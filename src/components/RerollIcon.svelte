<script lang="ts">
  // Two circling arrows around a tilted, outlined d6 showing three. Colour comes from the text.
  let { size = '1.2em' }: { size?: string } = $props();
</script>

<svg class="reroll-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
  <g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <g transform="translate(24 0) scale(-1 1)">
      <g>
        <path d="M2.2 10.3A10 10 0 0 1 19.5 5.7" />
        <path d="M17.3 6.3L20.5 6.9L20.5 3.7" />
      </g>
      <g transform="rotate(180 12 12)">
        <path d="M2.2 10.3A10 10 0 0 1 19.5 5.7" />
        <path d="M17.3 6.3L20.5 6.9L20.5 3.7" />
      </g>
    </g>
    <rect x="6.5" y="6.5" width="11" height="11" rx="2.4" stroke-width="1.8" transform="translate(12 12) rotate(-10) scale(.9) translate(-12 -12)" />
  </g>
  <g fill="currentColor" transform="translate(12 12) rotate(-10) scale(.9) translate(-12 -12)">
    {#each [[9.6, 9.2], [12, 12], [14.4, 14.8]] as [x, y] (x)}
      <circle cx={x} cy={y} r="1.05" />
    {/each}
  </g>
</svg>
