<script lang="ts">
  import { ICONS, type IconName } from '../lib/icons.ts';

  // Colour comes from the surrounding text; size is a CSS length (default scales with the font).
  // `stroke` is for the single-stroke icons (check, arrows); the pack's dice and masked icons are
  // drawn for 2.
  let { name, size = '1.2em', stroke = 2 }: { name: IconName; size?: string; stroke?: number } = $props();
  const uid = $props.id();
  const body = $derived(ICONS[name].replaceAll('ID-', `i${uid}-`));
</script>

<svg class="icon" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
  stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{@html body}</svg>
