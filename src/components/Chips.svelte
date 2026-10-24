<script lang="ts">
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
        <button type="button" class="tog" aria-pressed={c.pressed ?? false} onclick={() => onpick(c.id)}>{c.label}</button>
      {:else}
        <span class="tog static">{c.label}</span>
      {/if}
    </li>
  {/each}
</ul>
