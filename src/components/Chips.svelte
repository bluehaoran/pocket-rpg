<script lang="ts">
  import Tog from './Tog.svelte';

  interface Chip {
    id: string;
    label: string;
    pressed?: boolean;
  }
  let { items, onpick, label }: { items: Chip[]; onpick?: (id: string) => void; label: string } = $props();
</script>

<ul class="chips" aria-label={label}>
  {#each items as c (c.id)}
    <li>
      {#if onpick}
        <Tog pressed={c.pressed ?? false} onclick={() => onpick(c.id)}>{c.label}</Tog>
      {:else}
        <span class="tog static">{c.label}</span>
      {/if}
    </li>
  {/each}
</ul>
